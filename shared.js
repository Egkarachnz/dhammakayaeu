/* ============================================================
   shared.js — โค้ดใช้ร่วมของหน้าใหม่ (temple.html, dashboard.html)
   โหลดเฉพาะหน้าใหม่ ไม่โหลดใน index.html เพื่อไม่ให้ชนกับ app.js
   ต้องโหลด config.js และ data.js ก่อนไฟล์นี้
   ============================================================ */
(function (global) {
  "use strict";

  const STORAGE_KEY = "dhammakaya-temples-v1";
  const EVENTS_KEY  = "dhammakaya-events-v1";
  const CLOUD_URL   = (typeof CONFIG !== "undefined" && CONFIG.DATA_URL) ? String(CONFIG.DATA_URL).trim() : "";

  /* ── ธงชาติ ── */
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

  const flag      = c => FLAGS[c] ? FLAGS[c] + " " : "";
  const esc       = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const mapUrl    = a => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a || "");
  const splitMonks = s => String(s || "").split(/[;\n]/).map(x => x.trim()).filter(Boolean);
  const splitList  = s => String(s || "").split(/[\n,]/).map(x => x.trim()).filter(Boolean); // สำหรับ gallery

  function countMonks(t) {
    if (t.monk_count && !isNaN(+t.monk_count)) return +t.monk_count;
    return splitMonks(t.monks).length;
  }

  /* ── คำนวณอายุวัด ── */
  function parseEstablished(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // d/m/yyyy
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  function templeAge(established) {
    const start = parseEstablished(established);
    if (!start) return null;
    const now = new Date();
    if (start > now) return null;
    let years  = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days   = now.getDate() - start.getDate();
    if (days < 0) {
      months--;
      const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthDays;
    }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.floor((now - start) / 86400000);
    return { years, months, days, totalDays };
  }

  function ageText(established) {
    const a = templeAge(established);
    if (!a) return "";
    const parts = [];
    if (a.years)  parts.push(a.years + " ปี");
    if (a.months) parts.push(a.months + " เดือน");
    parts.push(a.days + " วัน");
    return parts.join(" ");
  }

  /* ── โหลดข้อมูล: คลาวด์ → localStorage → data.js ── */
  function readCache(key) {
    try { const v = JSON.parse(localStorage.getItem(key)); if (Array.isArray(v)) return v; } catch (e) {}
    return null;
  }

  async function loadTemplesShared() {
    let temples = readCache(STORAGE_KEY);
    let events  = readCache(EVENTS_KEY);
    if (!temples || !temples.length) temples = (typeof DATA_TEMPLES !== "undefined" ? DATA_TEMPLES.slice() : []);
    if (!events) events = (typeof DATA_EVENTS !== "undefined" ? DATA_EVENTS.slice() : []);

    if (CLOUD_URL) {
      try {
        const res  = await fetch(CLOUD_URL, { method: "GET" });
        const data = await res.json();
        if (data && data.ok) {
          const ct = Array.isArray(data.temples) ? data.temples.filter(t => t.name) : [];
          const ce = Array.isArray(data.events)  ? data.events : [];
          if (ct.length) { temples = ct; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ct)); } catch (e) {} }
          if (ce.length) { events  = ce; try { localStorage.setItem(EVENTS_KEY,  JSON.stringify(ce)); } catch (e) {} }
        }
      } catch (e) { /* ใช้ข้อมูลแคช/ตั้งต้นต่อไป */ }
    }
    return { temples: temples.filter(t => t.name), events };
  }

  /* ── ธีม (sync กับหน้าแรก) ── */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("temple-theme", theme); } catch (e) {}
  }
  function initTheme() {
    let saved = "light";
    try { saved = localStorage.getItem("temple-theme") || "light"; } catch (e) {}
    applyTheme(saved);
    return saved;
  }
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    return document.documentElement.getAttribute("data-theme");
  }

  global.Shared = {
    STORAGE_KEY, EVENTS_KEY, CLOUD_URL,
    FLAGS, flag, esc, mapUrl, splitMonks, splitList, countMonks,
    parseEstablished, templeAge, ageText,
    loadTemplesShared, applyTheme, initTheme, toggleTheme,
  };
})(window);
