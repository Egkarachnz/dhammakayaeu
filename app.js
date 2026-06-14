/* ============================================================
   State
   ============================================================ */
let TEMPLES = [], EVENTS = [], isAdmin = false, currentTemple = null, editingEvent = null;
let activeCountry = "ทั้งหมด", searchQuery = "", sortBy = "default";

const STORAGE_KEY = "dhammakaya-temples-v1";

/* ── Country flags ── */
const FLAGS = {
  "เบลเยียม":"🇧🇪","เยอรมนี":"🇩🇪","อังกฤษ":"🇬🇧","สหราชอาณาจักร":"🇬🇧",
  "ฝรั่งเศส":"🇫🇷","เนเธอร์แลนด์":"🇳🇱","สวิตเซอร์แลนด์":"🇨🇭","ออสเตรีย":"🇦🇹",
  "เดนมาร์ก":"🇩🇰","สวีเดน":"🇸🇪","นอร์เวย์":"🇳🇴","ฟินแลนด์":"🇫🇮",
  "อิตาลี":"🇮🇹","สเปน":"🇪🇸","โปรตุเกส":"🇵🇹","กรีซ":"🇬🇷",
  "โปแลนด์":"🇵🇱","เช็กเกีย":"🇨🇿","เช็ก":"🇨🇿","ฮังการี":"🇭🇺",
  "โรมาเนีย":"🇷🇴","บัลแกเรีย":"🇧🇬","ไอร์แลนด์":"🇮🇪","ลักเซมเบิร์ก":"🇱🇺",
  "ไซปรัส":"🇨🇾","สโลวาเกีย":"🇸🇰","สโลวีเนีย":"🇸🇮","โครเอเชีย":"🇭🇷",
  "ไอซ์แลนด์":"🇮🇸","มอลต้า":"🇲🇹","มอลตา":"🇲🇹","รัสเซีย":"🇷🇺",
  "ยูเครน":"🇺🇦","เซอร์เบีย":"🇷🇸","ลัตเวีย":"🇱🇻","ลิทัวเนีย":"🇱🇹",
  "เอสโตเนีย":"🇪🇪","ไทย":"🇹🇭","ญี่ปุ่น":"🇯🇵","สิงคโปร์":"🇸🇬",
};
const flag = c => FLAGS[c] ? FLAGS[c] + " " : "";

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const mapUrl = a => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a || "");
const splitMonks = s => String(s || "").split(/[;\n]/).map(x => x.trim()).filter(Boolean);
const uid = () => "t" + Date.now() + Math.random().toString(36).slice(2, 6);

function toast(msg, isErr) {
  const t = $("#toast"); t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(t._tm); t._tm = setTimeout(() => t.className = "toast" + (isErr ? " err" : ""), 3200);
}

/* ============================================================
   Data — prefer localStorage over data.js
   ============================================================ */
function loadData() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) {}

  if (stored && Array.isArray(stored) && stored.length) {
    TEMPLES = stored.filter(t => t.name);
  } else {
    TEMPLES = (typeof DATA_TEMPLES !== "undefined") ? DATA_TEMPLES.filter(t => t.name) : [];
  }
  EVENTS = (typeof DATA_EVENTS !== "undefined") ? DATA_EVENTS : [];
  render();
}

function saveTemplesToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(TEMPLES)); } catch(e) {}
}

/* ============================================================
   Render — flat grid, no country grouping
   ============================================================ */
function countMonks(t) {
  if (t.monk_count && !isNaN(+t.monk_count)) return +t.monk_count;
  return splitMonks(t.monks).length;
}
function uniqueCountries() {
  const seen = [];
  TEMPLES.forEach(t => { if (t.country && !seen.includes(t.country)) seen.push(t.country); });
  return seen;
}
function countryCount(c) {
  return TEMPLES.filter(t => t.country === c).length;
}

