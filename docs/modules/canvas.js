/**
 * canvas.js
 * キャンバス描画関連（チェックボックス、統計など）
 */

import {
  CHECK_OFFSET_X,
  CHECK_OFFSET_Y,
  EXPORT_BOX_SIZE,
  STATS_BOX_WIDTH,
  STATS_BOX_HEIGHT,
  STATS_BOX_X,
  STATS_BOX_Y_RATIO,
  STATS_BOX_UPWARD_FACTOR,
  STATS_BOX_UPWARD_CHAR,
  els,
} from "./config.js";
import { state } from "./state.js";
import { getStatus, escapeHtml } from "./data.js";
import { isValidXAccount } from "./account.js";

/**
 * 角丸矩形を描画
 *
 * @param {CanvasRenderingContext2D} ctx - キャンバスコンテキスト
 * @param {number} x - X座標
 * @param {number} y - Y座標
 * @param {number} w - 幅
 * @param {number} h - 高さ
 * @param {number} r - 角丸の半径
 */
export function drawRoundedRect(ctx, x, y, w, h, r) {
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

/**
 * チェックボックスをキャンバスに描画
 *
 * @param {CanvasRenderingContext2D} ctx - キャンバスコンテキスト
 * @param {Object} pos - {x, y} 位置
 * @param {boolean} checked - チェック状態
 * @param {number} scale - スケーリング係数
 */
export function drawCheckboxOnCanvas(ctx, pos, checked, scale = 1) {
  const x = pos.x + CHECK_OFFSET_X;
  const y = pos.y + CHECK_OFFSET_Y;
  const size = EXPORT_BOX_SIZE;
  
  // スケール時に角丸が小さくなりすぎないように調整
  const baseRadius = 0.6;
  const radius = Math.max(baseRadius, size * 0.12);

  drawRoundedRect(ctx, x, y, size, size, radius);
  if (checked) {
    ctx.fillStyle = "#16a85c";
    ctx.strokeStyle = "#0d8a4b";
    ctx.lineWidth = 0.5 / Math.max(1, scale);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.6 / Math.max(1, scale);
    ctx.beginPath();
    // チェック✔の位置と大きさを調整
    ctx.moveTo(x + size * 0.22, y + size * 0.50);
    ctx.lineTo(x + size * 0.38, y + size * 0.64);
    ctx.lineTo(x + size * 0.72, y + size * 0.32);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
    ctx.lineWidth = 0.5 / Math.max(1, scale);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * 統計ボックスの位置を計算
 *
 * @param {number} width - PDF幅
 * @param {number} height - PDF高さ
 * @returns {Object} {x, y, width, height}
 */
export function getStatsBoxRect(width, height) {
  const upwardOffset = Math.round(STATS_BOX_HEIGHT * STATS_BOX_UPWARD_FACTOR);
  const rawY = Math.round(height * STATS_BOX_Y_RATIO) - Math.round(STATS_BOX_HEIGHT / 2) - upwardOffset - STATS_BOX_UPWARD_CHAR;
  const x = Math.min(width - STATS_BOX_WIDTH - 8, Math.max(8, STATS_BOX_X));
  const y = Math.min(height - STATS_BOX_HEIGHT - 8, Math.max(8, rawY));
  return { x, y, width: STATS_BOX_WIDTH, height: STATS_BOX_HEIGHT };
}

/**
 * 統計情報をキャンバスに描画
 *
 * @param {CanvasRenderingContext2D} ctx - キャンバスコンテキスト
 * @param {number} width - PDF幅
 * @param {number} height - PDF高さ
 * @param {Function} getCheckStats - 統計情報取得コールバック
 */
export function drawStatsOnCanvas(ctx, width, height, getCheckStats) {
  const stats = getCheckStats();
  const account = (els.xAccount?.value || "").trim().replace(/^@/, "");
  const rect = getStatsBoxRect(width, height);

  // Draw the stats box (without account inside)
  drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 3.6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 0.8;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#243042";
  ctx.font = 'bold 12px "Noto Sans JP", "Yu Gothic UI", sans-serif';
  ctx.textBaseline = "top";

  // Draw stats
  ctx.fillText(`見学 ${stats.visitChecked} (${stats.visitRate}%)`, rect.x + 6, rect.y + 5);
  ctx.fillText(`出展 ${stats.exhibitChecked} (${stats.exhibitRate}%)`, rect.x + 6, rect.y + 19);

  // Draw account name above the box (if valid)
  const isValidAccount = account && isValidXAccount(account);
  if (isValidAccount) {
    const accountFontSize = account.length >= 9 ? 11 : 13;
    ctx.font = `bold ${accountFontSize}px "Noto Sans JP", "Yu Gothic UI", sans-serif`;
    ctx.fillText(`@${account}`, rect.x, rect.y - 18);
  }
}
