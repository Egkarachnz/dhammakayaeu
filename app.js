/* ============================================================
   สถานะ + เครื่องมือช่วย
   ============================================================ */
let TEMPLES = [], EVENTS = [], isAdmin = false, currentTemple = null, editingEvent = null;
let activeCountry = "ทั้งหมด", searchQuery = "";

const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const mapUrl = a => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a||"");
const splitMonks = s => String(s||"").split(/[;\n]/).map(x=>x.trim()).filter(Boolean);

function toast(msg, isErr){
  const t=$("#toast"); t.textContent=msg; t.className="toast show"+(isErr?" err":"");
  clearTimeout(t._tm); t._tm=setTimeout(()=>t.className="toast"+(isErr?" err":""),3200);
}

/* ============================================================
   โหลดข้อมูลจาก data.js โดยตรง — ไม่ต้องเชื่อม Google Sheets
   ============================================================ */
function loadData(){
  TEMPLES = (typeof DATA_TEMPLES !== "undefined") ? DATA_TEMPLES.filter(t=>t.name) : [];
  EVENTS  = (typeof DATA_EVENTS  !== "undefined") ? DATA_EVENTS  : [];
  render();
}
async function refreshEvents(){
  EVENTS = (typeof DATA_EVENTS !== "undefined") ? DATA_EVENTS : [];
  if(currentTemple) openDetail(currentTemple.id, true);
}

/* ============================================================
   เรนเดอร์การ์ด + ตัวกรอง
   ============================================================ */
