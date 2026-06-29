const DATA_URL = "./events.json";
const STATUS_KEY = "nt-pdf-check-status-v2";
const X_ACCOUNT_KEY = "nt-x-account-v1";
const CHECK_OFFSET_X = 0.2;
const CHECK_OFFSET_Y = 8.5;
const EXPORT_BOX_SIZE = 6.6;
const X_MAX_IMAGE_SIDE = 4096;
const X_SEARCH_WINDOW_NAME = "nt-x-search-window";
const SHARE_PARAM_NAME = "s";
const STATS_BOX_WIDTH = 94;
const STATS_BOX_HEIGHT = 36;
const STATS_BOX_X = 21;
const STATS_BOX_Y_RATIO = 0.58;
const STATS_BOX_UPWARD_FACTOR = 1.3;
const STATS_BOX_UPWARD_CHAR = 12;

const els = {
  sourceStatus: document.getElementById("sourceStatus"),
  sourceName: document.getElementById("sourceName"),
  keyword: document.getElementById("keyword"),
  regionFilter: document.getElementById("regionFilter"),
  sortOrder: document.getElementById("sortOrder"),
  xAccount: document.getElementById("xAccount"),
  reloadData: document.getElementById("reloadData"),
  bulkCheckFiltered: document.getElementById("bulkCheckFiltered"),
  bulkUncheckFiltered: document.getElementById("bulkUncheckFiltered"),
  copyShareUrl: document.getElementById("copyShareUrl"),
  exportCsv: document.getElementById("exportCsv"),
  exportPng: document.getElementById("exportPng"),
  countVisible: document.getElementById("countVisible"),
  countTotal: document.getElementById("countTotal"),
  countVisitChecked: document.getElementById("countVisitChecked"),
  countExhibitChecked: document.getElementById("countExhibitChecked"),
  rateVisitChecked: document.getElementById("rateVisitChecked"),
  rateExhibitChecked: document.getElementById("rateExhibitChecked"),
  checkStats: document.getElementById("checkStats"),
  loading: document.getElementById("loading"),
  pdfStage: document.getElementById("pdfStage"),
  pdfImage: document.getElementById("pdfImage"),
  checkboxLayer: document.getElementById("checkboxLayer"),
  eventList: document.getElementById("eventList"),
};

const REGION_ORDER = ["北陸", "東海", "関東", "関西", "北海道", "東北", "九州", "中国", "海外", "その他", "未分類"];

const state = {
  meta: {
    pdfWidth: 595.5,
    pdfHeight: 842.25,
    backgroundImage: "",
  },
  events: [],
  filtered: [],
  sortOrder: "date_desc",
  statusMap: loadStatusMap(),
};

