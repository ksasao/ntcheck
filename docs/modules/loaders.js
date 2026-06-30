/**
 * loaders.js
 * データ読み込みと共有ステータス復元
 */

import { DATA_URL } from "./config.js";
import { els } from "./config.js";
import { state, loadStatusMap } from "./state.js";
import { extractShareAccountFromLocation } from "./account.js";
import { extractShareTokenFromLocation } from "./sharing.js";
import { decodeStatusMap } from "./codec.js";
import { buildRegionOptions, renderCheckboxLayer, renderEventList } from "./renderer.js";
import { applyFilters } from "./filters.js";

/**
 * 共有ステータス（URLからのトークンとアカウント）があれば適用
 *
 * @param {Function} eventId - イベントID生成コールバック
 * @returns {boolean} 復元成功判定
 */
export function applySharedStatusIfExists(eventId) {
  // Always update account from URL, regardless of state.events
  // Clear or set account based on URL parameter
  if (state.mode === "shared-preview") {
    const sharedAccount = extractShareAccountFromLocation();
    if (els.xAccount) {
      els.xAccount.value = sharedAccount;
    }
  }

  // Now handle status map (requires state.events)
  if (!state.events.length) {
    return false;
  }

  const token = state.shareToken;
  if (!token) {
    return false;
  }

  try {
    state.statusMap = decodeStatusMap(token, state.events, eventId);
    return true;
  } catch {
    return false;
  }
}

/**
 * 共有ステータスを適用してUI更新
 *
 * @param {Function} eventId - イベントID生成コールバック
 * @returns {boolean} 適用成功判定
 */
export function applySharedStatusAndRefresh(eventId) {
  const applied = applySharedStatusIfExists(eventId);
  if (!applied) {
    return false;
  }
  renderCheckboxLayer();
  renderEventList();
  return true;
}

/**
 * データをサーバーから読み込み
 *
 * @param {Function} eventId - イベントID生成コールバック
 * @returns {Promise<void>}
 */
export async function loadData(eventId) {
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

  const restoredFromShare = applySharedStatusIfExists(eventId);
  if (state.mode === "shared-preview") {
    els.sourceStatus.textContent = restoredFromShare ? "共有URL表示モード" : "共有URLの復元に失敗しました";
  } else {
    els.sourceStatus.textContent = restoredFromShare ? "共有リンクの状態を読み込みました" : "読み込み完了";
  }

  if (state.meta.backgroundImage) {
    els.pdfImage.src = `./${state.meta.backgroundImage}`;
  }

  buildRegionOptions();
  applyFilters();
  els.loading.hidden = true;
  els.pdfStage.hidden = false;
}
