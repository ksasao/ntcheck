/**
 * ui.js
 * UI表示の更新、モード切り替え
 */

import { els } from "./config.js";
import { state } from "./state.js";
import { getUrlWithoutArgs } from "./sharing.js";
import { loadXAccount } from "./state.js";
import { updateCheckStats } from "./statistics.js";

/**
 * モード別UI表示を適用
 */
export function applyModeUi() {
  const sharedPreview = state.mode === "shared-preview";
  document.body.classList.toggle("shared-preview", sharedPreview);

  if (els.toolbar) {
    els.toolbar.hidden = sharedPreview;
  }
  if (els.sidePane) {
    els.sidePane.hidden = sharedPreview;
  }

  if (els.startChecking) {
    els.startChecking.hidden = !sharedPreview;
  }

  // Hide account name in shared-preview mode
  if (els.xAccountDisplay) {
    if (sharedPreview) {
      els.xAccountDisplay.hidden = true;
    } else {
      // In edit mode, re-check if account should be displayed
      updateCheckStats();
    }
  }
}

/**
 * 一時的なステータスメッセージを表示
 *
 * @param {string} text - メッセージテキスト
 */
export function setTransientStatus(text) {
  const prev = els.sourceStatus.textContent;
  els.sourceStatus.textContent = text;
  window.setTimeout(() => {
    els.sourceStatus.textContent = prev;
  }, 1400);
}

/**
 * 共有URLをクリップボードにコピー
 *
 * @param {Function} buildShareUrl - URL生成コールバック
 */
export async function copyShareUrl(buildShareUrl) {
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

/**
 * 編集可能モードに戻る
 */
export function goToEditableMode() {
  // Restore saved account from localStorage when going back to editable mode
  const savedAccount = loadXAccount();
  if (savedAccount && els.xAccount) {
    els.xAccount.value = savedAccount;
  }
  window.location.assign(getUrlWithoutArgs());
}
