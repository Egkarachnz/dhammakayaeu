/* ============================================================
   State
   ============================================================ */
let TEMPLES = [], EVENTS = [], isAdmin = false, currentTemple = null, editingEvent = null;
let activeCountry = "ทั้งหมด", searchQuery = "";

const STORAGE_KEY = "dhammakaya-temples-v1";

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

function render() {
  const countries = uniqueCountries();

  const sel = $("#countrySelect");
  sel.innerHTML = `<option value="ทั้งหมด">ทุกประเทศ</option>` +
    countries.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  sel.value = activeCountry;

  $("#summaryStat").textContent = `${TEMPLES.length} วัด · ${countries.length} ประเทศ`;

  const q = searchQuery.trim().toLowerCase();
  const list = TEMPLES.filter(t => {
    const okC = activeCountry === "ทั้งหมด" || t.country === activeCountry;
    const okQ = !q || [t.name, t.country, t.abbot, t.address].some(v => String(v || "").toLowerCase().includes(q));
    return okC && okQ;
  });

  $("#metaLine").innerHTML = `พบ ${list.length} วัด`;

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
          ${t.country ? `<span class="card-country-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:11px;height:11px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            ${esc(t.country)}
          </span>` : ""}
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
  const monks = splitMonks(t.monks);
  const evs = EVENTS.filter(e => e.temple_id === t.id);

  const abbotPhoto = t.abbot_photo
    ? `<img class="abbot-photo" src="${esc(t.abbot_photo)}" alt="" onerror="this.outerHTML='<div class=\\'abbot-photo\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.6\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M4 21v-1a7 7 0 0 1 14 0v1\\'/></svg></div>'">`
    : `<div class="abbot-photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg></div>`;

  $("#detailModal").innerHTML = `
    <button class="modal-close" data-close="detailOverlay" aria-label="ปิด">✕</button>
    <div class="modal-hero">
      ${abbotPhoto}
      <div class="modal-temple">${esc(t.name)}</div>
      ${t.country ? `<div class="modal-country">${esc(t.country)}</div>` : ""}
      ${t.abbot ? `<div class="modal-abbot-label">เจ้าอาวาส</div><div class="modal-abbot-name">${esc(t.abbot)}</div>` : ""}
    </div>
    <div class="modal-body">
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
    setAdmin(true); closeOverlay("loginOverlay"); toast("เข้าสู่โหมดแอดมินแล้ว");
    openAdmin();
  } else toast("รหัสผ่านไม่ถูกต้อง", true);
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
        <input id="af_map_url" type="text" value="${esc(t.map_url)}" placeholder="https://maps.google.com/...">
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

  loadData();
})();
