/**
 * Service de licences Omori — fonction Netlify (Node 18+).
 *
 * Registre : Netlify Blobs (store « licences », clé « registre »), un enregistrement par clé :
 *   { id, client, debut, fin, codeMachine, revoquee, note, creeLe, derniereVerification, derniereVersion, cle }
 *
 * Variables d'environnement Netlify (Site configuration → Environment variables) :
 *   LICENCE_CLE_PRIVEE   clé privée Ed25519 (PEM, produite par omori/desktop/scripts/generer-cles.mjs)
 *   LICENCE_ADMIN_TOKEN  jeton exigé (en-tête X-Admin-Token) pour les opérations d'administration (Omori Backoffice)
 *
 * L'adresse publique est sur Vercel (vercel.json réécrit /api/licences-<secret>/* vers ce site Netlify).
 * Routes (préfixe = chemin secret, voir `config.path` en bas du fichier) :
 *   POST   <préfixe>/verifier                  { id, codeMachine, version, horodatage } → { reponse, signature }  (appelé par l'application)
 *   GET    <préfixe>/cles                      liste (admin)
 *   POST   <préfixe>/cles                      { client, debut?, dureeMois?, note? } → nouvelle clé signée (admin)
 *   POST   <préfixe>/cles/{id}/revoquer        coupe l'accès (admin)
 *   POST   <préfixe>/cles/{id}/retablir        rétablit l'accès (admin)
 *   POST   <préfixe>/cles/{id}/liberer         détache l'ordinateur : la clé pourra être activée ailleurs (admin)
 *   PUT    <préfixe>/cles/{id}                 { client?, fin?, note? } (admin ; une nouvelle clé est re-signée si fin change)
 *   DELETE <préfixe>/cles/{id}                 supprime (admin)
 */
import crypto from 'node:crypto';

const PREFIXE_CLE = 'OMORI-';

const json = (statut, corps) => new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' } });
const erreur = (statut, message) => json(statut, { statut, message });

// ------------------------------------------------------------------ registre (Netlify Blobs)
import { getStore } from '@netlify/blobs';

const env = (k) => (typeof Netlify !== 'undefined' && Netlify.env ? Netlify.env.get(k) : process.env[k]);

async function lireRegistre() {
  const texte = await getStore('licences').get('registre', { type: 'text' }).catch(() => null);
  if (!texte) return { cles: [] };
  try {
    const contenu = JSON.parse(texte);
    return { cles: Array.isArray(contenu.cles) ? contenu.cles : [] };
  } catch {
    return { cles: [] };
  }
}

async function ecrireRegistre(registre) {
  await getStore('licences').set('registre', JSON.stringify({ misAJour: new Date().toISOString(), cles: registre.cles }));
}

/** Lit, modifie, écrit. */
async function modifierRegistre(fn, _message) {
  const registre = await lireRegistre();
  const resultat = fn(registre.cles);
  await ecrireRegistre(registre);
  return resultat;
}

// ------------------------------------------------------------------ signature
const clePrivee = () => crypto.createPrivateKey(env('LICENCE_CLE_PRIVEE').replace(/\\n/g, '\n'));
const signer = (octets) => crypto.sign(null, octets, clePrivee()).toString('base64url');

function fabriquerCle(enr) {
  const charge = Buffer.from(JSON.stringify({ id: enr.id, client: enr.client, debut: enr.debut, fin: enr.fin, v: 1 }), 'utf8').toString('base64url');
  return PREFIXE_CLE + charge + '.' + signer(Buffer.from(charge, 'base64url'));
}

function reponseSignee(contenu) {
  const reponse = Buffer.from(JSON.stringify(contenu), 'utf8').toString('base64url');
  return { reponse, signature: signer(Buffer.from(reponse, 'base64url')) };
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plusMois = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); const j = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(j, dernier)); return d.toISOString().slice(0, 10); };
const nouvelId = (cles) => { const annee = new Date().getFullYear(); const n = cles.filter((c) => c.id.startsWith(`LIC-${annee}-`)).length + 1; return `LIC-${annee}-${String(n).padStart(4, '0')}`; };
const publique = ({ cle, ...reste }) => reste; // la clé complète n'est renvoyée qu'à la création et sur demande explicite

