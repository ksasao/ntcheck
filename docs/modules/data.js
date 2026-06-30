/**
 * data.js
 * イベントデータ処理とステータス管理
 */

import { REGION_ORDER } from "./config.js";
import { state, saveStatusMap } from "./state.js";

/**
 * イベントの一意なIDを生成
 *
 * @param {Object} event - イベントオブジェクト
 * @returns {string} イベントID
 */
export function eventId(event) {
  return `${event.name}|${event.dateStart}|${event.region}`;
}

/**
 * イベントのステータスを取得
 *
 * @param {Object} event - イベントオブジェクト
 * @returns {Object} {visit: boolean, exhibit: boolean}
 */
export function getStatus(event) {
  return state.statusMap[eventId(event)] || { visit: false, exhibit: false };
}

/**
 * イベントのステータスを設定
 *
 * @param {Object} event - イベントオブジェクト
 * @param {string} key - "visit" または "exhibit"
 * @param {boolean} value - チェック状態
 */
export function setStatus(event, key, value) {
  const id = eventId(event);
  const current = state.statusMap[id] || { visit: false, exhibit: false };
  state.statusMap[id] = { ...current, [key]: value };
  saveStatusMap();
}

/**
 * ステータスを日本語表記に変換
 *
 * @param {Object} status - {visit, exhibit}
 * @returns {string} 日本語表記
 */
export function stateLabel(status) {
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

/**
 * イベントがキーワードとリージョンにマッチするか判定
 *
 * @param {Object} event - イベントオブジェクト
 * @param {string} keyword - 検索キーワード
 * @param {string} region - リージョン("all"で全選択)
 * @returns {boolean} マッチ判定
 */
export function eventMatches(event, keyword, region) {
  if (region !== "all" && event.region !== region) {
    return false;
  }
  if (!keyword) {
    return true;
  }
  const text = `${event.name} ${event.region} ${event.dateText}`.toLowerCase();
  return text.includes(keyword);
}

/**
 * イベント配列をソート
 *
 * @param {Object} a - イベントA
 * @param {Object} b - イベントB
 * @param {string} order - ソート順序("date_asc", "date_desc", "name_asc", "name_desc", "region_asc")
 * @returns {number} ソート結果
 */
export function compareEvents(a, b, order) {
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

/**
 * 1日進める（ISO形式日付）
 *
 * @param {string} isoDate - ISO形式日付(YYYY-MM-DD)
 * @returns {string} 1日後の日付
 */
export function plusOneDay(isoDate) {
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

/**
 * CSVセルをエスケープ
 *
 * @param {*} value - セル値
 * @returns {string} エスケープ済みセル値
 */
export function csvEscape(value) {
  const text = String(value ?? "");
  if (/[\",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * HTMLをエスケープ
 *
 * @param {*} value - エスケープ対象
 * @returns {string} エスケープ済みHTML
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
