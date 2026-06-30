/**
 * state.js
 * グローバル状態管理とlocalStorage処理
 */

import { STATUS_KEY, X_ACCOUNT_KEY } from "./config.js";

// Global application state
export const state = {
  meta: {
    pdfWidth: 595.5,
    pdfHeight: 842.25,
    backgroundImage: "",
  },
  events: [],
  filtered: [],
  sortOrder: "date_desc",
  statusMap: {},
  mode: "editable",
  shareToken: "",
};

/**
 * イベントのチェック状態をlocalStorageから読み込む
 */
export function loadStatusMap() {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * イベントのチェック状態をlocalStorageに保存
 */
export function saveStatusMap() {
  if (state.mode !== "editable") {
    return;
  }
  localStorage.setItem(STATUS_KEY, JSON.stringify(state.statusMap));
}

/**
 * ユーザーのXアカウント名をlocalStorageから読み込む
 */
export function loadXAccount() {
  try {
    return localStorage.getItem(X_ACCOUNT_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * ユーザーのXアカウント名をlocalStorageに保存
 */
export function saveXAccount(value) {
  try {
    localStorage.setItem(X_ACCOUNT_KEY, value);
  } catch {
    // no-op
  }
}

/**
 * 現在編集可能モードであるか判定
 */
export function isEditableMode() {
  return state.mode === "editable";
}
