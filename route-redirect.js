(() => {
  const target = document.body.dataset.redirect;
  if (!['/projects.html', '/join.html'].includes(target)) return;
  const url = new URL(target, location.origin);
  url.search = location.search;
  url.hash = location.hash;
  location.replace(url.href);
})();
