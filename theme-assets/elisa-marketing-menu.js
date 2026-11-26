// Elisa marketing theme runtime, uploaded as theme-assets/elisa-marketing.js.
// Everything here is progressive enhancement: without JS the nav is visible,
// tab panels are stacked and the theme follows the OS preference.
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "elisa-theme";

  function store(value) {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function isDark() {
    var forced = root.getAttribute("data-theme");
    if (forced) return forced === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function wireTheme() {
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    function sync() {
      var dark = isDark();
      for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", String(dark));
    }
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        // Back to "follow the system" when the choice matches the OS again.
        var system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        if (next === system) {
          root.removeAttribute("data-theme");
          store(null);
        } else {
          root.setAttribute("data-theme", next);
          store(next);
        }
        sync();
      });
    }
    sync();
  }

  function wireNav() {
    var button = document.querySelector("[data-burger]");
    var nav = document.getElementById("site-nav");
    if (!button || !nav) return;
    function set(open) {
      button.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }
    button.addEventListener("click", function () {
      set(button.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        set(false);
        button.focus();
      }
    });
    nav.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) set(false);
    });
  }

  // <div class="tabs"><div class="panel"><h3>Label</h3>…</div>…</div>
  // → ARIA tabs (arrow keys, Home/End). Panels keep their heading for SEO and
  // screen readers; it is only hidden visually once the tablist exists.
  var tabsSeq = 0;
  function wireTabs() {
    var groups = document.querySelectorAll(".tabs");
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var panels = [];
      for (var c = 0; c < group.children.length; c++) {
        if (group.children[c].classList.contains("panel")) panels.push(group.children[c]);
      }
      if (panels.length < 2) continue;
      var list = document.createElement("div");
      list.className = "tablist";
      list.setAttribute("role", "tablist");
      var label = group.getAttribute("data-label");
      if (label) list.setAttribute("aria-label", label);
      var tabs = [];
      tabsSeq++;
      panels.forEach(function (panel, i) {
        var heading = panel.querySelector("h3, h4");
        var id = "tab-" + tabsSeq + "-" + i;
        var tab = document.createElement("button");
        tab.type = "button";
        tab.id = id;
        tab.setAttribute("role", "tab");
        tab.textContent = heading ? heading.textContent : "Tab " + (i + 1);
        panel.id = panel.id || id + "-panel";
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", id);
        panel.setAttribute("tabindex", "0");
        tab.setAttribute("aria-controls", panel.id);
        list.appendChild(tab);
        tabs.push(tab);
      });
      function select(index, focus) {
        tabs.forEach(function (tab, i) {
          var on = i === index;
          tab.setAttribute("aria-selected", String(on));
          tab.tabIndex = on ? 0 : -1;
          panels[i].hidden = !on;
        });
        if (focus) tabs[index].focus();
      }
      (function (tabs, select) {
        tabs.forEach(function (tab, i) {
          tab.addEventListener("click", function () {
            select(i, false);
          });
          tab.addEventListener("keydown", function (e) {
            var n = tabs.length;
            var next = null;
            if (e.key === "ArrowRight") next = (i + 1) % n;
            else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = n - 1;
            if (next !== null) {
              e.preventDefault();
              select(next, true);
            }
          });
        });
      })(tabs, select);
      group.insertBefore(list, group.firstChild);
      group.classList.add("is-ready");
      select(0, false);
    }
  }

  // Static contact form: ?topic=founding (etc.) fills the hidden topic field
  // and the subject of the mailto it opens. Unknown values are ignored.
  var TOPICS = ["demo", "founding", "engineer", "security", "self-managed", "fully-managed", "migration", "overview"];
  function wireTopic() {
    var form = document.querySelector("form[data-topic-form]");
    if (!form || !window.URLSearchParams) return;
    var topic = new URLSearchParams(window.location.search).get("topic");
    if (!topic || TOPICS.indexOf(topic) < 0) return;
    var field = form.querySelector('input[name="topic"]');
    if (field) field.value = topic;
    var action = form.getAttribute("action") || "";
    if (action.indexOf("mailto:") === 0 && action.indexOf("?") < 0) form.setAttribute("action", action + "?subject=" + encodeURIComponent("Elisa: " + topic));
  }

  // Pricing calculator. The price lists of the page hold the prices
  // ([data-bands="users"] and [data-bands="platform"], one li[data-upto]
  // per band), so a price changes in the page alone. Each user is billed at
  // the price of their band; the platform fee is the band of the user count
  // and applies only when we host. Without JS the calculator stays hidden.
  function readBands(kind) {
    var list = document.querySelector('[data-bands="' + kind + '"]');
    if (!list) return [];
    return Array.prototype.slice
      .call(list.querySelectorAll("li[data-upto]"))
      .map(function (li) {
        return { li: li, upto: Number(li.getAttribute("data-upto")), price: Number(li.getAttribute("data-price")) };
      })
      .filter(function (b) {
        return b.upto > 0 && b.price >= 0;
      })
      .sort(function (a, b) {
        return a.upto - b.upto;
      });
  }
  function bandOf(bands, n) {
    for (var i = 0; i < bands.length; i++) if (n <= bands[i].upto) return bands[i];
    return null;
  }
  function wireCalc() {
    var calc = document.querySelector("[data-calc]");
    var users = readBands("users");
    var platform = readBands("platform");
    if (!calc || !users.length) return;
    var max = users[users.length - 1].upto;
    var locale = calc.getAttribute("data-locale") || root.lang || "fr-FR";
    var currency = calc.getAttribute("data-currency") || "EUR";
    function money(value, cents) {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency,
          minimumFractionDigits: cents ? 2 : 0,
          maximumFractionDigits: cents ? 2 : 0,
        }).format(value);
      } catch (e) {
        return String(Math.round(value)) + " " + currency;
      }
    }
    function q(sel) {
      return calc.querySelector(sel);
    }
    var range = q("[data-calc-users]");
    var number = q("[data-calc-users-number]");
    var radios = calc.querySelectorAll("[data-calc-where]");
    if (!range || !number) return;
    range.max = String(max);
    function hosted() {
      for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value !== "self";
      return true;
    }
    function put(sel, text, hide) {
      var el = q(sel);
      if (!el) return;
      if (text !== null) el.textContent = text;
      if (hide !== undefined) el.hidden = hide;
    }
    function mark(bands, current) {
      bands.forEach(function (b) {
        b.li.classList.toggle("is-active", b === current);
      });
    }
    function render(n) {
      var quote = n > max;
      var withFee = hosted();
      var cost = 0;
      var prev = 0;
      users.forEach(function (b) {
        var take = Math.min(n, b.upto) - prev;
        if (take > 0) cost += take * b.price;
        prev = b.upto;
      });
      var feeBand = bandOf(platform, n);
      var fee = withFee && feeBand ? feeBand.price : 0;
      mark(users, quote ? null : bandOf(users, n));
      mark(platform, quote || !withFee ? null : feeBand);
      put("[data-calc-figures]", null, quote);
      put("[data-calc-quote]", null, !quote);
      if (quote) return;
      put("[data-calc-total]", money(cost + fee));
      put("[data-calc-users-cost]", money(cost));
      put("[data-calc-platform]", money(fee));
      put("[data-calc-platform-line]", null, !withFee);
      put("[data-calc-average]", money((cost + fee) / n, true));
    }
    function fromRange() {
      number.value = range.value;
      render(Number(range.value));
    }
    function fromNumber() {
      var n = Math.floor(Number(number.value));
      if (!(n >= 1)) return;
      range.value = String(Math.min(n, max));
      render(n);
    }
    range.addEventListener("input", fromRange);
    number.addEventListener("input", fromNumber);
    for (var i = 0; i < radios.length; i++) radios[i].addEventListener("change", fromNumber);
    calc.hidden = false;
    fromNumber();
  }

  function start() {
    wireTopic();
    wireTheme();
    wireNav();
    wireTabs();
    wireCalc();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
