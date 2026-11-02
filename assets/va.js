// Vercel Web Analytics (main address only), cookieless.
// Same rules as the portfolio's own tracking: not on the Netlify backup, not when Do Not Track is on,
// not on the owner's devices (rc_ignore set by the dashboard login or by opening the site once with ?notrack).
(function () {
  if (location.hostname !== 'rached-chakchouk.vercel.app' || navigator.doNotTrack === '1') return;
  try { if (localStorage.getItem('rc_ignore') === '1') return; } catch (e) {}
  var s = document.createElement('script');
  s.src = '/_vercel/insights/script.js';
  s.defer = true;
  document.head.appendChild(s);
})();
