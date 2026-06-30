/**
 * account.js
 * X account の検証と管理
 */

/**
 * Xアカウント名の妥当性を検証（公式仕様準拠）
 * 要件: 4-15文字、英数字とアンダースコアのみ
 *
 * @param {string} account - 検証するアカウント名
 * @returns {boolean} 有効なアカウント名はtrue
 */
export function isValidXAccount(account) {
  const cleaned = (account || "").trim().replace(/^@/, "");
  return cleaned.length >= 4 && cleaned.length <= 15 && /^[a-zA-Z0-9_]+$/.test(cleaned);
}

/**
 * URLから共有用アカウント名を抽出（検証済み）
 * ハッシュパラメータの u= を読み込む
 *
 * @returns {string} 有効なアカウント名、無い場合は空文字列
 */
export function extractShareAccountFromLocation() {
  const hash = window.location.hash.startsWith("#") 
    ? window.location.hash.slice(1) 
    : window.location.hash;
  
  if (!hash) {
    return "";
  }
  
  const params = new URLSearchParams(hash);
  const account = params.get("u") || "";
  
  // Validate before returning
  if (isValidXAccount(account)) {
    return account.trim().replace(/^@/, "");
  }
  return "";
}