function countMonks(t){
  if(t.monk_count && !isNaN(+t.monk_count)) return +t.monk_count;
  return splitMonks(t.monks).length;
}
function uniqueCountries(){
  const seen=[]; TEMPLES.forEach(t=>{ if(t.country && !seen.includes(t.country)) seen.push(t.country); });
  return seen;
}
function render(){
  const countries = uniqueCountries();

  // ดรอปดาวน์กรองประเทศ
  const sel = $("#countrySelect");
  sel.innerHTML = `<option value="ทั้งหมด">ทุกประเทศ</option>` +
    countries.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  sel.value = activeCountry;

  // แถบสรุป
  $("#summaryStat").textContent = `${TEMPLES.length} วัด · ${countries.length} ประเทศ`;

  const q=searchQuery.trim().toLowerCase();
  const list=TEMPLES.filter(t=>{
    const okC = activeCountry==="ทั้งหมด" || t.country===activeCountry;
    const okQ = !q || [t.name,t.country,t.abbot,t.address].some(v=>String(v||"").toLowerCase().includes(q));
    return okC && okQ;
  });

  $("#metaLine").innerHTML = `พบ ${list.length} วัด`;

  if(!list.length){
    $("#grid").innerHTML = `<div class="empty">ไม่พบวัดที่ตรงกับเงื่อนไข</div>`;
    return;
  }

  // จัดกลุ่มตามประเทศ
  const groups = countries.map(c=>({country:c, items:list.filter(t=>t.country===c)})).filter(g=>g.items.length);
  const noCountry = list.filter(t=>!t.country);
  if(noCountry.length) groups.push({country:"อื่น ๆ", items:noCountry});

  $("#grid").innerHTML = groups.map(g=>`
    <section class="country-group">
      <div class="group-head">
        <span class="group-name">${esc(g.country)}</span>
        <span class="group-line"></span>
        <span class="group-count">${g.items.length} วัด</span>
      </div>
      <div class="group-grid">${g.items.map(cardHTML).join("")}</div>
    </section>`).join("");
}
function logoHTML(t){
  if(t.logo) return `<img class="logo" src="${esc(t.logo)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'logo',textContent:'${esc((t.name||'?').trim()[0]||'?')}'}))">`;
  return `<div class="logo">${esc((t.name||"?").trim()[0]||"?")}</div>`;
}
function cardHTML(t){
  return `<article class="card">
    <div class="card-top">
      ${logoHTML(t)}
      <div><div class="card-name">${esc(t.name)}</div>
      ${t.country?`<div class="card-country">${esc(t.country)}</div>`:""}</div>
    </div>
    ${t.abbot?`<div class="info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg><span>เจ้าอาวาส: <strong>${esc(t.abbot)}</strong></span></div>`:""}
    ${t.address?`<div class="info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><a href="${esc(t.map_url||mapUrl(t.address))}" target="_blank" rel="noopener">${esc(t.address)}</a></div>`:""}
    ${t.phone?`<div class="info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .37 1.96.72 2.88a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.2-1.29a2 2 0 0 1 2.11-.45c.92.35 1.88.59 2.88.72A2 2 0 0 1 22 16.92z"/></svg><a href="tel:${esc(String(t.phone).replace(/\s/g,''))}">${esc(t.phone)}</a></div>`:""}
    <div class="info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>พระประจำวัด: <strong>${countMonks(t)} รูป</strong></span></div>
    <button class="detail-btn" onclick="openDetail('${esc(t.id)}')">
      ดูรายละเอียดเพิ่มเติม
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  </article>`;
}

/* ============================================================
   โมดัลรายละเอียดวัด
   ============================================================ */
function openDetail(id, keepScroll){
  const t = TEMPLES.find(x=>x.id===id); if(!t) return;
  currentTemple = t;
  const monks = splitMonks(t.monks);
  const evs = EVENTS.filter(e=>e.temple_id===t.id);

  const abbotPhoto = t.abbot_photo
    ? `<img class="abbot-photo" src="${esc(t.abbot_photo)}" alt="" onerror="this.outerHTML='<div class=\\'abbot-photo\\'>${esc((t.abbot||'?')[0]||'?')}</div>'">`
    : `<div class="abbot-photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg></div>`;

  $("#detailModal").innerHTML = `
    <button class="modal-close" data-close="detailOverlay" aria-label="ปิด">✕</button>
    <div class="modal-hero">
      ${abbotPhoto}
      <div class="modal-temple">${esc(t.name)}</div>
      ${t.country?`<div class="modal-country">${esc(t.country)}</div>`:""}
      ${t.abbot?`<div class="modal-abbot-label">เจ้าอาวาส</div><div class="modal-abbot-name">${esc(t.abbot)}</div>`:""}
    </div>
    <div class="modal-body">
      <div class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        พระประจำวัด
      </div>
      <div class="monk-list">
        ${monks.length ? monks.map(m=>`<div class="monk-item"><span class="dot"></span>${esc(m)}</div>`).join("")
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
        ${evs.length ? evs.map(eventHTML).join("")
          : `<div class="no-events">— ยังไม่มีงานบุญที่บันทึกไว้ —</div>`}
      </div>
    </div>`;
  openOverlay("detailOverlay");
}
function eventHTML(e){
  return `<div class="event-card">
    ${e.date?`<div class="event-date">${esc(e.date)}</div>`:""}
    <div class="event-title">${esc(e.title)}</div>
    ${e.description?`<div class="event-desc">${esc(e.description)}</div>`:""}
    <div class="event-actions">
      <button class="mini-btn" onclick='openEventForm(${JSON.stringify(e)})'>แก้ไข</button>
      <button class="mini-btn del" onclick="deleteEvent('${esc(e.id)}')">ลบ</button>
    </div>
  </div>`;
}

/* ============================================================
   ระบบแอดมิน
   ============================================================ */
function openLogin(){
  if(isAdmin){ setAdmin(false); toast("ออกจากโหมดแอดมินแล้ว"); return; }
  $("#pwInput").value=""; openOverlay("loginOverlay"); setTimeout(()=>$("#pwInput").focus(),100);
}
function tryLogin(){
  if($("#pwInput").value === CONFIG.ADMIN_PASSWORD){
    setAdmin(true); closeOverlay("loginOverlay"); toast("เข้าสู่โหมดแอดมินแล้ว");
  }else toast("รหัสผ่านไม่ถูกต้อง", true);
}
function setAdmin(on){
  isAdmin=on; document.body.classList.toggle("admin-on",on);
  $("#adminBtn").classList.toggle("active",on);
}

function openEventForm(ev){
  if(!isAdmin) return;
  editingEvent = ev || null;
  $("#eventFormTitle").textContent = ev ? "แก้ไขงานบุญ" : "เพิ่มงานบุญ";
  $("#eventFormHint").textContent = currentTemple ? currentTemple.name : "";
  $("#evDate").value  = ev?.date || "";
  $("#evTitle").value = ev?.title || "";
  $("#evDesc").value  = ev?.description || "";
  openOverlay("eventOverlay"); setTimeout(()=>$("#evDate").focus(),100);
}

