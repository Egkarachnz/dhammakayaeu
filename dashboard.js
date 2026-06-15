/* ============================================================
   dashboard.js — Dashboard สถิติ + นำเข้า Excel/Sheets + ส่งออก A4
   ต้องโหลด: chart.js, xlsx, html2canvas, jspdf, jszip, config.js, data.js, shared.js
   ============================================================ */
(function () {
  "use strict";
  const S = window.Shared;
  const $ = s => document.querySelector(s);

  const TEMPLE_COLS = [
    "id", "name", "country", "abbot", "deputy", "abbot_photo", "logo", "address",
    "map_url", "phone", "monks", "monk_count", "website",
    "facebook", "line", "youtube", "instagram", "established", "history", "gallery"
  ];

  let TEMPLES = [], EVENTS = [];
  let importRows = null;                 // ข้อมูลที่อ่านจากไฟล์ รอยืนยัน
  let chartCountry = null, chartMonks = null;

  /* ── Toast ── */
  function toast(msg, isErr) {
    const t = $("#toast"); t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(t._tm); t._tm = setTimeout(() => t.className = "toast" + (isErr ? " err" : ""), 3600);
  }

  /* ── ส่งข้อมูลขึ้นคลาวด์ ── */
  async function cloudSend(type, action, payload) {
    if (!S.CLOUD_URL) return { ok: true, local: true };
    const body = Object.assign({ secret: CONFIG.ADMIN_PASSWORD, type, action }, payload);
    const res = await fetch(S.CLOUD_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body),
    });
    return await res.json();
  }

  /* ── ดาวน์โหลด blob ── */
  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const canvasToBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));

  /* ============================================================
     ประตูรหัสผ่าน
     ============================================================ */
  function isUnlocked() {
    try { return Date.now() < +(localStorage.getItem("dh-admin-until") || 0); } catch (e) { return false; }
  }
  function unlock() {
    try { localStorage.setItem("dh-admin-until", String(Date.now() + 8 * 3600 * 1000)); } catch (e) {}
    $("#gateOverlay").classList.remove("open");
    $("#dashMain").style.display = "block";
    start();
  }
  function tryGate() {
    if ($("#gatePw").value === CONFIG.ADMIN_PASSWORD) unlock();
    else toast("รหัสผ่านไม่ถูกต้อง", true);
  }

  /* ── ธีม ── */
  function syncThemeIcons() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    $("#iconMoon").style.display = dark ? "block" : "none";
    $("#iconSun").style.display  = dark ? "none"  : "block";
  }

  /* ============================================================
     แท็บ
     ============================================================ */
  function initTabs() {
    document.querySelectorAll(".dash-tab").forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll(".dash-tab").forEach(x => x.classList.remove("active"));
        document.querySelectorAll(".dash-panel").forEach(x => x.classList.remove("active"));
        tab.classList.add("active");
        $("#panel-" + tab.dataset.tab).classList.add("active");
      };
    });
    if (location.hash === "#import") document.querySelector('.dash-tab[data-tab="import"]')?.click();
    if (location.hash === "#export") document.querySelector('.dash-tab[data-tab="export"]')?.click();
  }

  /* ============================================================
     สถิติ
     ============================================================ */
  function avgAgeYears() {
    const ages = TEMPLES.map(t => S.templeAge(t.established)).filter(Boolean)
      .map(a => a.years + a.months / 12);
    if (!ages.length) return null;
    return ages.reduce((s, x) => s + x, 0) / ages.length;
  }

  const COMPLETE_FIELDS = [
    { key: "abbot", label: "เจ้าอาวาส" }, { key: "address", label: "ที่อยู่" },
    { key: "phone", label: "โทรศัพท์" }, { key: "website", label: "เว็บไซต์" },
    { key: "gallery", label: "รูปภาพ" }, { key: "established", label: "วันสร้างวัด" },
    { key: "history", label: "ประวัติ" },
  ];

  function renderStats() {
    const N = TEMPLES.length;
    const countries = [...new Set(TEMPLES.map(t => t.country).filter(Boolean))];
    const totalMonks = TEMPLES.reduce((s, t) => s + S.countMonks(t), 0);
    const avg = avgAgeYears();
    const filledTotal = COMPLETE_FIELDS.reduce((s, f) =>
      s + TEMPLES.filter(t => String(t[f.key] || "").trim()).length, 0);
    const completePct = N ? Math.round(filledTotal / (N * COMPLETE_FIELDS.length) * 100) : 0;

    const cards = [
      { num: N, label: "วัด & ศูนย์ปฏิบัติธรรม" },
      { num: countries.length, label: "ประเทศในยุโรป" },
      { num: totalMonks, label: "พระประจำ (รวม)" },
      { num: EVENTS.length, label: "งานบุญที่บันทึก" },
      { num: avg == null ? "—" : avg.toFixed(1) + " ปี", label: "อายุวัดเฉลี่ย" },
      { num: completePct + "%", label: "ความครบถ้วนข้อมูล" },
    ];
    $("#statGrid").innerHTML = cards.map(c =>
      `<div class="dash-stat"><div class="dash-stat-num">${c.num}</div><div class="dash-stat-label">${c.label}</div></div>`).join("");

    // แถบความครบถ้วน
    $("#completeBars").innerHTML = COMPLETE_FIELDS.map(f => {
      const cnt = TEMPLES.filter(t => String(t[f.key] || "").trim()).length;
      const pct = N ? Math.round(cnt / N * 100) : 0;
      return `<div class="dash-complete-row">
        <span class="lbl">${f.label}</span>
        <span class="dash-bar"><span style="width:${pct}%"></span></span>
        <span class="val">${cnt}/${N}</span>
      </div>`;
    }).join("");

    renderCharts();
  }

  function renderCharts() {
    if (typeof Chart === "undefined") return;
    const css = getComputedStyle(document.documentElement);
    Chart.defaults.color = css.getPropertyValue("--text-dim").trim() || "#6e6e73";
    Chart.defaults.font.family = "'Noto Sans Thai',sans-serif";
    const grid = css.getPropertyValue("--border").trim() || "rgba(0,0,0,.08)";

    const byCountry = {};
    const monksByCountry = {};
    TEMPLES.forEach(t => {
      const c = t.country || "ไม่ระบุ";
      byCountry[c] = (byCountry[c] || 0) + 1;
      monksByCountry[c] = (monksByCountry[c] || 0) + S.countMonks(t);
    });
    const labels = Object.keys(byCountry).sort((a, b) => byCountry[b] - byCountry[a]);

    if (chartCountry) chartCountry.destroy();
    if (chartMonks) chartMonks.destroy();

    const opts = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 60, minRotation: 0 } },
        y: { beginAtZero: true, grid: { color: grid }, ticks: { precision: 0 } },
      },
    };
    chartCountry = new Chart($("#chartCountry"), {
      type: "bar",
      data: { labels, datasets: [{ data: labels.map(c => byCountry[c]), backgroundColor: "rgba(176,125,30,.78)", borderRadius: 6 }] },
      options: opts,
    });
    chartMonks = new Chart($("#chartMonks"), {
      type: "bar",
      data: { labels, datasets: [{ data: labels.map(c => monksByCountry[c]), backgroundColor: "rgba(0,113,227,.72)", borderRadius: 6 }] },
      options: opts,
    });
  }

  /* ── ส่งออกสถิติเป็น PNG/JPG/PDF ── */
  window.exportStats = async function (fmt) {
    const node = $("#dashCapture");
    toast("กำลังสร้างไฟล์…");
    const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: bg, useCORS: true });
      const stamp = new Date().toISOString().slice(0, 10);
      if (fmt === "pdf") {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pw = 210, ph = 297, margin = 8;
        const iw = pw - margin * 2;
        const ih = canvas.height * iw / canvas.width;
        let y = margin, rest = ih;
        const img = canvas.toDataURL("image/jpeg", 0.92);
        // ถ้าสูงเกิน 1 หน้า แบ่งหลายหน้า
        if (ih <= ph - margin * 2) {
          pdf.addImage(img, "JPEG", margin, y, iw, ih);
        } else {
          // วาดทั้งภาพแล้วเลื่อนขึ้นในแต่ละหน้า
          let pos = margin;
          let remaining = ih;
          while (remaining > 0) {
            pdf.addImage(img, "JPEG", margin, pos, iw, ih);
            remaining -= (ph - margin * 2);
            if (remaining > 0) { pdf.addPage(); pos = margin - (ih - remaining); }
          }
        }
        pdf.save(`dhammakaya-stats-${stamp}.pdf`);
      } else {
        const type = fmt === "jpg" ? "image/jpeg" : "image/png";
        const blob = await canvasToBlob(canvas, type, 0.95);
        downloadBlob(blob, `dhammakaya-stats-${stamp}.${fmt}`);
      }
      toast("ดาวน์โหลดสำเร็จ ✓");
    } catch (e) {
      toast("สร้างไฟล์ไม่สำเร็จ: " + (e.message || e), true);
    }
  };

  /* ============================================================
     นำเข้า (Excel / Google Sheets)
     ============================================================ */
  function templeToRow(t) {
    const o = {};
    TEMPLE_COLS.forEach(c => { o[c] = t[c] == null ? "" : t[c]; });
    return o;
  }

  window.downloadTemplate = function (which) {
    let rows;
    if (which === "current") {
      rows = TEMPLES.map(templeToRow);
      if (!rows.length) { toast("ยังไม่มีข้อมูลให้ส่งออก", true); return; }
    } else {
      rows = [
        { id: "", name: "วัดตัวอย่าง (ลบแถวนี้ได้)", country: "เยอรมนี", abbot: "พระอาจารย์ ...", deputy: "",
          abbot_photo: "", logo: "", address: "Musterstr. 1, 12345 Berlin", map_url: "", phone: "+49 ...",
          monks: "พระ ก.; พระ ข.", monk_count: "", website: "", facebook: "", line: "", youtube: "", instagram: "",
          established: "2010-05-15", history: "ความเป็นมาของวัด...", gallery: "" },
      ];
    }
    const ws = XLSX.utils.json_to_sheet(rows, { header: TEMPLE_COLS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Temples");
    XLSX.writeFile(wb, which === "current" ? "dhammakaya-temples.xlsx" : "dhammakaya-template.xlsx");
  };

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!json.length) { toast("ไฟล์ว่างเปล่า", true); return; }
        // normalize keys (trim)
        importRows = json.map(r => {
          const o = {};
          Object.keys(r).forEach(k => { o[String(k).trim()] = String(r[k]).trim(); });
          return o;
        });
        renderImportPreview();
      } catch (err) {
        toast("อ่านไฟล์ไม่สำเร็จ: " + (err.message || err), true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderImportPreview() {
    const rows = importRows;
    const cols = TEMPLE_COLS.filter(c => rows.some(r => r[c] !== undefined && r[c] !== ""));
    const showCols = cols.length ? cols : ["name", "country"];
    const head = showCols.map(c => `<th>${S.esc(c)}</th>`).join("");
    const body = rows.slice(0, 50).map(r =>
      `<tr>${showCols.map(c => `<td title="${S.esc(r[c] || "")}">${S.esc(r[c] || "")}</td>`).join("")}</tr>`).join("");
    const named = rows.filter(r => (r.name || "").trim()).length;

    $("#importResult").innerHTML = `
      <div class="import-preview">
        <table class="import-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      </div>
      <p class="import-note">พบ <b>${rows.length}</b> แถว (มีชื่อวัด ${named} แถว)${rows.length > 50 ? " — แสดงตัวอย่าง 50 แถวแรก" : ""}.
        แถวที่มี <b>id</b> ตรงกับวัดเดิมจะถูกอัปเดต ถ้าไม่มี id จะจับคู่ด้วยชื่อวัด หรือสร้างใหม่</p>
      <div class="dash-toolbar" style="margin-top:14px">
        <button class="export-btn" onclick="cancelImport()">ยกเลิก</button>
        <span class="spacer"></span>
        <button class="export-btn primary" onclick="confirmImport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> ยืนยันนำเข้า ${named} วัด</button>
      </div>`;
  }

  window.cancelImport = function () { importRows = null; $("#importResult").innerHTML = ""; $("#importFile").value = ""; };

  window.confirmImport = async function () {
    if (!importRows) return;
    const valid = importRows.filter(r => (r.name || "").trim());
    if (!valid.length) { toast("ไม่มีแถวที่มีชื่อวัด", true); return; }

    // สร้าง/อัปเดตในข้อมูลปัจจุบัน
    const items = [];
    valid.forEach(r => {
      let existing = null;
      if (r.id) existing = TEMPLES.find(t => t.id === r.id);
      if (!existing) existing = TEMPLES.find(t => (t.name || "").trim() === (r.name || "").trim());
      const t = existing ? Object.assign({}, existing) : { id: "t" + Date.now() + Math.random().toString(36).slice(2, 6) };
      TEMPLE_COLS.forEach(c => { if (c !== "id" && r[c] !== undefined && r[c] !== "") t[c] = r[c]; });
      if (r.id) t.id = r.id;
      if (existing) { const i = TEMPLES.findIndex(x => x.id === existing.id); TEMPLES[i] = t; }
      else TEMPLES.push(t);
      items.push(t);
    });

    try { localStorage.setItem(S.STORAGE_KEY, JSON.stringify(TEMPLES)); } catch (e) {}
    toast(`กำลังบันทึก ${items.length} วัด…`);
    try {
      const r = await cloudSend("temple", "bulkSave", { items });
      if (r && r.ok) toast(`นำเข้าสำเร็จ ${items.length} วัด ✓ (รีเฟรชหน้าแรกเพื่อดูผล)`);
      else toast("บันทึกขึ้นคลาวด์ไม่สำเร็จ (เก็บในเครื่องแล้ว)", true);
    } catch (e) {
      toast("ออฟไลน์: เก็บในเครื่องแล้ว", true);
    }
    importRows = null; $("#importResult").innerHTML = ""; $("#importFile").value = "";
    renderStats();
  };

  function initImport() {
    const drop = $("#importDrop"), input = $("#importFile");
    drop.onclick = () => input.click();
    input.onchange = () => { if (input.files[0]) handleFile(input.files[0]); };
    ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", e => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  }

  /* ============================================================
     ส่งออก A4 (30 วัด) — 2 รูปแบบ
     ============================================================ */
  const A4_HEAD = (sub) => `
    <div class="a4-head">
      <img src="assets/logo.png?v=2" alt="" crossorigin="anonymous">
      <div><div class="a4-htitle">วัดพระธรรมกายในทวีปยุโรป</div><div class="a4-hsub">${sub}</div></div>
    </div>`;
  const A4_FOOT = (n, total) => `<div class="a4-foot"><span>Dhammakaya Temples &amp; Meditation Centres Across Europe</span><span>หน้า ${n} / ${total}</span></div>`;

  function pageSingle(t, n, total) {
    const esc = S.esc, flag = S.flag;
    const initial = (t.name || "?").trim()[0] || "?";
    const logo = t.logo ? `<img class="a4-logo" src="${esc(t.logo)}" crossorigin="anonymous" alt="">` : `<div class="a4-logo">${esc(initial)}</div>`;
    const aged = S.ageText(t.established);
    const monks = S.countMonks(t);
    const rows = [
      ["เจ้าอาวาส", t.abbot], ["รองเจ้าอาวาส", t.deputy], ["จำนวนพระ", monks ? monks + " รูป" : ""],
      ["ที่อยู่", t.address], ["โทรศัพท์", t.phone], ["เว็บไซต์", t.website],
      ["วันที่สร้าง/เปิด", t.established],
    ].filter(r => String(r[1] || "").trim());
    const photos = S.splitList(t.gallery).slice(0, 4);
    return `<div class="a4-page a4-single">
      ${A4_HEAD("ทะเบียนวัด · Temple Profile")}
      <div style="display:flex;gap:24px;align-items:center">
        ${logo}
        <div>
          <div class="a4-name">${esc(t.name)}</div>
          <div class="a4-country">${flag(t.country)}${esc(t.country || "")}</div>
          ${aged ? `<div class="a4-age">🏛️ สร้างมาแล้ว ${esc(aged)}</div>` : ""}
        </div>
      </div>
      <div class="a4-rows">
        ${rows.map(r => `<div class="a4-row"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join("")}
      </div>
      ${photos.length ? `<div class="a4-photos">${photos.map(p => `<img src="${esc(p)}" crossorigin="anonymous" alt="">`).join("")}</div>` : ""}
      ${A4_FOOT(n, total)}
    </div>`;
  }

  function pageCatalog(group, n, total) {
    const esc = S.esc, flag = S.flag;
    const cards = group.map(t => {
      const initial = (t.name || "?").trim()[0] || "?";
      const logo = t.logo ? `<img class="a4-cat-logo" src="${esc(t.logo)}" crossorigin="anonymous" alt="">` : `<div class="a4-cat-logo">${esc(initial)}</div>`;
      const aged = S.ageText(t.established);
      const lines = [
        t.abbot ? ["เจ้าอาวาส", t.abbot] : null,
        S.countMonks(t) ? ["พระ", S.countMonks(t) + " รูป"] : null,
        t.phone ? ["โทร", t.phone] : null,
        t.address ? ["ที่อยู่", t.address] : null,
        aged ? ["อายุ", aged] : null,
      ].filter(Boolean);
      return `<div class="a4-cat-card">
        ${logo}
        <div style="min-width:0">
          <div class="a4-cat-name">${esc(t.name)}</div>
          <div class="a4-cat-country">${flag(t.country)}${esc(t.country || "")}</div>
          ${lines.map(l => `<div class="a4-cat-line"><b>${esc(l[0])}:</b> ${esc(l[1])}</div>`).join("")}
        </div>
      </div>`;
    }).join("");
    return `<div class="a4-page">
      ${A4_HEAD("สมุดรวมวัด · Directory")}
      <div class="a4-catalog">${cards}</div>
      ${A4_FOOT(n, total)}
    </div>`;
  }

  function currentLayout() {
    const r = document.querySelector('input[name="a4layout"]:checked');
    return r ? r.value : "single";
  }

  window.buildA4 = function () {
    const layout = currentLayout();
    const stage = $("#a4Stage");
    let pages;
    if (layout === "single") {
      pages = TEMPLES.map((t, i) => pageSingle(t, i + 1, TEMPLES.length));
    } else {
      const groups = [];
      for (let i = 0; i < TEMPLES.length; i += 6) groups.push(TEMPLES.slice(i, i + 6));
      pages = groups.map((g, i) => pageCatalog(g, i + 1, groups.length));
    }
    stage.innerHTML = pages.join("");
    ["a4PngBtn", "a4JpgBtn", "a4PdfBtn"].forEach(id => $("#" + id).disabled = false);
    $("#a4Hint").textContent = `สร้างตัวอย่าง ${pages.length} หน้าแล้ว — เลือกดาวน์โหลดด้านบนได้เลย (ดูตัวอย่างด้านล่าง)`;
    toast(`สร้าง ${pages.length} หน้าแล้ว ✓`);
  };

  window.exportA4 = async function (fmt) {
    const pages = Array.from(document.querySelectorAll("#a4Stage .a4-page"));
    if (!pages.length) { toast("กรุณากด 'สร้างหน้าตัวอย่าง' ก่อน", true); return; }
    toast(`กำลังเรนเดอร์ ${pages.length} หน้า… (อาจใช้เวลาสักครู่)`);
    const layout = currentLayout();
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      const canvases = [];
      for (const p of pages) {
        canvases.push(await html2canvas(p, { scale: 2, backgroundColor: "#ffffff", useCORS: true }));
      }
      if (fmt === "pdf") {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        canvases.forEach((c, i) => {
          if (i) pdf.addPage();
          pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297);
        });
        pdf.save(`dhammakaya-30wat-${layout}-${stamp}.pdf`);
      } else {
        const type = fmt === "jpg" ? "image/jpeg" : "image/png";
        const zip = new JSZip();
        for (let i = 0; i < canvases.length; i++) {
          const blob = await canvasToBlob(canvases[i], type, 0.92);
          zip.file(`wat-${String(i + 1).padStart(2, "0")}.${fmt}`, blob);
        }
        const out = await zip.generateAsync({ type: "blob" });
        downloadBlob(out, `dhammakaya-30wat-${layout}-${stamp}-${fmt}.zip`);
      }
      toast("ดาวน์โหลดสำเร็จ ✓");
    } catch (e) {
      toast("ส่งออกไม่สำเร็จ: " + (e.message || e), true);
    }
  };

  /* layout radio active state */
  function initLayoutRadios() {
    document.querySelectorAll('input[name="a4layout"]').forEach(r => {
      r.onchange = () => {
        document.querySelectorAll(".export-radio").forEach(l => l.classList.remove("sel"));
        r.closest(".export-radio").classList.add("sel");
      };
    });
  }

  /* ============================================================
     เริ่มทำงาน
     ============================================================ */
  async function start() {
    const data = await S.loadTemplesShared();
    TEMPLES = data.temples; EVENTS = data.events;
    renderStats();
  }

  function init() {
    S.initTheme(); syncThemeIcons();
    $("#themeBtn").onclick = () => { S.toggleTheme(); syncThemeIcons(); if ($("#dashMain").style.display !== "none") renderCharts(); };
    $("#gateSubmit").onclick = tryGate;
    $("#gatePw").addEventListener("keydown", e => { if (e.key === "Enter") tryGate(); });
    initTabs(); initImport(); initLayoutRadios();

    if (isUnlocked()) { unlock(); }
    else { $("#gateOverlay").classList.add("open"); setTimeout(() => $("#gatePw").focus(), 100); }
  }

  init();
})();
