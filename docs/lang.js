// TR/EN switch for the support site. Starts from ?lang=, then the browser language.
(function () {
  var blocks = document.querySelectorAll('[data-lang-block]');
  var buttons = document.querySelectorAll('[data-lang]');

  function apply(lang) {
    blocks.forEach(function (b) { b.hidden = b.getAttribute('data-lang-block') !== lang; });
    buttons.forEach(function (btn) { btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang') === lang)); });
    document.documentElement.lang = lang;
  }

  function initial() {
    var fromQuery = new URLSearchParams(location.search).get('lang');
    if (fromQuery === 'tr' || fromQuery === 'en') return fromQuery;
    var nav = (navigator.language || 'en').toLowerCase();
    return nav.indexOf('tr') === 0 ? 'tr' : 'en';
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () { apply(btn.getAttribute('data-lang')); });
  });
  apply(initial());
})();