function loadStatusMap() {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatusMap() {
  localStorage.setItem(STATUS_KEY, JSON.stringify(state.statusMap));
}

function bytesToBase64Url(bytes) {
  if (!bytes.length) {
    return "";
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  if (!value) {
    return new Uint8Array();
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeStatusMap(events) {
  const fullBytes = new Uint8Array(Math.ceil((events.length * 2) / 8));

  events.forEach((event, index) => {
    const status = getStatus(event);
    const value = (status.visit ? 1 : 0) | (status.exhibit ? 2 : 0);
    const bitOffset = (index * 2) % 8;
    const byteIndex = Math.floor((index * 2) / 8);
    fullBytes[byteIndex] |= value << bitOffset;
  });

  let tail = fullBytes.length;
  while (tail > 0 && fullBytes[tail - 1] === 0) {
    tail -= 1;
  }

  return bytesToBase64Url(fullBytes.slice(0, tail));
}

function decodeStatusMap(token, events) {
  const bytes = base64UrlToBytes(token);
  const nextMap = {};

  events.forEach((event, index) => {
    const bitOffset = (index * 2) % 8;
    const byteIndex = Math.floor((index * 2) / 8);
    const raw = bytes[byteIndex] ?? 0;
    const value = (raw >> bitOffset) & 0b11;
    nextMap[eventId(event)] = {
      visit: Boolean(value & 0b01),
      exhibit: Boolean(value & 0b10),
    };
  });

  return nextMap;
}

function extractShareTokenFromLocation() {
  const query = new URLSearchParams(window.location.search).get(SHARE_PARAM_NAME);
  if (query) {
    return query;
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return "";
  }
  const params = new URLSearchParams(hash);
  return params.get(SHARE_PARAM_NAME) || "";
}

function cleanShareTokenFromLocation() {
  const url = new URL(window.location.href);
  let changed = false;

  if (url.searchParams.has(SHARE_PARAM_NAME)) {
    url.searchParams.delete(SHARE_PARAM_NAME);
    changed = true;
  }

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!hash) {
    if (changed) {
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      history.replaceState(null, "", nextUrl);
    }
    return;
  }

  const params = new URLSearchParams(hash);
  if (!params.has(SHARE_PARAM_NAME)) {
    if (changed) {
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      history.replaceState(null, "", nextUrl);
    }
    return;
  }

  params.delete(SHARE_PARAM_NAME);
  const nextHash = params.toString();
  url.hash = nextHash ? `#${nextHash}` : "";
  changed = true;

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    history.replaceState(null, "", nextUrl);
  }
}

function applySharedStatusIfExists() {
  if (!state.events.length) {
    return false;
  }

  const token = extractShareTokenFromLocation();
  if (!token) {
    return false;
  }

  try {
    state.statusMap = decodeStatusMap(token, state.events);
    saveStatusMap();
    cleanShareTokenFromLocation();
    return true;
  } catch {
    cleanShareTokenFromLocation();
    return false;
  }
}

function buildShareUrl() {
  const token = encodeStatusMap(state.events);
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  if (!token) {
    return base;
  }
  return `${base}#${SHARE_PARAM_NAME}=${token}`;
}

function applySharedStatusAndRefresh() {
  const applied = applySharedStatusIfExists();
  if (!applied) {
    return false;
  }
  renderCheckboxLayer();
  renderEventList();
  return true;
}

function setTransientStatus(text) {
  const prev = els.sourceStatus.textContent;
  els.sourceStatus.textContent = text;
  window.setTimeout(() => {
    els.sourceStatus.textContent = prev;
  }, 1400);
}

async function copyShareUrl() {
  const url = buildShareUrl();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setTransientStatus("共有URLをコピーしました");
      return;
    }
  } catch {
    // fallback prompt
  }

  window.prompt("共有URLをコピーしてください", url);
}

function loadXAccount() {
  try {
    return localStorage.getItem(X_ACCOUNT_KEY) || "";
  } catch {
    return "";
  }
}

function saveXAccount(value) {
  try {
    localStorage.setItem(X_ACCOUNT_KEY, value);
  } catch {
    // no-op
  }
}

function eventId(event) {
  return `${event.name}|${event.dateStart}|${event.region}`;
}

function getStatus(event) {
  return state.statusMap[eventId(event)] || { visit: false, exhibit: false };
}

function setStatus(event, key, value) {
  const id = eventId(event);
  const current = state.statusMap[id] || { visit: false, exhibit: false };
  state.statusMap[id] = { ...current, [key]: value };
  saveStatusMap();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function checkboxStyle(pos) {
  const x = ((pos.x + CHECK_OFFSET_X) / state.meta.pdfWidth) * 100;
  const y = ((pos.y + CHECK_OFFSET_Y) / state.meta.pdfHeight) * 100;
  return `left:${x}%;top:${y}%;`;
}

function buildRegionOptions() {
  const regions = [...new Set(state.events.map((e) => e.region))].sort((a, b) => {
    return REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b);
  });
  els.regionFilter.innerHTML = [
    '<option value="all">すべて</option>',
    ...regions.map((region) => `<option value="${region}">${region}</option>`),
  ].join("");
}

function eventMatches(event, keyword, region) {
  if (region !== "all" && event.region !== region) {
    return false;
  }
  if (!keyword) {
    return true;
  }
  const text = `${event.name} ${event.region} ${event.dateText}`.toLowerCase();
  return text.includes(keyword);
}

function applyFilters() {
  const keyword = els.keyword.value.trim().toLowerCase();
  const region = els.regionFilter.value;
  state.filtered = state.events.filter((event) => eventMatches(event, keyword, region));
  state.filtered.sort((a, b) => compareEvents(a, b, state.sortOrder));
  els.countVisible.textContent = String(state.filtered.length);
  els.countTotal.textContent = String(state.events.length);
  renderCheckboxLayer();
  renderEventList();
}

