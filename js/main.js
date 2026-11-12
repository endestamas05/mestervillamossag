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
  initMeters();

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

  // Görgetés-áramkör: a görgetés aránya (0–1) adja a vezeték scaleY értékét.
  // Szekciónként egy forrpont: ott ül a sávon, ahol a vezeték eleje lesz, amikor
  // a szekció teteje a képernyő közepéhez ér. Így pont akkor gyullad ki, amikor a vezeték odaér.
  // requestAnimationFrame: képkockánként legfeljebb egyszer számolunk újra.
  function initScrollWire() {
    var circuit = document.querySelector(".circuit");
    var wire = document.querySelector(".scroll-wire");
    if (!circuit || !wire || reduceMotion) return;

    var nodes = Array.prototype.map.call(document.querySelectorAll("main > section"), function (section) {
      var el = document.createElement("span");
      el.className = "circuit-node";
      circuit.appendChild(el);
      return { section: section, el: el, at: 0 };
    });

    // A forrpontok helye csak az oldal magasságától függ: betöltéskor és átméretezéskor számoljuk
    function layout() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      nodes.forEach(function (node) {
        var trigger = node.section.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2;
        node.at = max > 0 ? Math.min(Math.max(trigger / max, 0), 0.985) : 0;
        node.el.style.top = node.at * 100 + "%";
      });
    }

    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      wire.style.transform = "scaleY(" + progress + ")";
      nodes.forEach(function (node) {
        node.el.classList.toggle("is-lit", progress >= node.at - 0.002);
      });
      ticking = false;
    }
    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", function () { layout(); requestUpdate(); });
    // A kép és a betűk betöltése után változhat az oldal magassága
    window.addEventListener("load", function () { layout(); update(); });
    layout();
    update();
  }

  // Műszerkijelző: a data-seg szövegből 7 szegmenses SVG számjegyek készülnek.
  // Bekapcsoláskor előbb minden szegmens világít (önteszt, mint a valódi műszereknél),
  // utána a kétjegyű érték 0-tól felpörög, a hosszabb (évszám) egyből megjelenik.
  function initMeters() {
    var SVG_NS = "http://www.w3.org/2000/svg";
    // Szegmensek: a felső, b jobb felső, c jobb alsó, d alsó, e bal alsó, f bal felső, g középső
    var DIGITS = {
      "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
      "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", " ": ""
    };
    // Hatszög alakú szegmensek egy 60 × 100-as cellában
    function hBar(x1, x2, y) {
      return [x1, y, x1 + 4, y - 4, x2 - 4, y - 4, x2, y, x2 - 4, y + 4, x1 + 4, y + 4].join(" ");
    }
    function vBar(x, y1, y2) {
      return [x, y1, x + 4, y1 + 4, x + 4, y2 - 4, x, y2, x - 4, y2 - 4, x - 4, y1 + 4].join(" ");
    }
    var SEGMENTS = {
      a: hBar(11, 49, 8), g: hBar(11, 49, 50), d: hBar(11, 49, 92),
      f: vBar(8, 11, 47), b: vBar(52, 11, 47), e: vBar(8, 53, 89), c: vBar(52, 53, 89)
    };
    var PLUS = [hBar(14, 46, 50), vBar(30, 35, 65)];

    var meters = document.querySelectorAll("[data-seg]");
    if (!meters.length) return;

    // Egy kijelzőhöz SVG-t épít; visszaad egy függvényt, ami a kiírt szöveget állítja
    function build(el) {
      var text = el.getAttribute("data-seg");
      var svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + text.length * 70 + " 100");
      svg.setAttribute("aria-hidden", "true");
      var cells = [];
      for (var i = 0; i < text.length; i++) {
        var g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("transform", "translate(" + (i * 70 + 6) + " 0) skewX(-6)");
        var isPlus = text[i] === "+";
        var shapes = isPlus ? { p: PLUS[0], q: PLUS[1] } : SEGMENTS;
        var cell = { plus: isPlus, segs: {} };
        Object.keys(shapes).forEach(function (key) {
          var poly = document.createElementNS(SVG_NS, "polygon");
          poly.setAttribute("points", shapes[key]);
          poly.setAttribute("class", "seg");
          g.appendChild(poly);
          cell.segs[key] = poly;
        });
        svg.appendChild(g);
        cells.push(cell);
      }
      // A valódi érték a felolvasóprogramoknak rejtett szövegként marad meg
      var label = document.createElement("span");
      label.className = "visually-hidden";
      label.textContent = text;
      el.textContent = "";
      el.appendChild(svg);
      el.appendChild(label);

      return function show(chars) {
        cells.forEach(function (cell, i) {
          var ch = chars[i];
          Object.keys(cell.segs).forEach(function (key) {
            var lit = cell.plus ? ch !== " " : ch === "8" || (DIGITS[ch] || "").indexOf(key) !== -1;
            cell.segs[key].classList.toggle("on", lit);
          });
        });
      };
    }

    function run(el, show) {
      var text = el.getAttribute("data-seg");
      var digits = text.replace(/\D/g, "");
      var suffix = text.slice(digits.length);
      var all8 = text.replace(/./g, "8");
      if (reduceMotion) { show(text); return; }
      show(all8);
      window.setTimeout(function () {
        if (digits.length > 2) { show(text); return; }
        var target = parseInt(digits, 10);
        var n = 0;
        var timer = window.setInterval(function () {
          var s = String(n);
          while (s.length < digits.length) s = " " + s;
          show(s + suffix);
          if (n >= target) window.clearInterval(timer);
          n++;
        }, 55);
      }, 500);
    }

    var items = Array.prototype.map.call(meters, function (el) {
      var show = build(el);
      show(el.getAttribute("data-seg").replace(/./g, " ")); // kezdetben sötét
      return { el: el, show: show };
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.show(item.el.getAttribute("data-seg")); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        items.forEach(function (item, i) {
          if (item.el === entry.target) window.setTimeout(function () { run(item.el, item.show); }, i * 250);
        });
      });
    }, { threshold: 0.6 });
    items.forEach(function (item) { observer.observe(item.el); });
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
