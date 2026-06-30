/**
 * ui-helpers.js
 * UI関連ヘルパー関数
 */

import { CHECK_OFFSET_X, CHECK_OFFSET_Y, EXPORT_BOX_SIZE } from "./config.js";
import { state } from "./state.js";

/**
 * チェックボックスのスタイル属性を生成
 *
 * @param {Object} pos - {x, y} 位置
 * @returns {string} CSSスタイル文字列
 */
export function checkboxStyle(pos) {
  const x = ((pos.x + CHECK_OFFSET_X) / state.meta.pdfWidth) * 100;
  const y = ((pos.y + CHECK_OFFSET_Y) / state.meta.pdfHeight) * 100;
  const width = (EXPORT_BOX_SIZE / state.meta.pdfWidth) * 100;
  const height = (EXPORT_BOX_SIZE / state.meta.pdfHeight) * 100;
  return `left:${x}%;top:${y}%;width:${width}%;height:${height}%;`;
}