function compareEvents(a, b, order) {
  if (order === "date_asc") {
    return a.dateStart.localeCompare(b.dateStart) || a.name.localeCompare(b.name, "ja");
  }
  if (order === "name_asc") {
    return a.name.localeCompare(b.name, "ja") || a.dateStart.localeCompare(b.dateStart);
  }
  if (order === "name_desc") {
    return b.name.localeCompare(a.name, "ja") || b.dateStart.localeCompare(a.dateStart);
  }
  if (order === "region_asc") {
    return a.region.localeCompare(b.region, "ja") || b.dateStart.localeCompare(a.dateStart);
  }
  // default: 開催が新しい順
  return b.dateStart.localeCompare(a.dateStart) || a.name.localeCompare(b.name, "ja");
}

function renderCheckboxLayer() {
  els.checkboxLayer.innerHTML = state.events.flatMap((event) => {
    if (!event.checkVisit || !event.checkExhibit) {
      return [];
    }

    const id = eventId(event);
    const status = getStatus(event);

    const visit = `<button class="pdf-check${status.visit ? " checked" : ""}" data-id="${encodeURIComponent(id)}" data-type="visit" type="button" style="${checkboxStyle(event.checkVisit)}" title="見学: ${escapeHtml(event.name)}" aria-label="見学: ${escapeHtml(event.name)}"></button>`;
    const exhibit = `<button class="pdf-check${status.exhibit ? " checked" : ""}" data-id="${encodeURIComponent(id)}" data-type="exhibit" type="button" style="${checkboxStyle(event.checkExhibit)}" title="出展: ${escapeHtml(event.name)}" aria-label="出展: ${escapeHtml(event.name)}"></button>`;
    return [visit, exhibit];
  }).join("");

  updateCheckStats();
}

function getCheckStats() {
  const totalBoxes = state.events.length * 2;
  let visitChecked = 0;
  let exhibitChecked = 0;

  for (const event of state.events) {
    const status = getStatus(event);
    if (status.visit) {
      visitChecked += 1;
    }
    if (status.exhibit) {
      exhibitChecked += 1;
    }
  }

  const visitRate = totalBoxes > 0 ? Math.round((visitChecked / totalBoxes) * 100) : 0;
  const exhibitRate = totalBoxes > 0 ? Math.round((exhibitChecked / totalBoxes) * 100) : 0;

  return { totalBoxes, visitChecked, exhibitChecked, visitRate, exhibitRate };
}

function updateCheckStats() {
  const stats = getCheckStats();

  if (els.countVisitChecked) {
    els.countVisitChecked.textContent = String(stats.visitChecked);
  }
  if (els.countExhibitChecked) {
    els.countExhibitChecked.textContent = String(stats.exhibitChecked);
  }
  if (els.rateVisitChecked) {
    els.rateVisitChecked.textContent = String(stats.visitRate);
  }
  if (els.rateExhibitChecked) {
    els.rateExhibitChecked.textContent = String(stats.exhibitRate);
  }

  updateStatsOverlayPosition();
}

function getStatsBoxRect(width, height) {
  const upwardOffset = Math.round(STATS_BOX_HEIGHT * STATS_BOX_UPWARD_FACTOR);
  const rawY = Math.round(height * STATS_BOX_Y_RATIO) - Math.round(STATS_BOX_HEIGHT / 2) - upwardOffset - STATS_BOX_UPWARD_CHAR;
  const x = Math.min(width - STATS_BOX_WIDTH - 8, Math.max(8, STATS_BOX_X));
  const y = Math.min(height - STATS_BOX_HEIGHT - 8, Math.max(8, rawY));
  return { x, y, width: STATS_BOX_WIDTH, height: STATS_BOX_HEIGHT };
}

function updateStatsOverlayPosition() {
  if (!els.checkStats || !state.meta.pdfWidth || !state.meta.pdfHeight) {
    return;
  }

  const rect = getStatsBoxRect(state.meta.pdfWidth, state.meta.pdfHeight);
  els.checkStats.style.left = `${(rect.x / state.meta.pdfWidth) * 100}%`;
  els.checkStats.style.top = `${(rect.y / state.meta.pdfHeight) * 100}%`;
  els.checkStats.style.width = `${(rect.width / state.meta.pdfWidth) * 100}%`;
}

