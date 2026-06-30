/**
 * statistics.js
 * 統計情報の計算と表示更新
 */

import { els } from "./config.js";
import { state } from "./state.js";
import { getStatus } from "./data.js";
import { isValidXAccount } from "./account.js";
import { getStatsBoxRect } from "./canvas.js";

/**
 * チェック統計情報を計算
 *
 * @returns {Object} {totalBoxes, visitChecked, exhibitChecked, visitRate, exhibitRate}
 */
export function getCheckStats() {
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

/**
 * チェック統計を画面に表示
 */
export function updateCheckStats() {
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

  // Update X account display
  if (els.xAccountDisplay) {
    const account = (els.xAccount?.value || "").trim().replace(/^@/, "");
    if (account && isValidXAccount(account)) {
      els.xAccountDisplay.textContent = `@${account}`;
      els.xAccountDisplay.hidden = false;
      // Apply small font class if account name is 9 characters or longer
      if (account.length >= 9) {
        els.xAccountDisplay.classList.add("xAccountDisplay-small");
      } else {
        els.xAccountDisplay.classList.remove("xAccountDisplay-small");
      }
    } else {
      // Explicitly clear text content when account is invalid
      els.xAccountDisplay.textContent = "";
      els.xAccountDisplay.hidden = true;
    }
  }

  updateStatsOverlayPosition();
}

/**
 * 統計オーバーレイの位置を更新
 */
export function updateStatsOverlayPosition() {
  if (!els.checkStats || !state.meta.pdfWidth || !state.meta.pdfHeight) {
    return;
  }

  const rect = getStatsBoxRect(state.meta.pdfWidth, state.meta.pdfHeight);
  els.checkStats.style.left = `${(rect.x / state.meta.pdfWidth) * 100}%`;
  els.checkStats.style.top = `${(rect.y / state.meta.pdfHeight) * 100}%`;
  els.checkStats.style.width = `${(rect.width / state.meta.pdfWidth) * 100}%`;

  // Position account display above the stats box
  if (els.xAccountDisplay && !els.xAccountDisplay.hidden) {
    // Account label appears well above the box to avoid overlap
    const accountLabelTop = (rect.y - 25) / state.meta.pdfHeight * 100;
    // Shift right by half character width
    const charWidthOffset = (state.meta.pdfWidth * 0.015) / 2;
    els.xAccountDisplay.style.left = `${((rect.x + charWidthOffset) / state.meta.pdfWidth) * 100}%`;
    els.xAccountDisplay.style.top = `${accountLabelTop}%`;
  }
}
