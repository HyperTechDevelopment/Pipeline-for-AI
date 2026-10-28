/* ============================================================
   Pipeline — lógica da interface
   JS clássico, sem módulos: roda direto de file://
   ============================================================ */

(function () {
  "use strict";

  var PIPELINES = Array.isArray(window.PIPELINES) ? window.PIPELINES : [];
  var SOURCES = window.SKILL_SOURCES || {};
  var toastsTimer = null;
  var revealObserver = null;
  var scrollFrame = null;

  var els = {
    home: document.getElementById("view-home"),
    detail: document.getElementById("view-detail"),
    grid: document.getElementById("grid"),
    chips: document.getElementById("chips"),
    search: document.getElementById("search"),
    empty: document.getElementById("empty"),
    resetFilters: document.getElementById("reset-filters"),
    toast: document.getElementById("toast"),
    heroChain: document.getElementById("hero-chain"),
    themeToggle: document.getElementById("theme-toggle"),
    statPipelines: document.getElementById("stat-pipelines"),
    statSkills: document.getElementById("stat-skills"),
    statStages: document.getElementById("stat-stages")
  };

  var state = { category: "Todas", query: "" };

  /* ---------- utilitários ---------- */

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function norm(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function getPipeline(id) {
    for (var i = 0; i < PIPELINES.length; i++) {
      if (PIPELINES[i].id === id) return PIPELINES[i];
    }
    return null;
  }

  function categories() {
    var seen = [];
    PIPELINES.forEach(function (p) {
      if (seen.indexOf(p.category) === -1) seen.push(p.category);
    });
    return seen;
  }

  function skillCount(p) {
    var seen = [];
    p.stages.forEach(function (s) {
      if (seen.indexOf(s.skill) === -1) seen.push(s.skill);
    });
    return seen.length;
  }

  function stageLabel(n) {
    return n + (n === 1 ? " estágio" : " estágios");
  }

  /* ---------- origem das skills ---------- */

  function groupSources(skillNames) {
    var groups = [];
    skillNames.forEach(function (name) {
      var src = SOURCES[name];
      if (!src) return;
      var group = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].repo === src.repo) group = groups[i];
      }
      if (!group) {
        group = { repo: src.repo, url: src.url, skills: [] };
        groups.push(group);
      }
      group.skills.push(name);
    });
    return groups;
  }

  function originListHTML(groups) {
    return groups.map(function (group) {
      var label = group.url
        ? '<a class="origin-repo" href="' + esc(group.url) + '" target="_blank" rel="noopener">' +
          esc(group.repo) + "</a>"
        : '<span class="origin-repo is-unlinked">' + esc(group.repo) + "</span>";

      var skills = group.skills.map(function (name) {
        return '<span class="origin-skill">' + esc(name) + "</span>";
      }).join("");

      return '<li class="origin">' + label + '<span class="origin-skills">' + skills + "</span></li>";
    }).join("");
  }

  function allSkillNames() {
    var seen = [];
    PIPELINES.forEach(function (p) {
      p.stages.forEach(function (s) {
        if (seen.indexOf(s.skill) === -1) seen.push(s.skill);
      });
    });
    return seen;
  }

  function renderOrigins() {
    var list = document.getElementById("origin-list");
    if (!list) return;
    list.innerHTML = originListHTML(groupSources(allSkillNames()));
  }

  function originsBlockHTML(pipeline) {
    var groups = groupSources(pipeline.stages.map(function (s) { return s.skill; }));
    if (!groups.length) return "";
    return (
      '<section class="origins-block">' +
        '<p class="label">origem das skills</p>' +
        '<ul class="origin-list origin-list-inline">' + originListHTML(groups) + "</ul>" +
      "</section>"
    );
  }

  /* ---------- cadeias ---------- */

  function chainHTML(pipeline) {
    return pipeline.stages
      .map(function (stage, i) {
        return (
          '<span class="node">' +
          '<span class="node-num">' + pad(i + 1) + "</span>" +
          '<span class="node-name">' + esc(stage.skill) + "</span>" +
          "</span>"
        );
      })
      .join('<span class="chain-arrow" aria-hidden="true">\u2192</span>');
  }

  function chainInlineHTML(pipeline) {
    return pipeline.stages
      .map(function (stage) {
        return '<span class="c-skill">' + esc(stage.skill) + "</span>";
      })
      .join('<span class="c-arrow" aria-hidden="true">\u2192</span>');
  }

  function chainText(pipeline) {
    return pipeline.stages.map(function (s) { return s.cmd; }).join(" \u2192 ");
  }

  function promptText(pipeline) {
    var lines = [
      "Pipeline: " + pipeline.name,
      "Objetivo: " + pipeline.statement,
      ""
    ];

    if (pipeline.precondition) {
      lines.push("Antes de come\u00e7ar: " + pipeline.precondition);
      lines.push("");
    }

    lines.push("Execute os est\u00e1gios abaixo na ordem. N\u00e3o avance sem cumprir o gate do est\u00e1gio atual.");
    lines.push("");

    pipeline.stages.forEach(function (s, i) {
      lines.push(pad(i + 1) + ". " + s.cmd + " \u2014 " + s.role);
      lines.push("    Entrega: " + s.artifact);
      lines.push("    Gate: " + s.gate);
      lines.push("");
    });

    if (pipeline.outcome) {
      lines.push("Resultado esperado: " + pipeline.outcome);
    }

    return lines.join("\n").trim();
  }

  /* ---------- cópia ---------- */

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastsTimer);
    toastsTimer = setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 1900);
  }

  function flashLabel(element) {
    if (!element) return;
    if (!element.dataset.originalLabel) {
      element.dataset.originalLabel = element.textContent;
    }
    element.textContent = "copiado";
    element.classList.add("is-copied");
    clearTimeout(element._labelTimer);
    element._labelTimer = setTimeout(function () {
      element.textContent = element.dataset.originalLabel;
      element.classList.remove("is-copied");
    }, 1500);
  }

  function copyText(text, message, sourceEl) {
    function done() {
      toast(message);
      flashLabel(sourceEl);
    }

    function fallback() {
      var field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.top = "-1000px";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(field);
      if (ok) done();
      else toast("N\u00e3o foi poss\u00edvel copiar");
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- tema ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var isLight = theme === "light";
    els.themeToggle.setAttribute("aria-pressed", String(isLight));
    els.themeToggle.setAttribute("aria-label", isLight ? "Mudar para tema escuro" : "Mudar para tema claro");
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("pipeline-theme"); } catch (e) { stored = null; }

    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(stored || (prefersLight ? "light" : "dark"));

    els.themeToggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("pipeline-theme", next); } catch (e) { /* modo privado */ }
    });
  }

  /* ---------- catálogo ---------- */

  function renderChips() {
    var list = ["Todas"].concat(categories());
    els.chips.innerHTML = list
      .map(function (cat) {
        var pressed = cat === state.category ? "true" : "false";
        return '<button class="chip" type="button" data-cat="' + esc(cat) +
          '" aria-pressed="' + pressed + '">' + esc(cat) + "</button>";
      })
      .join("");
  }

  function matches(pipeline) {
    if (state.category !== "Todas" && pipeline.category !== state.category) return false;

    var q = norm(state.query).trim();
    if (!q) return true;

    var haystack = [
      pipeline.name,
      pipeline.category,
      pipeline.statement,
      pipeline.outcome,
      pipeline.precondition || "",
      (pipeline.mcps || []).join(" "),
      pipeline.when.join(" "),
      pipeline.stages.map(function (s) {
        return [s.skill, s.cmd, s.role, s.what, s.artifact, s.gate].join(" ");
      }).join(" ")
    ].join(" ");

    return norm(haystack).indexOf(q) !== -1;
  }

  function cardHTML(pipeline, index) {
    return (
      '<article class="card">' +
        '<span class="card-index" aria-hidden="true">' + pad(index + 1) + "</span>" +
        '<div class="card-body">' +
          '<div class="card-top">' +
            '<span class="tag">' + esc(pipeline.category) + "</span>" +
            '<span class="card-meta">' + stageLabel(pipeline.stages.length) +
              '<span class="card-go" aria-hidden="true">\u2192</span>' +
            "</span>" +
          "</div>" +
          '<h3 class="card-title"><a href="#/p/' + esc(pipeline.id) + '">' + esc(pipeline.name) + "</a></h3>" +
          '<p class="card-statement">' + esc(pipeline.statement) + "</p>" +
          '<p class="card-chain">' + chainInlineHTML(pipeline) + "</p>" +
          '<div class="card-foot">' +
            '<span class="card-count">' + skillCount(pipeline) + " skills</span>" +
            '<button class="copy-btn" type="button" data-copy="' + esc(chainText(pipeline)) +
              '" data-copy-message="Comandos copiados">copiar comandos</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderGrid() {
    var list = PIPELINES.filter(matches);
    els.grid.innerHTML = list.map(cardHTML).join("");
    els.empty.hidden = list.length > 0;
    observeReveals();
    updateChainOverflow();
  }

  function observeReveals() {
    var cards = els.grid.querySelectorAll(".card");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!("IntersectionObserver" in window) || reduce) {
      for (var i = 0; i < cards.length; i++) cards[i].classList.add("is-in");
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    }

    for (var j = 0; j < cards.length; j++) {
      cards[j].style.transitionDelay = Math.min(j, 4) * 70 + "ms";
      revealObserver.observe(cards[j]);
    }
  }

  function updateChainOverflow() {
    var scrollers = document.querySelectorAll(".chain-scroll");
    for (var i = 0; i < scrollers.length; i++) {
      var el = scrollers[i];
      if (!el.offsetParent) continue;
      el.classList.toggle("is-overflowing", el.scrollWidth > el.clientWidth + 2);
    }
  }

  /* ---------- detalhe ---------- */

  function renderDetail(id) {
    var pipeline = getPipeline(id);
    if (!pipeline) {
      location.replace("#/");
      return;
    }

    var precondition = pipeline.precondition
      ? '<p class="precondition"><span class="precondition-label">antes de começar</span>' +
        esc(pipeline.precondition) + "</p>"
      : "";

    var mcps = (pipeline.mcps && pipeline.mcps.length)
      ? '<div class="mcps"><span class="label">MCPs</span>' +
        pipeline.mcps.map(function (m) { return '<span class="mcp">' + esc(m) + "</span>"; }).join("") +
        "</div>"
      : "";

    var panels =
      '<div class="panels">' +
        '<section class="panel">' +
          '<h2 class="label">quando eu uso</h2>' +
          "<ul>" + pipeline.when.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
        "</section>" +
        '<section class="panel panel-outcome">' +
          '<h2 class="label">o que eu recebo no fim</h2>' +
          '<p class="outcome-text">' + esc(pipeline.outcome) + "</p>" +
        "</section>" +
      "</div>";

    var stages = pipeline.stages.map(function (stage, i) {
      return (
        '<article class="stage">' +
          '<div class="stage-rail"><span>' + pad(i + 1) + "</span></div>" +
          '<div class="stage-body">' +
            '<div class="stage-top">' +
              '<h3 class="stage-role">' + esc(stage.role) + "</h3>" +
              '<button class="skill-chip" type="button" data-copy="' + esc(stage.cmd) +
                '" data-copy-message="Comando copiado" title="Copiar ' + esc(stage.cmd) + '">' +
                esc(stage.cmd) +
              "</button>" +
            "</div>" +
            '<p class="stage-what">' + esc(stage.what) + "</p>" +
            '<dl class="stage-facts">' +
              '<div class="stage-fact"><dt>entrega</dt><dd>' + esc(stage.artifact) + "</dd></div>" +
              '<div class="stage-fact" data-kind="gate"><dt>gate</dt><dd>' + esc(stage.gate) + "</dd></div>" +
            "</dl>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    var note = pipeline.note
      ? '<aside class="note-box"><span class="label">nota</span>' + esc(pipeline.note) + "</aside>"
      : "";

    var related = (pipeline.related || [])
      .map(getPipeline)
      .filter(Boolean)
      .map(function (item) {
        return (
          '<a class="related-card" href="#/p/' + esc(item.id) + '">' +
            "<strong>" + esc(item.name) + "</strong>" +
            "<span>" + esc(item.category) + " · " + stageLabel(item.stages.length) + "</span>" +
          "</a>"
        );
      });

    var relatedBlock = related.length
      ? '<section class="related"><p class="label">outros pipelines</p>' +
        '<div class="related-grid">' + related.join("") + "</div></section>"
      : "";

    els.detail.innerHTML =
      '<div class="container detail">' +
        '<a class="back" href="#/"><span aria-hidden="true">\u2190</span> catálogo</a>' +
        '<header class="detail-head">' +
          '<div class="card-top">' +
            '<span class="tag">' + esc(pipeline.category) + "</span>" +
            '<span class="card-meta">' + stageLabel(pipeline.stages.length) + " · " +
              skillCount(pipeline) + " skills</span>" +
          "</div>" +
          '<h1 class="detail-title">' + esc(pipeline.name) + "</h1>" +
          '<p class="detail-statement">' + esc(pipeline.statement) + "</p>" +
          '<div class="detail-actions">' +
            '<button class="btn btn-primary" type="button" data-action="chain">Copiar comandos</button>' +
            '<button class="btn" type="button" data-action="prompt">Copiar prompt do pipeline</button>' +
          "</div>" +
          precondition +
        "</header>" +
        '<div class="chain-scroll detail-chain" tabindex="0" role="region" aria-label="Sequência de estágios">' +
          '<div class="chain chain-lg">' + chainHTML(pipeline) + "</div>" +
        "</div>" +
        mcps +
        panels +
        '<div class="stages-head"><h2>Estágios</h2><span class="label">ordem obrigatória</span></div>' +
        '<div class="stages">' + stages + "</div>" +
        note +
        originsBlockHTML(pipeline) +
        relatedBlock +
      "</div>";

    els.detail.dataset.pipeline = pipeline.id;

    els.home.hidden = true;
    els.detail.hidden = false;
    window.scrollTo(0, 0);
    document.title = pipeline.name + " · Pipeline";
    renderDetailBar(pipeline);
    updateChainOverflow();
    syncDetailBar();
  }

  function renderDetailBar(pipeline) {
    var bar = document.querySelector(".detail-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "detail-bar";
      document.body.appendChild(bar);
    }
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML =
      '<div class="container detail-bar-inner">' +
        '<span class="detail-bar-name">' + esc(pipeline.name) + "</span>" +
        '<span class="detail-bar-meta">' + stageLabel(pipeline.stages.length) + "</span>" +
        '<button class="btn btn-primary btn-sm" type="button" data-action="prompt">Copiar prompt</button>' +
      "</div>";
  }

  function removeDetailBar() {
    var bar = document.querySelector(".detail-bar");
    if (bar) bar.remove();
  }

  function showHome() {
    els.detail.hidden = true;
    els.detail.innerHTML = "";
    delete els.detail.dataset.pipeline;
    els.home.hidden = false;
    removeDetailBar();
    document.title = "Pipeline · o que eu rodo no trabalho e nos projetos pessoais";
  }

  function syncDetailBar() {
    var bar = document.querySelector(".detail-bar");
    if (!bar) return;
    var visible = window.scrollY > 420;
    bar.classList.toggle("is-visible", visible);
    bar.setAttribute("aria-hidden", String(!visible));
  }

  /* ---------- rota ---------- */

  function route() {
    var hash = location.hash.replace(/^#/, "");
    var match = /^\/p\/([\w-]+)$/.exec(hash);

    if (match) {
      renderDetail(match[1]);
      return;
    }

    showHome();

    if (hash && hash !== "/" && hash !== "catalogo") {
      var target = document.getElementById(hash);
      if (target) {
        requestAnimationFrame(function () {
          target.scrollIntoView({ block: "start" });
        });
      }
    }
  }

  /* ---------- eventos ---------- */

  function resetFilters() {
    state.category = "Todas";
    state.query = "";
    els.search.value = "";
    var chips = els.chips.querySelectorAll(".chip");
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute("aria-pressed", String(chips[i].dataset.cat === "Todas"));
    }
    renderGrid();
  }

  function bindEvents() {
    els.chips.addEventListener("click", function (event) {
      var chip = event.target.closest(".chip");
      if (!chip) return;
      state.category = chip.dataset.cat;
      var all = els.chips.querySelectorAll(".chip");
      for (var i = 0; i < all.length; i++) {
        all[i].setAttribute("aria-pressed", String(all[i] === chip));
      }
      renderGrid();
    });

    els.search.addEventListener("input", function () {
      state.query = els.search.value;
      renderGrid();
    });

    els.resetFilters.addEventListener("click", resetFilters);

    document.addEventListener("keydown", function (event) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        if (!els.home.hidden) {
          els.search.focus();
          els.search.select();
        }
      }
      if (event.key === "Escape" && document.activeElement === els.search) {
        resetFilters();
        els.search.blur();
      }
    });

    document.addEventListener("click", function (event) {
      var copyTarget = event.target.closest("[data-copy]");
      if (copyTarget) {
        event.preventDefault();
        copyText(copyTarget.dataset.copy, copyTarget.dataset.copyMessage || "Copiado", copyTarget);
        return;
      }

      var action = event.target.closest("[data-action]");
      if (!action) return;

      var pipeline = getPipeline(els.detail.dataset.pipeline);
      if (!pipeline) return;

      if (action.dataset.action === "chain") {
        copyText(chainText(pipeline), "Comandos copiados", action);
      } else if (action.dataset.action === "prompt") {
        copyText(promptText(pipeline), "Prompt copiado, cole no agente", action);
      }
    });

    window.addEventListener("hashchange", route);

    window.addEventListener("scroll", function () {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(function () {
        scrollFrame = null;
        if (!els.detail.hidden) syncDetailBar();
      });
    }, { passive: true });

    var resizeFrame = null;
    window.addEventListener("resize", function () {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(updateChainOverflow);
    });
  }

  /* ---------- início ---------- */

  function init() {
    if (!PIPELINES.length) {
      els.grid.innerHTML = '<p class="empty">Nenhum pipeline carregado. Verifique <code>assets/js/data.js</code>.</p>';
      return;
    }

    initTheme();
    renderChips();

    var featured = getPipeline("feature") || PIPELINES[0];
    els.heroChain.innerHTML = chainHTML(featured);
    els.statPipelines.textContent = String(PIPELINES.length);

    var unique = [];
    var totalStages = 0;
    PIPELINES.forEach(function (p) {
      totalStages += p.stages.length;
      p.stages.forEach(function (s) {
        if (unique.indexOf(s.skill) === -1) unique.push(s.skill);
      });
    });
    els.statSkills.textContent = String(unique.length);
    els.statStages.textContent = String(totalStages);

    renderGrid();
    renderOrigins();
    bindEvents();
    route();
    updateChainOverflow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
