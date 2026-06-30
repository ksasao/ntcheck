/**
 * exports.js
 * エクスポート機能（CSV、PNG）
 */

import { els, X_MAX_IMAGE_SIDE } from "./config.js";
import { state } from "./state.js";
import { eventId, getStatus, csvEscape } from "./data.js";
import { drawCheckboxOnCanvas, drawStatsOnCanvas, getStatsBoxRect } from "./canvas.js";
import { setTransientStatus } from "./ui.js";

/**
 * CSVをエクスポート
 */
export function exportCsv() {
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

/**
 * PNGをエクスポート
 *
 * @param {Function} getCheckStats - 統計情報取得コールバック
 */
export function exportPng(getCheckStats) {
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

  // High DPI対応: スケーリングを正確に適用
  ctx.scale(exportScale, exportScale);
  ctx.drawImage(els.pdfImage, 0, 0, width, height);

  // チェックボックス描画時にスケール値を渡さない（contextのscaleで十分）
  for (const event of state.events) {
    if (!event.checkVisit || !event.checkExhibit) {
      continue;
    }

    const status = getStatus(event);
    drawCheckboxOnCanvas(ctx, event.checkVisit, status.visit, 1);
    drawCheckboxOnCanvas(ctx, event.checkExhibit, status.exhibit, 1);
  }

  drawStatsOnCanvas(ctx, width, height, getCheckStats);

  const ts = new Date();
  const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(ts.getSeconds()).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `nt_event_checks_${stamp}.png`;
  a.click();
  els.sourceStatus.textContent = "PNG保存完了";
}