function render() {
  const countries = uniqueCountries();
  const byCount = countries.slice().sort((a, b) => countryCount(b) - countryCount(a) || a.localeCompare(b, "th"));

  // สถิติในฮีโร่
  const st = $("#statTemples"), sc = $("#statCountries");
  if (st) st.textContent = TEMPLES.length;
  if (sc) sc.textContent = countries.length;

  // ดรอปดาวน์กรองประเทศ (รายการเต็ม)
  const sel = $("#countrySelect");
  if (sel) {
    sel.innerHTML = `<option value="ทั้งหมด">🌍 ทุกประเทศ (${TEMPLES.length})</option>` +
      byCount.map(c => `<option value="${esc(c)}">${flag(c)}${esc(c)} (${countryCount(c)})</option>`).join("");
    sel.value = activeCountry;
  }

  // กรอง
  const q = searchQuery.trim().toLowerCase();
  let list = TEMPLES.filter(t => {
    const okC = activeCountry === "ทั้งหมด" || t.country === activeCountry;
    const okQ = !q || [t.name, t.country, t.abbot, t.address, t.phone, t.monks].some(v => String(v || "").toLowerCase().includes(q));
    return okC && okQ;
  });

  // เรียงลำดับ
  if (sortBy === "name")    list = list.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));
  else if (sortBy === "country") list = list.slice().sort((a, b) => (a.country || "").localeCompare(b.country || "", "th") || (a.name || "").localeCompare(b.name || "", "th"));
  else if (sortBy === "monks")   list = list.slice().sort((a, b) => countMonks(b) - countMonks(a));

  $("#metaLine").innerHTML = activeCountry === "ทั้งหมด"
    ? `พบ <strong style="color:var(--text)">${list.length}</strong> วัด`
    : `พบ <strong style="color:var(--text)">${list.length}</strong> วัดใน ${flag(activeCountry)}${esc(activeCountry)}`;

  if (!list.length) {
    $("#grid").innerHTML = `<div class="empty">ไม่พบวัดที่ตรงกับเงื่อนไข</div>`;
    return;
  }
  $("#grid").innerHTML = list.map(cardHTML).join("");
}

function cardHTML(t) {
  const initial = (t.name || "?").trim()[0] || "?";
  const logoInner = t.logo
    ? `<img src="${esc(t.logo)}" alt="" onerror="this.parentElement.textContent='${esc(initial)}';">`
    : esc(initial);
  const monks = countMonks(t);
  const addressDisplay = t.address
    ? `<a href="${esc(t.map_url || mapUrl(t.address))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(t.address)}</a>`
    : `<span style="color:var(--text-mut);font-style:italic">—</span>`;

  return `<article class="card" onclick="openDetail('${esc(t.id)}')">
    <div class="card-bar"></div>
    <div class="card-inner">
      <div class="card-head">
        <div class="card-logo">${logoInner}</div>
        <div class="card-title-wrap">
          <div class="card-name">${esc(t.name)}</div>
          ${t.country ? `<span class="card-country-badge">${flag(t.country)}${esc(t.country)}</span>` : ""}
        </div>
      </div>
      <div class="card-divider"></div>
      <div class="card-rows">
        <div class="card-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg>
          <span>เจ้าอาวาส: <strong>${t.abbot ? esc(t.abbot) : `<span style="color:var(--text-mut);font-style:italic">—</span>`}</strong></span>
        </div>
        <div class="card-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>พระประจำวัด: <strong>${monks} รูป</strong></span>
        </div>
        <div class="card-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${addressDisplay}</span>
        </div>
      </div>
      <button class="detail-btn" onclick="event.stopPropagation();openDetail('${esc(t.id)}')">
        ดูรายละเอียดเพิ่มเติม
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  </article>`;
}

/* ============================================================
   Detail modal
   ============================================================ */