function setBulkForFiltered(nextValue) {
  for (const event of state.filtered) {
    const id = eventId(event);
    const current = state.statusMap[id] || { visit: false, exhibit: false };
    state.statusMap[id] = { ...current, visit: nextValue, exhibit: nextValue };
  }
  saveStatusMap();
  renderCheckboxLayer();
  renderEventList();
}

function stateLabel(status) {
  if (status.visit && status.exhibit) {
    return "見学 / 出展";
  }
  if (status.visit) {
    return "見学";
  }
  if (status.exhibit) {
    return "出展";
  }
  return "未チェック";
}

function plusOneDay(isoDate) {
  const value = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(value.getTime())) {
    return isoDate;
  }
  value.setDate(value.getDate() + 1);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildXSearchUrl(event) {
  const account = (els.xAccount?.value || "").trim().replace(/^@/, "");
  const terms = [`since:${event.dateStart}`, `until:${plusOneDay(event.dateEnd)}`];
  if (account) {
    terms.push(`from:${account}`);
  }
  const query = terms.join(" ");
  return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
}

function renderEventList() {
  if (!state.filtered.length) {
    els.eventList.innerHTML = "<li class=\"event-item\">該当イベントがありません。</li>";
    return;
  }

  els.eventList.innerHTML = state.filtered
    .map((event) => {
      const status = getStatus(event);
      const searchUrl = buildXSearchUrl(event);
      const encodedId = encodeURIComponent(eventId(event));
      return `
        <li class="event-item">
          <h3><a class="x-search-link" href="${searchUrl}" target="${X_SEARCH_WINDOW_NAME}" title="Xで期間検索を開く">${escapeHtml(event.name)}</a></h3>
          <p>${escapeHtml(event.region)} / ${escapeHtml(event.dateText)}</p>
          <div class="event-controls">
            <label><input type="checkbox" data-id="${encodedId}" data-type="visit" ${status.visit ? "checked" : ""} />見学</label>
            <label><input type="checkbox" data-id="${encodedId}" data-type="exhibit" ${status.exhibit ? "checked" : ""} />出展</label>
          </div>
        </li>
      `;
    })
    .join("");
}

function handleEventListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
    return;
  }

  const id = decodeURIComponent(target.dataset.id || "");
  const type = target.dataset.type;
  const found = state.events.find((item) => eventId(item) === id);
  if (!found || (type !== "visit" && type !== "exhibit")) {
    return;
  }

  setStatus(found, type, target.checked);
  renderCheckboxLayer();
  renderEventList();
}

function handleLayerClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.classList.contains("pdf-check")) {
    return;
  }

  const id = decodeURIComponent(target.dataset.id || "");
  const type = target.dataset.type;
  const found = state.events.find((item) => eventId(item) === id);
  if (!found || (type !== "visit" && type !== "exhibit")) {
    return;
  }

  const current = getStatus(found);
  const nextValue = !current[type];
  setStatus(found, type, nextValue);
  renderCheckboxLayer();
  renderEventList();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[\",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function exportCsv() {
  const header = ["name", "region", "dateText", "dateStart", "dateEnd", "visit", "exhibit"];
  const lines = [header.join(",")];

  for (const event of state.events) {
    const status = getStatus(event);
    const row = [
      event.name,
      event.region,
      event.dateText,
      event.dateStart,
      event.dateEnd,
      status.visit ? "1" : "0",
      status.exhibit ? "1" : "0",
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nt_event_checks.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCheckboxOnCanvas(ctx, pos, checked) {
  const x = pos.x + CHECK_OFFSET_X;
  const y = pos.y + CHECK_OFFSET_Y;
  const size = EXPORT_BOX_SIZE;
  const radius = Math.max(0.8, size * 0.14);

  drawRoundedRect(ctx, x, y, size, size, radius);
  if (checked) {
    ctx.fillStyle = "#16a85c";
    ctx.strokeStyle = "#0d8a4b";
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.26, y + size * 0.56);
    ctx.lineTo(x + size * 0.45, y + size * 0.74);
    ctx.lineTo(x + size * 0.8, y + size * 0.3);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
  }
}

function drawStatsOnCanvas(ctx, width, height) {
  const stats = getCheckStats();
  const rect = getStatsBoxRect(width, height);

  drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 3.6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 0.8;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#243042";
  ctx.font = 'bold 12px "Noto Sans JP", "Yu Gothic UI", sans-serif';
  ctx.textBaseline = "top";
  ctx.fillText(`見学 ${stats.visitChecked} (${stats.visitRate}%)`, rect.x + 6, rect.y + 5);
  ctx.fillText(`出展 ${stats.exhibitChecked} (${stats.exhibitRate}%)`, rect.x + 6, rect.y + 19);
}

function exportPng() {
  if (!els.pdfImage.complete || !els.pdfImage.naturalWidth || !els.pdfImage.naturalHeight) {
    els.sourceStatus.textContent = "PNG保存失敗";
    return;
  }

  const width = Math.round(state.meta.pdfWidth || els.pdfImage.naturalWidth);
  const height = Math.round(state.meta.pdfHeight || els.pdfImage.naturalHeight);
  const exportScale = Math.min(X_MAX_IMAGE_SIDE / width, X_MAX_IMAGE_SIDE / height);
  const outputWidth = Math.max(1, Math.round(width * exportScale));
  const outputHeight = Math.max(1, Math.round(height * exportScale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    els.sourceStatus.textContent = "PNG保存失敗";
    return;
  }

  ctx.scale(exportScale, exportScale);
  ctx.drawImage(els.pdfImage, 0, 0, width, height);

  for (const event of state.events) {
    if (!event.checkVisit || !event.checkExhibit) {
      continue;
    }

    const status = getStatus(event);
    drawCheckboxOnCanvas(ctx, event.checkVisit, status.visit);
    drawCheckboxOnCanvas(ctx, event.checkExhibit, status.exhibit);
  }

  drawStatsOnCanvas(ctx, width, height);

  const ts = new Date();
  const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(ts.getSeconds()).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `nt_event_checks_${stamp}.png`;
  a.click();
  els.sourceStatus.textContent = "PNG保存完了";
}

async function loadData() {
  els.sourceStatus.textContent = "読み込み中...";
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`events.json の取得に失敗: ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    state.events = payload;
  } else {
    state.meta = { ...state.meta, ...(payload.meta || {}) };
    state.events = payload.events || [];
  }

  state.events = state.events.filter((event) => event.checkVisit && event.checkExhibit);

  const restoredFromShare = applySharedStatusIfExists();

  els.sourceStatus.textContent = restoredFromShare ? "共有リンクの状態を復元しました" : "読み込み完了";

  if (state.meta.backgroundImage) {
    els.pdfImage.src = `./${state.meta.backgroundImage}`;
  }

  buildRegionOptions();
  applyFilters();
  els.loading.hidden = true;
  els.pdfStage.hidden = false;
}

function attachEvents() {
  if (els.xAccount) {
    els.xAccount.value = loadXAccount();
  }
  state.sortOrder = els.sortOrder?.value || "date_desc";
  els.keyword.addEventListener("input", applyFilters);
  els.regionFilter.addEventListener("change", applyFilters);
  els.sortOrder.addEventListener("change", () => {
    state.sortOrder = els.sortOrder.value || "date_desc";
    applyFilters();
  });
  els.xAccount.addEventListener("input", () => {
    saveXAccount(els.xAccount.value.trim());
    renderEventList();
  });
  els.reloadData.addEventListener("click", () => {
    loadData().catch((error) => {
      els.sourceStatus.textContent = "読み込み失敗";
      els.loading.textContent = String(error.message || error);
    });
  });
  els.bulkCheckFiltered.addEventListener("click", () => setBulkForFiltered(true));
  els.bulkUncheckFiltered.addEventListener("click", () => setBulkForFiltered(false));
  els.copyShareUrl.addEventListener("click", () => {
    copyShareUrl().catch(() => {
      setTransientStatus("共有URLの作成に失敗しました");
    });
  });
  els.exportCsv.addEventListener("click", exportCsv);
  els.exportPng.addEventListener("click", exportPng);
  els.checkboxLayer.addEventListener("click", handleLayerClick);
  els.eventList.addEventListener("change", handleEventListChange);
  window.addEventListener("hashchange", () => {
    if (applySharedStatusAndRefresh()) {
      setTransientStatus("共有リンクの状態を反映しました");
    }
  });
}

attachEvents();
loadData().catch((error) => {
  els.sourceStatus.textContent = "読み込み失敗";
  els.loading.textContent = String(error.message || error);
});
