/**
 * app.js - Entry Point
 * 全体の初期化とメイン処理フロー
 */

import { els } from "./modules/config.js";
import { state } from "./modules/state.js";
import { initializeMode, attachEvents } from "./modules/events.js";
import { applyModeUi } from "./modules/ui.js";
import { loadData } from "./modules/loaders.js";
import { eventId, getStatus } from "./modules/data.js";
import { encodeStatusMap } from "./modules/codec.js";
import { isValidXAccount } from "./modules/account.js";
import { SHARE_PARAM_NAME } from "./modules/config.js";

/**
 * 共有URLを構築（statusMapをエンコード）
 */
function buildEncodedShareUrl() {
  const token = encodeStatusMap(state.events, (event) => getStatus(event));
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  
  if (!token) {
    return base;
  }
  
  const account = (els.xAccount?.value || "").trim().replace(/^@/, "");
  if (account && isValidXAccount(account)) {
    return `${base}#${SHARE_PARAM_NAME}=${token}&u=${encodeURIComponent(account)}`;
  }
  
  return `${base}#${SHARE_PARAM_NAME}=${token}`;
}

/**
 * アプリケーション初期化
 */
async function initialize() {
  // Set initial mode from URL
  initializeMode();
  
  // Apply UI based on mode
  applyModeUi();
  
  // Attach event handlers
  attachEvents(buildEncodedShareUrl, () => loadData(eventId));
  
  // Load data
  try {
    await loadData(eventId);
  } catch (error) {
    els.sourceStatus.textContent = "読み込み失敗";
    els.loading.textContent = String(error.message || error);
  }
}

// Start the application
initialize();