async function saveEvent(){
  const title=$("#evTitle").value.trim();
  if(!title){ toast("กรุณากรอกชื่องานบุญ", true); return; }
  const payload={
    id: editingEvent?.id || ("e"+Date.now()),
    temple_id: currentTemple.id,
    date: $("#evDate").value.trim(),
    title, description: $("#evDesc").value.trim(),
  };
  const action = editingEvent ? "edit" : "add";

  // บันทึกในหน่วยความจำ (ไม่มี Apps Script)
  if(!CONFIG.ADMIN_URL){
    if(action==="add") EVENTS.push(payload);
    else { const i=EVENTS.findIndex(e=>e.id===payload.id); if(i>-1) EVENTS[i]=payload; }
    closeOverlay("eventOverlay"); openDetail(currentTemple.id);
    toast("บันทึกชั่วคราว — เพิ่มข้อมูลถาวรใน data.js");
    return;
  }
  await sendToScript({action, secret:CONFIG.ADMIN_PASSWORD, event:payload}, "บันทึกงานบุญแล้ว");
  closeOverlay("eventOverlay");
}

async function deleteEvent(id){
  if(!confirm("ต้องการลบงานบุญนี้ใช่หรือไม่?")) return;
  if(!CONFIG.ADMIN_URL){
    EVENTS = EVENTS.filter(e=>e.id!==id);
    openDetail(currentTemple.id); toast("ลบแล้ว"); return;
  }
  await sendToScript({action:"delete", secret:CONFIG.ADMIN_PASSWORD, event:{id}}, "ลบงานบุญแล้ว");
}

async function sendToScript(body, okMsg){
  try{
    toast("กำลังบันทึก…");
    await fetch(CONFIG.ADMIN_URL, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"}, // ใช้ text/plain เพื่อเลี่ยง CORS preflight
      body: JSON.stringify(body),
    });
    // อ่านผลตอบกลับจาก Apps Script ข้ามโดเมนอาจถูกบล็อก จึงรอแล้วดึงข้อมูลใหม่จากชีตเพื่อยืนยัน
    setTimeout(()=>{ refreshEvents(); toast(okMsg); }, 1200);
  }catch(err){
    toast("บันทึกไม่สำเร็จ: "+err.message, true);
  }
}

/* ============================================================
   โอเวอร์เลย์ + ธีม + อีเวนต์
   ============================================================ */
function openOverlay(id){ $("#"+id).classList.add("open"); document.body.style.overflow="hidden"; }
function closeOverlay(id){ $("#"+id).classList.remove("open"); document.body.style.overflow=""; }

function applyTheme(theme){
  document.documentElement.setAttribute("data-theme",theme);
  $("#iconMoon").style.display = theme==="dark"?"block":"none";
  $("#iconSun").style.display  = theme==="dark"?"none":"block";
  try{ localStorage.setItem("temple-theme",theme); }catch(e){}
}
function toggleTheme(){
  const next = document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
  applyTheme(next);
}

// เริ่มต้น
(function init(){
  let saved="dark";
  try{ saved = localStorage.getItem("temple-theme") || "dark"; }catch(e){}
  applyTheme(saved);

  $("#themeBtn").onclick = toggleTheme;
  $("#adminBtn").onclick = openLogin;
  $("#pwSubmit").onclick = tryLogin;
  $("#pwInput").addEventListener("keydown",e=>{ if(e.key==="Enter") tryLogin(); });
  $("#evSave").onclick = saveEvent;
  $("#search").addEventListener("input",e=>{ searchQuery=e.target.value; render(); });

  $("#countrySelect").addEventListener("change",e=>{ activeCountry=e.target.value; render(); });

  // ปุ่มเลื่อนขึ้นบนสุด
  const st=$("#scrollTop");
  st.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
  window.addEventListener("scroll",()=>st.classList.toggle("show", window.scrollY>400));

  document.querySelectorAll("[data-close]").forEach(el=>
    el.addEventListener("click",()=>closeOverlay(el.dataset.close)));
  document.querySelectorAll(".overlay").forEach(ov=>
    ov.addEventListener("click",e=>{ if(e.target===ov) closeOverlay(ov.id); }));
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") document.querySelectorAll(".overlay.open").forEach(o=>closeOverlay(o.id));
  });

  loadData();
})();