// ------------------------------------------------------------------ routeur
export default async function handler(requete) {
  if (requete.method === 'OPTIONS') return json(204, {});
  if (!env('LICENCE_CLE_PRIVEE')) return erreur(500, 'Service de licences non configuré (variable LICENCE_CLE_PRIVEE manquante).');
  const url = new URL(requete.url);
  // Chemin relatif après le nom de la fonction ou la redirection
  const segments = url.pathname.replace(/^\/\.netlify\/functions\/licences/, '').replace(/^\/api\/licences-[^/]+/, '').split('/').filter(Boolean);
  const action = segments[0];

  try {
    if (requete.method === 'POST' && action === 'verifier') return await verifier(await requete.json());

    // --- administration
    const jeton = requete.headers.get('x-admin-token');
    if (!env('LICENCE_ADMIN_TOKEN') || jeton !== env('LICENCE_ADMIN_TOKEN')) return erreur(401, 'Accès administrateur refusé.');
    if (action !== 'cles') return erreur(404, 'Route inconnue.');
    const id = segments[1];
    const sousAction = segments[2];

    if (requete.method === 'GET' && !id) {
      const { cles } = await lireRegistre();
      const avecCle = url.searchParams.get('avecCle') === '1';
      return json(200, cles.map((c) => (avecCle ? c : publique(c))).sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1)));
    }
    if (requete.method === 'POST' && !id) {
      const corps = await requete.json();
      if (!corps.client || !String(corps.client).trim()) return erreur(400, 'Le nom du client est obligatoire.');
      const debut = /^\d{4}-\d{2}-\d{2}$/.test(corps.debut || '') ? corps.debut : aujourdhui();
      const fin = /^\d{4}-\d{2}-\d{2}$/.test(corps.fin || '') ? corps.fin : plusMois(debut, Number(corps.dureeMois) > 0 ? Number(corps.dureeMois) : 12);
      const enr = await modifierRegistre((cles) => {
        const e = { id: nouvelId(cles), client: String(corps.client).trim(), debut, fin, codeMachine: null, revoquee: false, note: corps.note ? String(corps.note).trim() : null, creeLe: new Date().toISOString(), derniereVerification: null, derniereVersion: null, cle: null };
        e.cle = fabriquerCle(e);
        cles.push(e);
        return e;
      }, `Nouvelle clé ${corps.client}`);
      return json(201, enr);
    }
    if (!id) return erreur(404, 'Route inconnue.');

    if (requete.method === 'DELETE' && !sousAction) {
      const ok = await modifierRegistre((cles) => { const i = cles.findIndex((c) => c.id === id); if (i < 0) return false; cles.splice(i, 1); return true; }, `Suppression ${id}`);
      return ok ? json(204, {}) : erreur(404, `Clé ${id} introuvable.`);
    }
    if (requete.method === 'PUT' && !sousAction) {
      const corps = await requete.json();
      const enr = await modifierRegistre((cles) => {
        const c = cles.find((x) => x.id === id);
        if (!c) return null;
        if (corps.client) c.client = String(corps.client).trim();
        if (corps.note !== undefined) c.note = corps.note ? String(corps.note).trim() : null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(corps.fin || '')) c.fin = corps.fin;
        c.cle = fabriquerCle(c);
        return c;
      }, `Modification ${id}`);
      return enr ? json(200, enr) : erreur(404, `Clé ${id} introuvable.`);
    }
    if (requete.method === 'POST' && ['revoquer', 'retablir', 'liberer'].includes(sousAction)) {
      const enr = await modifierRegistre((cles) => {
        const c = cles.find((x) => x.id === id);
        if (!c) return null;
        if (sousAction === 'revoquer') c.revoquee = true;
        if (sousAction === 'retablir') c.revoquee = false;
        if (sousAction === 'liberer') { c.codeMachine = null; c.libereeLe = new Date().toISOString(); }
        return c;
      }, `${sousAction} ${id}`);
      return enr ? json(200, publique(enr)) : erreur(404, `Clé ${id} introuvable.`);
    }
    return erreur(404, 'Route inconnue.');
  } catch (e) {
    console.error(e);
    return erreur(500, 'Erreur du service de licences : ' + e.message);
  }
}

/** Vérification appelée par l'application : lie la machine à la première vérification, refuse les autres machines. */
async function verifier(corps) {
  const { id, codeMachine, version, horodatage } = corps || {};
  if (!id || !codeMachine || !horodatage) return erreur(400, 'Requête incomplète.');
  let etat = 'INCONNUE';
  let fin = null;
  await modifierRegistre((cles) => {
    const c = cles.find((x) => x.id === id);
    if (!c) return;
    fin = c.fin;
    if (c.revoquee) etat = 'REVOQUEE';
    else if (c.fin < aujourdhui()) etat = 'EXPIREE';
    else if (!c.codeMachine) { c.codeMachine = codeMachine; c.lieeLe = new Date().toISOString(); etat = 'VALIDE'; }
    else if (c.codeMachine === codeMachine) etat = 'VALIDE';
    else etat = 'MAUVAISE_MACHINE';
    if (etat === 'VALIDE') { c.derniereVerification = new Date().toISOString(); c.derniereVersion = version || null; }
    else { c.derniereTentativeRefusee = { le: new Date().toISOString(), codeMachine, etat }; }
  }, `Vérification ${id} (${etat})`).catch((e) => console.error('Écriture du registre impossible :', e.message));
  return json(200, reponseSignee({ id, codeMachine, etat, fin, horodatage }));
}

export const config = { path: '/api/licences-dddb99be0d/*' };
