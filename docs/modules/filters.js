/**
 * filters.js
 * イベントのフィルタリング、ソート、一括操作
 */

import { els } from "./config.js";
import { state, saveStatusMap } from "./state.js";
import { eventMatches, compareEvents, eventId } from "./data.js";
import { renderCheckboxLayer } from "./renderer.js";
import { renderEventList } from "./renderer.js";
import { updateCheckStats } from "./statistics.js";

/**
 * フィルターを適用してリスト更新
 */
export function applyFilters() {
  const keyword = els.keyword.value.trim().toLowerCase();
  const region = els.regionFilter.value;
  state.filtered = state.events.filter((event) => eventMatches(event, keyword, region));
  state.filtered.sort((a, b) => compareEvents(a, b, state.sortOrder));
  els.countVisible.textContent = String(state.filtered.length);
  els.countTotal.textContent = String(state.events.length);
  renderCheckboxLayer();
  updateCheckStats();
  renderEventList();
}

/**
 * フィルタリング済みイベントに対して一括チェック/アンチェック
 *
 * @param {boolean} nextValue - チェック状態
 */
export function setBulkForFiltered(nextValue) {
  if (state.mode !== "editable") {
    return;
  }
  for (const event of state.filtered) {
    const id = eventId(event);
    const current = state.statusMap[id] || { visit: false, exhibit: false };
    state.statusMap[id] = { ...current, visit: nextValue, exhibit: nextValue };
  }
  saveStatusMap();
  renderCheckboxLayer();
  renderEventList();
}
