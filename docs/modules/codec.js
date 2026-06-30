/**
 * codec.js
 * ステータスマップの圧縮エンコード/デコード
 */

import { bytesToBase64Url, base64UrlToBytes } from "./sharing.js";

/**
 * イベントの検査状態をバイト列にエンコード
 * 各イベントに2ビット（見学1ビット + 出展1ビット）を使用
 *
 * @param {Array} events - イベント配列
 * @param {Function} getStatus - (event) => {visit, exhibit} のコールバック
 * @returns {string} Base64URL形式のトークン
 */
export function encodeStatusMap(events, getStatus) {
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

/**
 * Base64URLトークンをステータスマップにデコード
 *
 * @param {string} token - エンコード済みトークン
 * @param {Array} events - イベント配列
 * @param {Function} eventId - (event) => string のコールバック
 * @returns {Object} ステータスマップ {eventId: {visit, exhibit}, ...}
 * @throws {Error} デコード失敗時
 */
export function decodeStatusMap(token, events, eventId) {
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