function openDetail(id) {
  const t = TEMPLES.find(x => x.id === id); if (!t) return;
  currentTemple = t;
  const monks  = splitMonks(t.monks);
  const evs    = EVENTS.filter(e => e.temple_id === t.id);
  const addr   = t.address || "";
  const murl   = t.map_url || (addr ? mapUrl(addr) : "");

  // ── Abbot photo ──
  const personSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg>`;
  const abbotEl = t.abbot_photo
    ? `<img class="modal-abbot-img" src="${esc(t.abbot_photo)}" alt="เจ้าอาวาส" onerror="this.outerHTML='<div class=\\'modal-abbot-img\\'>${personSVG.replace(/"/g,"'")}</div>'">`
    : `<div class="modal-abbot-img">${personSVG}</div>`;

  // ── Social links ──
  const socialDefs = [
    { key:"facebook",  cls:"social-fb",  label:"Facebook",
      icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>` },
    { key:"line",      cls:"social-line", label:"LINE",
      icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.88 10.34C21.88 5.63 17.17 2 11.44 2S1 5.63 1 10.34c0 4.27 3.79 7.85 8.91 8.53.35.07.82.23.94.52.11.27.07.69.03.96l-.15.91c-.04.27-.21 1.07.94.58 1.14-.48 6.17-3.63 8.42-6.22A7.56 7.56 0 0 0 21.88 10.34z"/></svg>` },
    { key:"youtube",   cls:"social-yt",  label:"YouTube",
      icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12z"/></svg>` },
    { key:"instagram", cls:"social-ig",  label:"Instagram",
      icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>` },
    { key:"website",   cls:"social-web", label:"เว็บไซต์",
      icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
  ];
  const socialHTML = socialDefs.filter(s => t[s.key]).map(s =>
    `<a href="${esc(t[s.key])}" target="_blank" rel="noopener" class="social-btn ${s.cls}" title="${s.label}">${s.icon}<span>${s.label}</span></a>`
  ).join("");

  // ── Info cards ──
  const infoCards = [
    addr && `<div class="modal-info-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <div><span class="info-label">ที่อยู่</span><span class="info-val">${esc(addr)}</span></div>
    </div>`,
    t.phone && `<div class="modal-info-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .37 1.96.72 2.88a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.2-1.29a2 2 0 0 1 2.11-.45c.92.35 1.88.59 2.88.72A2 2 0 0 1 22 16.92z"/></svg>
      <div><span class="info-label">โทรศัพท์</span><a class="info-val" href="tel:${esc(String(t.phone).replace(/\s/g,""))}">${esc(t.phone)}</a></div>
    </div>`,
    t.website && `<div class="modal-info-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      <div><span class="info-label">เว็บไซต์</span><a class="info-val" href="${esc(t.website)}" target="_blank" rel="noopener">${esc(t.website.replace(/^https?:\/\//,""))}</a></div>
    </div>`,
  ].filter(Boolean).join("");

  $("#detailModal").innerHTML = `
    <button class="modal-close" data-close="detailOverlay" aria-label="ปิด">✕</button>

    <div class="modal-hero">
      ${abbotEl}
      <div class="modal-temple">${esc(t.name)}</div>
      ${t.country ? `<div class="modal-country-badge">${flag(t.country)}${esc(t.country)}</div>` : ""}
      ${t.abbot ? `<div class="modal-abbot-label">เจ้าอาวาส</div><div class="modal-abbot-name">${esc(t.abbot)}</div>` : ""}
    </div>

    <div class="modal-body">
      ${infoCards ? `<div class="modal-info-grid">${infoCards}</div>` : ""}
      ${socialHTML ? `<div class="modal-socials">${socialHTML}</div>` : ""}

      ${murl ? `<a href="${esc(murl)}" target="_blank" rel="noopener" class="map-btn">
        <svg class="map-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        นำทางไปวัด
        <svg class="map-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>` : ""}

      <div class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        พระประจำวัด
      </div>
      <div class="monk-list">
        ${monks.length ? monks.map(m => `<div class="monk-item"><span class="dot"></span>${esc(m)}</div>`).join("")
          : `<div class="no-events">— ยังไม่มีข้อมูลรายชื่อพระ —</div>`}
      </div>

      <div class="event-head">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          งานบุญของวัด
        </div>
        <span class="hr"></span>
        <button class="add-event-btn" onclick="openEventForm()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> เพิ่มงานบุญ
        </button>
      </div>
      <div class="timeline">
        ${evs.length ? evs.map(eventHTML).join("") : `<div class="no-events">— ยังไม่มีงานบุญที่บันทึกไว้ —</div>`}
      </div>
    </div>`;

  $("#detailModal").querySelectorAll("[data-close]").forEach(el =>
    el.addEventListener("click", () => closeOverlay(el.dataset.close)));
  openOverlay("detailOverlay");
}

function eventHTML(e) {
  return `<div class="event-card">
    ${e.date ? `<div class="event-date">${esc(e.date)}</div>` : ""}
    <div class="event-title">${esc(e.title)}</div>
    ${e.description ? `<div class="event-desc">${esc(e.description)}</div>` : ""}
    <div class="event-actions">
      <button class="mini-btn" onclick='openEventForm(${JSON.stringify(e)})'>แก้ไข</button>
      <button class="mini-btn del" onclick="deleteEvent('${esc(e.id)}')">ลบ</button>
    </div>
  </div>`;
}

/* ============================================================
   Login / Admin toggle
   ============================================================ */
function openLogin() {
  if (isAdmin) { openAdmin(); return; }
  $("#pwInput").value = ""; openOverlay("loginOverlay"); setTimeout(() => $("#pwInput").focus(), 100);
}
function tryLogin() {
  if ($("#pwInput").value === CONFIG.ADMIN_PASSWORD) {
    setAdmin(true);
    closeOverlay("loginOverlay");
    const btn = $("#adminBtn");
    btn.classList.remove("login-anim");
    void btn.offsetWidth;
    btn.classList.add("login-anim");
    setTimeout(() => btn.classList.remove("login-anim"), 800);
    toast("เข้าสู่โหมดแอดมินแล้ว ยินดีต้อนรับ 🙏");
    setTimeout(openAdmin, 300);
  } else {
    toast("รหัสผ่านไม่ถูกต้อง", true);
    const inp = $("#pwInput");
    inp.classList.remove("shake");
    void inp.offsetWidth;
    inp.classList.add("shake");
    setTimeout(() => inp.classList.remove("shake"), 500);
  }
}
function setAdmin(on) {
  isAdmin = on; document.body.classList.toggle("admin-on", on);
  $("#adminBtn").classList.toggle("active", on);
}
function adminLogout() {
  setAdmin(false); closeOverlay("adminOverlay"); toast("ออกจากโหมดแอดมินแล้ว");
}

/* ============================================================
   Admin panel
   ============================================================ */
function openAdmin() {
  renderAdminList(""); openOverlay("adminOverlay");
}

function renderAdminList(filter) {
  const q = (filter || "").toLowerCase();
  const list = q ? TEMPLES.filter(t => (t.name + t.country).toLowerCase().includes(q)) : TEMPLES;
  const el = $("#adminList");
  if (!list.length) {
    el.innerHTML = `<div style="padding:16px 14px;color:var(--text-dim);font-size:.88rem;">ไม่พบวัด</div>`;
    return;
  }
  el.innerHTML = list.map(t => `
    <div class="admin-item" data-id="${esc(t.id)}" onclick="openTempleForm('${esc(t.id)}')">
      <div class="admin-item-name">${esc(t.name)}</div>
      <div class="admin-item-country">${esc(t.country || "—")}</div>
    </div>`).join("");
}

function newTempleForm() {
  const blank = { id: uid(), name:"", country:"", abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:"", monk_count:"" };
  _showForm(blank, true);
}

function openTempleForm(id) {
  const t = TEMPLES.find(x => x.id === id); if (!t) return;
  _showForm(t, false);
}

function _showForm(t, isNew) {
  // highlight active in sidebar
  document.querySelectorAll(".admin-item").forEach(el => el.classList.remove("active"));
  if (!isNew) {
    const el = document.querySelector(`.admin-item[data-id="${t.id}"]`);
    if (el) el.classList.add("active");
  }

  $("#adminFormTitle").textContent = isNew ? "เพิ่มวัดใหม่" : esc(t.name) || "แก้ไขวัด";
  $("#adminHeadActions").innerHTML = !isNew
    ? `<button class="btn sm danger" onclick="deleteTemple('${esc(t.id)}')">ลบวัดนี้</button>`
    : "";

  $("#adminFormBody").innerHTML = `
    <div class="admin-form-grid">
      <div class="form-field span-2">
        <label>ชื่อวัด *</label>
        <input id="af_name" type="text" value="${esc(t.name)}" placeholder="เช่น วัดพระธรรมกายลอนดอน">
      </div>
      <div class="form-field">
        <label>ประเทศ</label>
        <input id="af_country" type="text" value="${esc(t.country)}" placeholder="เช่น สหราชอาณาจักร">
      </div>
      <div class="form-field">
        <label>โทรศัพท์</label>
        <input id="af_phone" type="text" value="${esc(t.phone)}" placeholder="+44 20 1234 5678">
      </div>
      <div class="form-field">
        <label>เจ้าอาวาส</label>
        <input id="af_abbot" type="text" value="${esc(t.abbot)}" placeholder="พระ...">
      </div>
      <div class="form-field">
        <label>จำนวนพระ (ระบุตัวเลขหรือปล่อยว่าง)</label>
        <input id="af_monk_count" type="number" min="0" value="${esc(t.monk_count)}" placeholder="0">
      </div>
      <div class="form-field span-2">
        <label>ที่อยู่</label>
        <input id="af_address" type="text" value="${esc(t.address)}" placeholder="เลขที่ ถนน เมือง ประเทศ">
      </div>
      <div class="form-field span-2">
        <label>รายชื่อพระ (คั่นด้วย ; หรือขึ้นบรรทัดใหม่)</label>
        <textarea id="af_monks" rows="3" placeholder="พระมหา ก.&#10;พระ ข.&#10;พระ ค.">${esc(t.monks)}</textarea>
      </div>
      <div class="form-field">
        <label>URL รูปโลโก้วัด</label>
        <input id="af_logo" type="text" value="${esc(t.logo)}" placeholder="https://...">
      </div>
      <div class="form-field">
        <label>URL รูปเจ้าอาวาส</label>
        <input id="af_abbot_photo" type="text" value="${esc(t.abbot_photo)}" placeholder="https://...">
      </div>
      <div class="form-field span-2">
        <label>URL Google Maps (ถ้าไม่ระบุจะสร้างจากที่อยู่อัตโนมัติ)</label>
        <input id="af_map_url" type="text" value="${esc(t.map_url||'')}" placeholder="https://maps.google.com/...">
      </div>
      <div class="form-field span-2">
        <label>เว็บไซต์วัด</label>
        <input id="af_website" type="text" value="${esc(t.website||'')}" placeholder="https://...">
      </div>
      <div class="form-field">
        <label>Facebook</label>
        <input id="af_facebook" type="text" value="${esc(t.facebook||'')}" placeholder="https://facebook.com/...">
      </div>
      <div class="form-field">
        <label>LINE</label>
        <input id="af_line" type="text" value="${esc(t.line||'')}" placeholder="https://line.me/...">
      </div>
      <div class="form-field">
        <label>YouTube</label>
        <input id="af_youtube" type="text" value="${esc(t.youtube||'')}" placeholder="https://youtube.com/...">
      </div>
      <div class="form-field">
        <label>Instagram</label>
        <input id="af_instagram" type="text" value="${esc(t.instagram||'')}" placeholder="https://instagram.com/...">
      </div>
      <input type="hidden" id="af_id" value="${esc(t.id)}">
    </div>
    <div class="admin-form-foot">
      <span style="font-size:.82rem;color:var(--text-dim)">* จำเป็นต้องกรอก</span>
      <div style="display:flex;gap:10px">
        <button class="btn sm" onclick="closeOverlay('adminOverlay')">ยกเลิก</button>
        <button class="btn sm primary" onclick="saveTemple(${isNew})">บันทึก</button>
      </div>
    </div>`;

  setTimeout(() => $("#af_name").focus(), 80);
}

function saveTemple(isNew) {
  const name = $("#af_name").value.trim();
  if (!name) { toast("กรุณากรอกชื่อวัด", true); $("#af_name").focus(); return; }

  const t = {
    id:          $("#af_id").value,
    name,
    country:     $("#af_country").value.trim(),
    abbot:       $("#af_abbot").value.trim(),
    abbot_photo: $("#af_abbot_photo").value.trim(),
    logo:        $("#af_logo").value.trim(),
    address:     $("#af_address").value.trim(),
    map_url:     $("#af_map_url").value.trim(),
    phone:       $("#af_phone").value.trim(),
    monks:       $("#af_monks").value.trim(),
    monk_count:  $("#af_monk_count").value.trim(),
    website:     $("#af_website").value.trim(),
    facebook:    $("#af_facebook").value.trim(),
    line:        $("#af_line").value.trim(),
    youtube:     $("#af_youtube").value.trim(),
    instagram:   $("#af_instagram").value.trim(),
  };

  if (isNew) {
    TEMPLES.push(t);
    toast("เพิ่มวัดใหม่แล้ว");
  } else {
    const idx = TEMPLES.findIndex(x => x.id === t.id);
    if (idx > -1) TEMPLES[idx] = t; else TEMPLES.push(t);
    toast("บันทึกข้อมูลแล้ว");
  }

  saveTemplesToStorage();
  render();
  renderAdminList($("#adminSearch").value);
  $("#adminFormTitle").textContent = esc(t.name);
  // re-highlight
  document.querySelectorAll(".admin-item").forEach(el => el.classList.remove("active"));
  const el = document.querySelector(`.admin-item[data-id="${t.id}"]`);
  if (el) el.classList.add("active");
}

function deleteTemple(id) {
  const t = TEMPLES.find(x => x.id === id);
  if (!t) return;
  if (!confirm(`ต้องการลบ "${t.name}" ใช่หรือไม่?\n(การดำเนินการนี้ไม่สามารถยกเลิกได้)`)) return;
  TEMPLES = TEMPLES.filter(x => x.id !== id);
  saveTemplesToStorage();
  render();
  renderAdminList($("#adminSearch").value);
  $("#adminFormTitle").textContent = "เลือกวัดจากรายการ";
  $("#adminHeadActions").innerHTML = "";
  $("#adminFormBody").innerHTML = `<div class="admin-placeholder">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3;margin-bottom:14px"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>
    <p>เลือกวัดจากรายการด้านซ้าย<br>หรือกด <strong>+ เพิ่ม</strong> เพื่อเพิ่มวัดใหม่</p>
  </div>`;
  toast("ลบวัดแล้ว");
}

/* ============================================================
   Events (งานบุญ)
   ============================================================ */
function openEventForm(ev) {
  if (!isAdmin) return;
  editingEvent = ev || null;
  $("#eventFormTitle").textContent = ev ? "แก้ไขงานบุญ" : "เพิ่มงานบุญ";
  $("#eventFormHint").textContent = currentTemple ? currentTemple.name : "";
  $("#evDate").value  = ev?.date || "";
  $("#evTitle").value = ev?.title || "";
  $("#evDesc").value  = ev?.description || "";
  openOverlay("eventOverlay"); setTimeout(() => $("#evDate").focus(), 100);
}

function saveEvent() {
  const title = $("#evTitle").value.trim();
  if (!title) { toast("กรุณากรอกชื่องานบุญ", true); return; }
  const payload = {
    id: editingEvent?.id || ("e" + Date.now()),
    temple_id: currentTemple.id,
    date: $("#evDate").value.trim(),
    title, description: $("#evDesc").value.trim(),
  };
  if (editingEvent) {
    const i = EVENTS.findIndex(e => e.id === payload.id); if (i > -1) EVENTS[i] = payload;
  } else {
    EVENTS.push(payload);
  }
  closeOverlay("eventOverlay"); openDetail(currentTemple.id); toast("บันทึกงานบุญแล้ว");
}

function deleteEvent(id) {
  if (!confirm("ต้องการลบงานบุญนี้ใช่หรือไม่?")) return;
  EVENTS = EVENTS.filter(e => e.id !== id);
  openDetail(currentTemple.id); toast("ลบงานบุญแล้ว");
}

/* ============================================================
   Clock
   ============================================================ */
function updateClock() {
  const now = new Date();
  const tz  = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const te = $("#clockTime"), de = $("#clockDate"), ze = $("#clockTz");
  if (te) te.textContent = now.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false });
  if (de) de.textContent = now.toLocaleDateString("th-TH", { weekday:"short", day:"numeric", month:"short", year:"numeric" });
  if (ze) ze.textContent = "🌍 " + tz.replace(/_/g," ");
}

/* ============================================================
   Overlay helpers
   ============================================================ */
function openOverlay(id)  { $("#" + id).classList.add("open");    document.body.style.overflow = "hidden"; }
function closeOverlay(id) { $("#" + id).classList.remove("open"); document.body.style.overflow = ""; }

/* ============================================================
   Theme
   ============================================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("#iconMoon").style.display = theme === "dark" ? "block" : "none";
  $("#iconSun").style.display  = theme === "dark" ? "none"  : "block";
  try { localStorage.setItem("temple-theme", theme); } catch(e) {}
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
}

/* ============================================================
   Init
   ============================================================ */
(function init() {
  let saved = "dark";
  try { saved = localStorage.getItem("temple-theme") || "dark"; } catch(e) {}
  applyTheme(saved);

  $("#themeBtn").onclick   = toggleTheme;
  $("#adminBtn").onclick   = openLogin;
  $("#pwSubmit").onclick   = tryLogin;
  $("#evSave").onclick     = saveEvent;
  $("#pwInput").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
  $("#search").addEventListener("input", e => { searchQuery = e.target.value; render(); });
  $("#countrySelect").addEventListener("change", e => { activeCountry = e.target.value; render(); });
  $("#sortSelect").addEventListener("change", e => { sortBy = e.target.value; render(); });

  const st = $("#scrollTop");
  st.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  window.addEventListener("scroll", () => st.classList.toggle("show", window.scrollY > 400));

  document.querySelectorAll("[data-close]").forEach(el =>
    el.addEventListener("click", () => closeOverlay(el.dataset.close)));
  document.querySelectorAll(".overlay").forEach(ov =>
    ov.addEventListener("click", e => { if (e.target === ov) closeOverlay(ov.id); }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".overlay.open").forEach(o => closeOverlay(o.id));
  });

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Footer social links
  const socialDefs = [
    { key:"facebook",  icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`, label:"Facebook" },
    { key:"youtube",   icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12z"/></svg>`, label:"YouTube" },
    { key:"line",      icon:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.88 10.34C21.88 5.63 17.17 2 11.44 2S1 5.63 1 10.34c0 4.27 3.79 7.85 8.91 8.53.35.07.82.23.94.52.11.27.07.69.03.96l-.15.91c-.04.27-.21 1.07.94.58 1.14-.48 6.17-3.63 8.42-6.22A7.56 7.56 0 0 0 21.88 10.34z"/></svg>`, label:"LINE" },
    { key:"instagram", icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`, label:"Instagram" },
  ];
  const fs = document.getElementById("footerSocials");
  const note = document.getElementById("footerSocialNote");
  if (fs && CONFIG.SOCIAL) {
    const links = socialDefs.filter(s => CONFIG.SOCIAL[s.key]);
    fs.innerHTML = links
      .map(s => `<a href="${esc(CONFIG.SOCIAL[s.key])}" target="_blank" rel="noopener" class="footer-social-btn" title="${s.label}" aria-label="${s.label}">${s.icon}</a>`)
      .join("");
    if (note) note.style.display = links.length ? "none" : "block";
  }

  loadData();
})();
