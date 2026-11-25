/* OxCSML Seminar: renders the next talk, programme and term calendar from data.js. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const DAY = 86400000;
  const terms = window.OXCSML_TERMS || [];

  // Dates are YYYY-MM-DD strings, times HH:MM; "now" is UK local time.
  const now = (() => {
    const opts = { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", opts).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, year: p.year };
  })();
  const toMs = s => Date.parse(`${s}T00:00:00Z`);
  const fromMs = ms => new Date(ms).toISOString().slice(0, 10);
  const isValidDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toMs(s)) && fromMs(toMs(s)) === s;
  const fmt = (s, opts) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${s}T12:00:00Z`));
  const longDate = s => fmt(s, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDate = s => fmt(s, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeRange = t => t.endTime ? `${t.time}–${t.endTime}` : t.time;
  const byDateTime = (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

  // Only http(s) links; relative paths (e.g. assets/slides/x.pdf) only where allowed.
  const safeUrl = (s, allowRelative = false) => {
    if (!s || !(allowRelative || /^https?:\/\//i.test(s))) return "";
    try {
      const url = new URL(s, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const talks = (window.OXCSML_TALKS || []).filter(t => t && isValidDate(t.date)).map(t => ({
    date: t.date, time: t.time || "", endTime: t.endTime || "", room: t.room || "",
    speaker: t.speaker || "Speaker to be announced", affiliation: t.affiliation || "", speakerUrl: t.speakerUrl || "",
    title: t.title || "Title to be announced", abstract: t.abstract || "", slides: t.slides || "", zoomUrl: t.zoomUrl || "",
    provisional: t.status === "provisional"
  }));
  const isUpcoming = t => t.date > now.date || (t.date === now.date && (!t.time || t.time >= now.time));
  const upcoming = talks.filter(isUpcoming).sort(byDateTime);

  // Oxford Full Term: eight weeks, each Sunday–Saturday, from the term's start date.
  const termIndexOf = date => terms.findIndex(t => {
    const diff = toMs(date) - toMs(t.start);
    return diff >= 0 && diff < 56 * DAY;
  });
  const getTerm = date => {
    const t = terms[termIndexOf(date)];
    if (!t) return { week: null, label: `Outside Full Term · ${date.slice(0, 4)}` };
    return { week: Math.floor((toMs(date) - toMs(t.start)) / (7 * DAY)) + 1, label: `${t.name} ${t.year}` };
  };

  const el = (tag, cls, text, attrs = {}) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const add = (parent, ...children) => {
    parent.append(...children);
    return parent;
  };
  const button = (cls, text, onClick, attrs) => {
    const b = el("button", cls, text, { type: "button", ...attrs });
    b.addEventListener("click", onClick);
    return b;
  };
  const link = (cls, text, href) => el("a", cls, text, { href, target: "_blank", rel: "noopener noreferrer" });

  function renderNextTalk() {
    const next = upcoming[0];
    if (!next) return; // index.html already shows the "to be announced" state.
    const term = getTerm(next.date);
    const box = $("next-content");
    box.replaceChildren(
      el("div", "next-date", `${shortDate(next.date)}${term.week ? ` · Week ${term.week}` : ""}`),
      el("h2", "", next.title),
      el("div", "next-speaker", [next.speaker, next.affiliation].filter(Boolean).join(" · ")),
      add(el("div", "next-meta"), el("span", "", next.time ? `${timeRange(next)} UK time` : "Time TBC"), el("span", "", next.room || "Room TBC"))
    );
    if (next.provisional) box.append(el("p", "", "Details are provisional and may change."));
    $("next-talk").querySelector(".next-footer").lastElementChild
      .replaceWith(button("inline-arrow", "View talk details ↗", () => openTalk(next)));
  }

  function talkRow(talk) {
    const info = add(el("span", "talk-row-info"),
      el("b", "", talk.speaker), el("span", "", talk.affiliation || "Affiliation TBC"), el("span", "", "·"),
      el("span", "", talk.time ? `${talk.time} UK` : "Time TBC"), el("span", "", "·"), el("span", "", talk.room || "Room TBC"));
    if (talk.provisional) info.append(el("span", "provisional", "PROVISIONAL"));
    return add(button("talk-row", null, () => openTalk(talk), { "aria-label": `Details for ${talk.title} by ${talk.speaker}, ${longDate(talk.date)}` }),
      add(el("span", "talk-datebox"), el("b", "", talk.date.slice(8, 10)), el("small", "", fmt(talk.date, { month: "short" }).toUpperCase())),
      add(el("span", "talk-row-main"), el("span", "talk-row-title", talk.title), info),
      el("span", "talk-row-arrow", "↗"));
  }

  let filter = "all";
  function renderProgramme() {
    $("count-all").textContent = talks.length;
    $("count-upcoming").textContent = upcoming.length;
    $("count-past").textContent = talks.length - upcoming.length;
    const q = $("talk-search").value.trim().toLowerCase();
    const shown = talks
      .filter(t => filter === "all" || (filter === "upcoming") === isUpcoming(t))
      .filter(t => [t.title, t.speaker, t.affiliation, t.abstract, t.room].join(" ").toLowerCase().includes(q))
      .sort((a, b) => {
        const ua = isUpcoming(a), ub = isUpcoming(b);
        if (ua !== ub) return ua ? -1 : 1;
        return ua ? byDateTime(a, b) : byDateTime(b, a);
      });
    const out = $("programme-list");
    if (!shown.length) {
      const heading = q ? "No matching talks" : { past: "No past talks yet", upcoming: "More talks coming soon" }[filter] || "The programme is taking shape";
      const text = q ? "Try another speaker, topic or keyword." : "Confirmed speakers, dates, abstracts and slides will appear here as soon as they are available.";
      out.replaceChildren(add(el("div", "empty-state"), el("h3", "", heading), el("p", "", text),
        el("a", "", "Questions or suggestions? Contact the organisers ↗", { href: "#contact" })));
      return;
    }
    const groups = new Map(); // term label -> week label -> talks
    for (const talk of shown) {
      const term = getTerm(talk.date);
      const week = term.week ? `Week ${term.week}\n${shortDate(talk.date)}` : "Outside term";
      if (!groups.has(term.label)) groups.set(term.label, new Map());
      const weeks = groups.get(term.label);
      weeks.set(week, [...(weeks.get(week) || []), talk]);
    }
    out.replaceChildren(...[...groups].map(([label, weeks]) => {
      const count = [...weeks.values()].flat().length;
      return add(el("div", "term-group"),
        add(el("div", "term-header"), el("h3", "", label), el("span", "", `${count} ${count === 1 ? "talk" : "talks"}`)),
        ...[...weeks].map(([week, ts]) => add(el("div", "week-group"), el("div", "week-label", week), add(el("div", "week-talks"), ...ts.map(talkRow)))));
    }));
  }

  // Show the current term, else the next talk's term, else the next term to start, else the last.
  let termIndex = [termIndexOf(now.date), upcoming[0] ? termIndexOf(upcoming[0].date) : -1, terms.findIndex(t => t.start > now.date)]
    .find(i => i >= 0) ?? terms.length - 1;

  function renderCalendar() {
    const term = terms[termIndex];
    if (!term) return;
    const start = toMs(term.start);
    const dayMonth = ms => fmt(fromMs(ms), { day: "numeric", month: "short" });
    $("term-heading").textContent = `${term.name} ${term.year}`;
    $("term-range").textContent = `${shortDate(term.start)} – ${shortDate(fromMs(start + 55 * DAY))}`;
    $("term-select").value = String(termIndex);
    $("term-prev").disabled = termIndex === 0;
    $("term-next").disabled = termIndex === terms.length - 1;
    const cells = ["WEEK", "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(name => el("div", "term-cal-header", name, { role: "columnheader" }));
    for (let week = 0; week < 8; week++) {
      const first = start + week * 7 * DAY;
      cells.push(add(el("div", "term-week-cell", null, { role: "rowheader" }),
        el("strong", "", `Week ${week + 1}`), el("small", "", `${dayMonth(first)} – ${dayMonth(first + 6 * DAY)}`)));
      for (let d = 0; d < 7; d++) {
        const date = fromMs(first + d * DAY);
        const day = el("span", "term-day-date", String(Number(date.slice(8, 10))));
        if (d === 0 || date.endsWith("-01")) day.append(el("small", "", fmt(date, { month: "short" })));
        const events = talks.filter(t => t.date === date).sort(byDateTime).map(talk =>
          button("cal-event", talk.speaker, () => openTalk(talk), { title: talk.title, "aria-label": `${talk.title} by ${talk.speaker}, ${longDate(date)}. Open details` }));
        const cls = `term-day-cell${date === now.date ? " today" : ""}${d === 5 ? " friday" : ""}`;
        cells.push(add(el("div", cls, null, { role: "gridcell", "aria-label": longDate(date) }), day, ...events));
      }
    }
    $("term-calendar").replaceChildren(...cells);
  }

  function openTalk(talk) {
    const term = getTerm(talk.date);
    const speakerUrl = safeUrl(talk.speakerUrl), slides = safeUrl(talk.slides, true), zoom = safeUrl(talk.zoomUrl);
    const meta = [
      ["DATE", longDate(talk.date)],
      ["TIME", talk.time ? `${timeRange(talk)} (UK)` : "To be confirmed"],
      ["VENUE", "Department of Statistics, Oxford"],
      ["ROOM", talk.room || "To be confirmed"]
    ].map(([label, value]) => add(el("div"), el("small", "", label), el("strong", "", value)));
    const actions = add(el("div", "dialog-actions"),
      slides ? link("btn btn-primary", "Download slides ↗", slides) : el("span", "dialog-no-slides", "Slides not currently available."));
    if (zoom) actions.append(link("btn zoom-link", "Zoom link ↗", zoom), el("span", "zoom-passcode", "Passcode: contact the organisers if needed"));
    $("dialog-body").replaceChildren(add(el("div", "dialog-body"),
      el("div", "dialog-term", `${term.label}${term.week ? ` · Week ${term.week}` : ""}${talk.provisional ? " · PROVISIONAL" : ""}`),
      el("h2", "", talk.title),
      add(el("div", "dialog-speaker"), speakerUrl ? link("", talk.speaker, speakerUrl) : talk.speaker),
      el("div", "dialog-affiliation", talk.affiliation || "Affiliation to be confirmed"),
      add(el("div", "dialog-metadata"), ...meta),
      el("div", "dialog-abstract-label", "ABSTRACT"),
      el("p", "dialog-abstract", talk.abstract || "Abstract to be announced."),
      actions));
    $("talk-dialog").showModal();
  }

  $("footer-year").textContent = `© ${now.year}`;
  const dialog = $("talk-dialog");
  $("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    tabs.forEach(t => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-pressed", String(t === tab));
    });
    renderProgramme();
  }));
  $("talk-search").addEventListener("input", renderProgramme);

  const select = $("term-select");
  select.append(...terms.map((t, i) => el("option", "", `${t.name} ${t.year}`, { value: i })));
  const showTerm = i => {
    termIndex = Math.min(Math.max(i, 0), terms.length - 1);
    renderCalendar();
  };
  select.addEventListener("change", () => showTerm(Number(select.value)));
  $("term-prev").addEventListener("click", () => showTerm(termIndex - 1));
  $("term-next").addEventListener("click", () => showTerm(termIndex + 1));

  renderNextTalk();
  renderProgramme();
  renderCalendar();
})();
