/**
 * sharing.js
 * 共有URL、トークンの生成と復元
 */

import { SHARE_PARAM_NAME } from "./config.js";
import { state } from "./state.js";
import { isValidXAccount } from "./account.js";
import { els } from "./config.js";

/**
 * バイト列をBase64URL形式にエンコード
 *
 * @param {Uint8Array} bytes
 * @returns {string} Base64URL文字列
 */
export function bytesToBase64Url(bytes) {
  if (!bytes.length) {
    return "";
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Base64URL形式をバイト列にデコード（セキュリティ検証付き）
 *
 * @param {string} value - Base64URL文字列
 * @returns {Uint8Array} デコード済みバイト列
 * @throws {Error} 不正なフォーマットの場合
 */
export function base64UrlToBytes(value) {
  if (!value) {
    return new Uint8Array();
  }
  
  // Validate token length (max 10KB)
  if (value.length > 10240) {
    throw new Error("Token too long");
  }
  
  // Validate base64url characters
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid base64url characters");
  }
  
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * URLからシェアトークンを抽出
 * クエリパラメータまたはハッシュパラメータから取得
 *
 * @returns {string} シェアトークン、無い場合は空文字列
 */
export function extractShareTokenFromLocation() {
  const query = new URLSearchParams(window.location.search).get(SHARE_PARAM_NAME);
  if (query) {
    return query;
  }

  const hash = window.location.hash.startsWith("#") 
    ? window.location.hash.slice(1) 
    : window.location.hash;
  
  if (!hash) {
    return "";
  }
  
  const params = new URLSearchParams(hash);
  return params.get(SHARE_PARAM_NAME) || "";
}

/**
 * 共有URLを生成
 *
 * @param {Array} events - イベント配列
 * @returns {string} 共有URL
 */
export function buildShareUrl(encodeStatusMap) {
  const token = encodeStatusMap(state.events);
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
 * URLパラメータなしのクリーンなURLを取得
 *
 * @returns {string} ベースURL
 */
export function getUrlWithoutArgs() {
  const url = new URL(window.location.href);
  return `${url.origin}${url.pathname}`;
}
