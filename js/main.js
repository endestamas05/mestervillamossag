/* Mester György E.V. – közös szkript. Külső könyvtár nincs, a böngészőben nem tárol semmit.
   A <head>-ben, defer nélkül töltődik, hogy a .js osztály még az első kirajzolás előtt
   rákerüljön. Ha a fájl nem tölt be, a .js osztály sem jön létre, és minden tartalom látszik. */
document.documentElement.classList.add("js");

// Kattintás-eltérítés (clickjacking) ellen: keretbe töltve az oldal elrejti magát (lásd .framed a CSS-ben).
// GitHub Pagesen nem állítható frame-ancestors fejléc, ezért csak ez a részleges védelem van.
if (window.top !== window.self) {
  document.documentElement.classList.add("framed");
}

document.addEventListener("DOMContentLoaded", function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initReveal();
  initScrollWire();
  initSchematic();

  // Megjelenési animáció: amikor egy .reveal elem a képbe ér, megkapja az .is-visible osztályt.
  // Csak egyszer fut le, utána már nem figyeljük az elemet.
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    items.forEach(function (item) { observer.observe(item); });
  }

  // Görgetés-jelző vezeték: a görgetés aránya (0–1) adja a scaleY értékét.
  // requestAnimationFrame: képkockánként legfeljebb egyszer számolunk újra.
  function initScrollWire() {
    var wire = document.querySelector(".scroll-wire");
    if (!wire || reduceMotion) return;
    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? window.scrollY / max : 0;
      wire.style.transform = "scaleY(" + Math.min(progress, 1) + ")";
      ticking = false;
    }
    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();
  }

  // Kapcsolási rajz: a data-on="true/false" érték vezérli a CSS-átmeneteket.
  // Betöltéskor kikapcsolva indul, majd rövid idő után magától bekapcsol.
  function initSchematic() {
    var hero = document.querySelector(".hero[data-on]");
    var button = document.querySelector(".switch-btn");
    if (!hero || !button) return;

    function setState(isOn) {
      hero.setAttribute("data-on", String(isOn));
      button.setAttribute("aria-pressed", String(isOn));
    }

    var autoStart;
    if (!reduceMotion) {
      setState(false);
      autoStart = window.setTimeout(function () { setState(true); }, 1000);
    }

    button.addEventListener("click", function () {
      window.clearTimeout(autoStart); // ha a látogató megelőzi az automatikus indulást
      setState(hero.getAttribute("data-on") !== "true");
    });
  }
});
