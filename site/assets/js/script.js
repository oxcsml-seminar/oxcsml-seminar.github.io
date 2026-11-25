/* OxCSML Seminar: vanilla JavaScript; no framework, cookies, tracking or backend. */
(() => {
  "use strict";
  const config = window.OXCSML_CONFIG || {};
  const terms = window.OXCSML_TERMS || [];
  const rawTalks = window.OXCSML_TALKS || [];
  const $ = (id) => document.getElementById(id);
  const MS_DAY = 86400000;
  const british = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const getUKNow = () => {
    const parts = Object.fromEntries(british.formatToParts(new Date()).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, year: Number(parts.year), month: Number(parts.month)-1 };
  };
  const isoDate = (y, m, d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const dateObject = (s) => new Date(`${s}T12:00:00Z`);
  const asDayMs = (s) => Date.parse(`${s}T00:00:00Z`);
  const fmt = (s, opt) => new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", ...opt }).format(dateObject(s));
  const longDate = s => fmt(s, { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const shortDate = s => fmt(s, { weekday:"short", day:"numeric", month:"short", year:"numeric" });
  const monthName = (y,m) => new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", month:"long", year:"numeric" }).format(new Date(Date.UTC(y,m,1)));
  const isValidDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(asDayMs(s)) && dateObject(s).toISOString().slice(0,10) === s;
  const validUrl = (input, allowRelative=false) => {
    if (!input || typeof input !== "string") return "";
    try {
      const url = new URL(input, location.href);
      if (url.protocol === "https:" || url.protocol === "http:") {
        if (allowRelative) return url.href;
        if (/^https?:\/\//i.test(input)) return url.href;
      }
    } catch (_) { /* invalid URL */ }
    return "";
  };
  const talkList = rawTalks.filter(t => t && isValidDate(t.date) && t.id).map(t => ({
    id:String(t.id), date:String(t.date), time:String(t.time || ""), endTime:String(t.endTime || ""),
    room:String(t.room || ""), speaker:String(t.speaker || "Speaker to be announced"),
    affiliation:String(t.affiliation || ""), speakerUrl:String(t.speakerUrl || ""),
    title:String(t.title || "Title to be announced"), abstract:String(t.abstract || ""), slides:String(t.slides || ""),
    zoomUrl:String(t.zoomUrl || ""),
    status:t.status === "provisional" ? "provisional" : "confirmed"
  }));
  const now = () => getUKNow();
  const isUpcoming = t => (t.date > now().date) || (t.date === now().date && (!t.time || t.time >= now().time));
  const getTerm = date => {
    const d = asDayMs(date);
    for (const t of terms) {
      const diff = Math.floor((d - asDayMs(t.start)) / MS_DAY);
      if (diff >= 0 && diff < 56) return { name:t.name, year:t.year, week:Math.floor(diff/7)+1, label:`${t.name} ${t.year}` };
    }
    return { name:"Outside Full Term", year:Number(date.slice(0,4)), week:null, label:`Outside Full Term · ${date.slice(0,4)}` };
  };
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };
  const add = (parent, ...children) => { children.forEach(child => parent.appendChild(child)); return parent; };
  const speakerBlock = t => {
    const fragment = document.createDocumentFragment();
    if (validUrl(t.speakerUrl)) {
      const a = el("a", "", t.speaker);
      a.href = validUrl(t.speakerUrl); a.target = "_blank"; a.rel = "noopener noreferrer";
      fragment.appendChild(a);
    } else fragment.appendChild(document.createTextNode(t.speaker));
    return fragment;
  };

  function renderNextTalk() {
    const upcoming = talkList.filter(isUpcoming).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const next = upcoming[0];
    if (!next) return; // The HTML already contains the genuine "TBA" empty state.
    const box = $("next-content"); box.replaceChildren();
    const term = getTerm(next.date);
    add(box,
      el("div", "next-date", `${shortDate(next.date)}${term.week ? ` · Week ${term.week}` : ""}`),
      el("h2", "", next.title)
    );
    const speaker = el("div", "next-speaker", `${next.speaker}${next.affiliation ? ` · ${next.affiliation}` : ""}`);
    const meta = el("div", "next-meta");
    add(meta, el("span", "", next.time ? `${next.time}${next.endTime ? `–${next.endTime}` : ""} UK time` : "Time TBC"), el("span", "", next.room || "Room TBC"));
    box.appendChild(speaker); box.appendChild(meta);
    if (next.status === "provisional") box.appendChild(el("p", "", "Details are provisional and may change."));
    const footer = $("next-talk").querySelector(".next-footer");
    const btn = el("button", "inline-arrow", "View talk details ↗");
    btn.type = "button";
    btn.style.cssText = "background:none;border:0;padding:0;font-size:11px";
    btn.addEventListener("click", () => openTalkDialog([next]));
    footer.lastElementChild.replaceWith(btn);
  }

  function createTalkRow(talk) {
    const row = el("button", "talk-row"); row.type="button";
    row.setAttribute("aria-label", `Details for ${talk.title} by ${talk.speaker}, ${longDate(talk.date)}`);
    const dateBox = el("span", "talk-datebox");
    add(dateBox, el("b", "", talk.date.slice(8,10)), el("small", "", fmt(talk.date, { month:"short" }).toUpperCase()));
    const content = el("span", "talk-row-main");
    const title = el("span", "talk-row-title", talk.title);
    const info = el("span", "talk-row-info");
    add(info, el("b", "", talk.speaker), el("span", "", talk.affiliation || "Affiliation TBC"), el("span", "", "·"), el("span", "", talk.time ? `${talk.time} UK` : "Time TBC"), el("span", "", "·"), el("span", "", talk.room || "Room TBC"));
    if (talk.status === "provisional") info.appendChild(el("span", "provisional", "PROVISIONAL"));
    add(content, title, info);
    add(row, dateBox, content, el("span", "talk-row-arrow", "↗"));
    row.addEventListener("click", () => openTalkDialog([talk]));
    return row;
  }

  let filter = "all";
  function renderProgramme() {
    const countUpcoming = talkList.filter(isUpcoming).length;
    $("count-all").textContent = talkList.length;
    $("count-upcoming").textContent = countUpcoming;
    $("count-past").textContent = talkList.length - countUpcoming;
    const q = $("talk-search").value.trim().toLowerCase();
    const filtered = talkList.filter(t => (filter === "all" || (filter === "upcoming" ? isUpcoming(t) : !isUpcoming(t))) &&
      [t.title,t.speaker,t.affiliation,t.abstract,t.room].join(" ").toLowerCase().includes(q));
    filtered.sort((a,b) => filter === "upcoming" ? a.date.localeCompare(b.date) || a.time.localeCompare(b.time) : b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    const out = $("programme-list"); out.replaceChildren();
    if (!filtered.length) {
      const empty = el("div", "empty-state");
      add(empty, el("div", "empty-state-symbol", "✳"),
        el("h3", "", q ? "No matching talks" : filter === "past" ? "No past talks yet" : filter === "upcoming" ? "More talks coming soon" : "The programme is taking shape"),
        el("p", "", q ? "Try another speaker, topic or keyword." : "Confirmed speakers, dates, abstracts and slides will appear here as soon as they are available."));
      const link = el("a", "", "Questions or suggestions? Contact the organisers ↗"); link.href="#contact"; empty.appendChild(link); out.appendChild(empty); return;
    }
    const grouped = new Map();
    for (const talk of filtered) {
      const term = getTerm(talk.date);
      if (!grouped.has(term.label)) grouped.set(term.label, { term, talks:[] });
      grouped.get(term.label).talks.push(talk);
    }
    for (const {term, talks} of grouped.values()) {
      const group = el("div", "term-group");
      const header = el("div", "term-header");
      add(header, el("h3", "", term.label), el("span", "", `${talks.length} ${talks.length === 1 ? "talk" : "talks"}`));
      group.appendChild(header);
      const weeks = new Map();
      for (const talk of talks) {
        const wk = getTerm(talk.date).week;
        const code = {Michaelmas:"MT",Hilary:"HT",Trinity:"TT"}[term.name] || "";
        const key = wk === null ? "Outside term" : `${code}W${wk} · Week ${wk} · ${shortDate(talk.date)}`;
        if (!weeks.has(key)) weeks.set(key, []);
        weeks.get(key).push(talk);
      }
      for (const [label, weekTalks] of weeks) {
        const week = el("div", "week-group");
        const list = el("div", "week-talks");
        weekTalks.forEach(t => list.appendChild(createTalkRow(t)));
        add(week, el("div", "week-label", label), list);
        group.appendChild(week);
      }
      out.appendChild(group);
    }
  }

  const atMidnight = s => Date.parse(`${s}T00:00:00Z`);
  const dateFromMs = ms => new Date(ms).toISOString().slice(0,10);
  const termCodes = { Michaelmas:"MT", Hilary:"HT", Trinity:"TT" };
  let termIndex = 0;
  function initialTermIndex() {
    const today = atMidnight(now().date);
    const current = terms.findIndex(t => today >= atMidnight(t.start) && today < atMidnight(t.start)+56*MS_DAY);
    if (current >= 0) return current;
    // Prefer the term containing the next announced talk, then the next upcoming term.
    const upcoming = talkList.filter(isUpcoming).sort((a,b)=>a.date.localeCompare(b.date))[0];
    if (upcoming) {
      const i = terms.findIndex(t => atMidnight(upcoming.date) >= atMidnight(t.start) && atMidnight(upcoming.date) < atMidnight(t.start)+56*MS_DAY);
      if (i>=0) return i;
    }
    const future = terms.findIndex(t => atMidnight(t.start)>today);
    return future>=0 ? future : Math.max(0,terms.length-1);
  }
  function renderCalendar() {
    const term = terms[termIndex]; if (!term) return;
    $("term-heading").textContent = `${term.name} ${term.year}`;
    $("term-range").textContent = `${shortDate(term.start)} – ${shortDate(dateFromMs(atMidnight(term.start)+55*MS_DAY))}`;
    $("term-select").value = String(termIndex);
    $("term-prev").disabled = termIndex===0;
    $("term-next").disabled = termIndex===terms.length-1;
    const grid = $("term-calendar"); grid.replaceChildren();
    for (const name of ["WEEK", "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]) {
      const cell=el("div","term-cal-header",name);cell.setAttribute("role","columnheader"); grid.appendChild(cell);
    }
    for (let week=1; week<=8; week++) {
      const first=atMidnight(term.start)+(week-1)*7*MS_DAY;
      const last=first+6*MS_DAY;
      const weekCell=el("div","term-week-cell");
      add(weekCell,el("strong","",`${termCodes[term.name]}W${week}`),el("small","",`${fmt(dateFromMs(first),{day:"numeric",month:"short"})} – ${fmt(dateFromMs(last),{day:"numeric",month:"short"})}`));
      weekCell.setAttribute("role","rowheader");grid.appendChild(weekCell);
      for (let d=0; d<7; d++) {
        const date=dateFromMs(first+d*MS_DAY);
        const cell=el("div","term-day-cell"+(date===now().date?" today":"")+(d===5?" friday":""));
        cell.setAttribute("role","gridcell");cell.setAttribute("aria-label",longDate(date));
        const dayEl=el("span","term-day-date",String(Number(date.slice(8,10))));
        if (d===0 || date.endsWith("-01")) dayEl.appendChild(el("small","",fmt(date,{month:"short"})));
        cell.appendChild(dayEl);
        talkList.filter(t=>t.date===date).sort((a,b)=>a.time.localeCompare(b.time)).forEach(talk=>{
          const btn=el("button","cal-event",talk.speaker||talk.title);
          btn.type="button";btn.title=talk.title;
          btn.setAttribute("aria-label",`${talk.title} by ${talk.speaker}, ${longDate(date)}. Open details`);
          btn.addEventListener("click",()=>openTalkDialog([talk]));
          cell.appendChild(btn);
        });
        grid.appendChild(cell);
      }
    }
  }
  function renderTalkDetails(talk, outer) {
    const term = getTerm(talk.date);
    const box = el("div", "dialog-body" + (outer ? " dialog-multiple" : ""));
    add(box,
      el("div", "dialog-term", `${term.label}${term.week ? ` · Week ${term.week}` : ""}${talk.status === "provisional" ? " · PROVISIONAL" : ""}`),
      el("h2", "", talk.title)
    );
    const speaker = el("div", "dialog-speaker"); speaker.appendChild(speakerBlock(talk));
    add(box, speaker, el("div", "dialog-affiliation", talk.affiliation || "Affiliation to be confirmed"));
    const meta = el("div", "dialog-metadata");
    const cells = [
      ["DATE", longDate(talk.date)],
      ["TIME", talk.time ? `${talk.time}${talk.endTime ? `–${talk.endTime}` : ""} (UK)` : "To be confirmed"],
      ["VENUE", "Department of Statistics, Oxford"],
      ["ROOM", talk.room || "To be confirmed"]
    ];
    for (const [label, value] of cells) {
      const wrapper = el("div"); add(wrapper,el("small", "", label),el("strong", "", value)); meta.appendChild(wrapper);
    }
    box.appendChild(meta);
    add(box,el("div", "dialog-abstract-label", "ABSTRACT"),el("p", "dialog-abstract", talk.abstract || "Abstract to be announced."));
    const actions = el("div", "dialog-actions");
    if (validUrl(talk.slides, true)) {
      const a = el("a", "btn btn-primary", "Download slides ↗");
      a.href = validUrl(talk.slides, true); a.target="_blank"; a.rel="noopener noreferrer"; actions.appendChild(a);
    } else actions.appendChild(el("span", "dialog-no-slides", "Slides not currently available."));
    if (validUrl(talk.zoomUrl)) {
      const z=el("a","btn zoom-link","Zoom link ↗");z.href=validUrl(talk.zoomUrl);z.target="_blank";z.rel="noopener noreferrer";
      actions.appendChild(z);
      actions.appendChild(el("span","zoom-passcode","Passcode: contact the organisers if needed"));
    }
    box.appendChild(actions);
    return box;
  }
  function openTalkDialog(talks) {
    const body = $("dialog-body"); body.replaceChildren();
    talks.forEach(t => body.appendChild(renderTalkDetails(t, talks.length > 1)));
    $("talk-dialog").showModal();
  }

  function setupMisc() {
    $("footer-year").textContent = `© ${now().year}`;
    if (config.organisersRepoUrl && validUrl(config.organisersRepoUrl) && /^https:\/\/github\.com\//.test(config.organisersRepoUrl)) {
      $("organisers-link").href = validUrl(config.organisersRepoUrl);
      $("organisers-link").hidden = false;
    }
    $("dialog-close").addEventListener("click", () => $("talk-dialog").close());
    for (const dialog of [$("talk-dialog")]) {
      dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
    }
    document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
      filter = button.dataset.filter;
      document.querySelectorAll(".tab").forEach(b => {
        const current = b === button; b.classList.toggle("active", current); b.setAttribute("aria-pressed",String(current));
      });
      renderProgramme();
    }));
    $("talk-search").addEventListener("input",renderProgramme);
    const select = $("term-select");
    terms.forEach((term,i)=>{const option=el("option","",`${term.name} ${term.year}`);option.value=String(i);select.appendChild(option);});
    termIndex=initialTermIndex();
    select.addEventListener("change",()=>{termIndex=Number(select.value);renderCalendar();});
    $("term-prev").addEventListener("click",()=>{termIndex=Math.max(0,termIndex-1);renderCalendar();});
    $("term-next").addEventListener("click",()=>{termIndex=Math.min(terms.length-1,termIndex+1);renderCalendar();});
  }
  setupMisc();
  renderNextTalk();
  renderProgramme();
  renderCalendar();
})();
