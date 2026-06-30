/**
 * renderer.js
 * DOM更新とレンダリング
 */

import { els, REGION_ORDER, X_SEARCH_WINDOW_NAME } from "./config.js";
import { state } from "./state.js";
import { eventId, getStatus, escapeHtml, plusOneDay } from "./data.js";
import { checkboxStyle } from "./ui-helpers.js";
import { updateCheckStats } from "./statistics.js";

/**
 * リージョンオプションを生成して表示
 */
export function buildRegionOptions() {
  const regions = [...new Set(state.events.map((e) => e.region))].sort((a, b) => {
    return REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b);
  });
  els.regionFilter.innerHTML = [
    '<option value="all">すべて</option>',
    ...regions.map((region) => `<option value="${region}">${region}</option>`),
  ].join("");
}

/**
 * チェックボックスレイヤーをレンダリング
 */
export function renderCheckboxLayer() {
  els.checkboxLayer.innerHTML = state.events.flatMap((event) => {
    if (!event.checkVisit || !event.checkExhibit) {
      return [];
    }

    const id = eventId(event);
    const status = getStatus(event);

    const visit = `<button class="pdf-check${status.visit ? " checked" : ""}" data-id="${encodeURIComponent(id)}" data-type="visit" type="button" style="${checkboxStyle(event.checkVisit)}" title="見学: ${escapeHtml(event.name)}" aria-label="見学: ${escapeHtml(event.name)}"></button>`;
    const exhibit = `<button class="pdf-check${status.exhibit ? " checked" : ""}" data-id="${encodeURIComponent(id)}" data-type="exhibit" type="button" style="${checkboxStyle(event.checkExhibit)}" title="出展: ${escapeHtml(event.name)}" aria-label="出展: ${escapeHtml(event.name)}"></button>`;
    return [visit, exhibit];
  }).join("");

  updateCheckStats();
}

/**
 * X検索URLを生成
 *
 * @param {Object} event - イベントオブジェクト
 * @returns {string} X検索URL
 */
export function buildXSearchUrl(event) {
  const account = (els.xAccount?.value || "").trim().replace(/^@/, "");
  const terms = [`since:${event.dateStart}`, `until:${plusOneDay(event.dateEnd)}`];
  if (account) {
    terms.push(`from:${account}`);
  }
  const query = terms.join(" ");
  return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
}

/**
 * イベントリストをレンダリング
 */
export function renderEventList() {
  if (!state.filtered.length) {
    els.eventList.innerHTML = "<li class=\"event-item\">該当イベントがありません。</li>";
    return;
  }

  els.eventList.innerHTML = state.filtered
    .map((event) => {
      const status = getStatus(event);
      const searchUrl = buildXSearchUrl(event);
      const encodedId = encodeURIComponent(eventId(event));
      return `
        <li class="event-item">
          <h3><a class="x-search-link" href="${searchUrl}" target="${X_SEARCH_WINDOW_NAME}" title="Xで期間検索を開く">${escapeHtml(event.name)}</a></h3>
          <p>${escapeHtml(event.region)} / ${escapeHtml(event.dateText)}</p>
          <div class="event-controls">
            <label><input type="checkbox" data-id="${encodedId}" data-type="visit" ${status.visit ? "checked" : ""} />見学</label>
            <label><input type="checkbox" data-id="${encodedId}" data-type="exhibit" ${status.exhibit ? "checked" : ""} />出展</label>
          </div>
        </li>
      `;
    })
    .join("");
}
