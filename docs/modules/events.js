/**
 * events.js
 * イベントハンドラ登録とモード管理
 */

import { els } from "./config.js";
import { state, loadStatusMap, saveXAccount, loadXAccount, isEditableMode } from "./state.js";
import { extractShareAccountFromLocation } from "./account.js";
import { extractShareTokenFromLocation } from "./sharing.js";
import { eventId, getStatus, setStatus } from "./data.js";
import { applyFilters, setBulkForFiltered } from "./filters.js";
import { renderCheckboxLayer, renderEventList } from "./renderer.js";
import { updateCheckStats } from "./statistics.js";
import { applyModeUi, copyShareUrl, goToEditableMode, setTransientStatus } from "./ui.js";
import { exportCsv, exportPng } from "./exports.js";
import { getCheckStats } from "./statistics.js";
import { applySharedStatusIfExists } from "./loaders.js";
import { decodeStatusMap } from "./codec.js";

/**
 * URLからモード情報を同期
 */
export function syncModeFromLocation() {
  const shareTokenFromUrl = extractShareTokenFromLocation();
  state.shareToken = shareTokenFromUrl || "";
  state.mode = shareTokenFromUrl ? "shared-preview" : "editable";
}

/**
 * 初期モードを設定
 */
export function initializeMode() {
  const shareTokenFromUrl = extractShareTokenFromLocation();
  state.shareToken = shareTokenFromUrl || "";
  state.mode = shareTokenFromUrl ? "shared-preview" : "editable";

  if (state.mode === "editable") {
    state.statusMap = loadStatusMap();
  }
}

/**
 * イベントハンドラを登録
 *
 * @param {Function} buildShareUrl - URL生成コールバック
 * @param {Function} loadData - データ読み込みコールバック
 */
export function attachEvents(buildShareUrl, loadData) {
  if (els.xAccount) {
    // Only restore from localStorage in edit mode, not in shared-preview
    if (state.mode !== "shared-preview") {
      const urlAccount = extractShareAccountFromLocation();
      if (!urlAccount) {
        els.xAccount.value = loadXAccount();
      }
    }
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
    updateCheckStats();
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
    copyShareUrl(buildShareUrl).catch(() => {
      setTransientStatus("共有URLの作成に失敗しました");
    });
  });
  els.exportCsv.addEventListener("click", exportCsv);
  els.exportPng.addEventListener("click", () => exportPng(getCheckStats));
  if (els.startChecking) {
    els.startChecking.addEventListener("click", goToEditableMode);
  }
  els.checkboxLayer.addEventListener("click", handleLayerClick);
  els.eventList.addEventListener("change", handleEventListChange);
  window.addEventListener("hashchange", () => {
    syncModeFromLocation();
    if (isEditableMode()) {
      state.statusMap = loadStatusMap();
      applyModeUi();
      renderCheckboxLayer();
      renderEventList();
      return;
    }

    applyModeUi();
    applySharedStatusIfExists(eventId);
    updateCheckStats();
    renderCheckboxLayer();
    renderEventList();
    
    // In shared-preview mode, force synchronize account display
    if (state.mode === "shared-preview") {
      const sharedAccount = extractShareAccountFromLocation();
      if (els.xAccount) {
        els.xAccount.value = sharedAccount; // Clear if not valid
      }
      updateCheckStats(); // Update display
      if (els.xAccountDisplay) {
        els.xAccountDisplay.hidden = true; // Always hide in shared mode
      }
    }
    
    setTransientStatus("共有リンクの状態を反映しました");
  });

  // Update display after loading account from localStorage
  updateCheckStats();
}

/**
 * チェックボックスレイヤークリック時の処理
 *
 * @param {Event} event - クリックイベント
 */
function handleLayerClick(event) {
  if (!isEditableMode()) {
    return;
  }
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

/**
 * イベントリストチェンジ時の処理
 *
 * @param {Event} event - チェンジイベント
 */
function handleEventListChange(event) {
  if (!isEditableMode()) {
    return;
  }
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
