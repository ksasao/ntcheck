/**
 * config.js
 * アプリケーション定数とDOM要素キャッシュ
 */

// API and storage keys
export const DATA_URL = "./events.json";
export const STATUS_KEY = "nt-pdf-check-status-v2";
export const X_ACCOUNT_KEY = "nt-x-account-v1";

// PDF coordinates and sizing
export const CHECK_OFFSET_X = 0.2;
export const CHECK_OFFSET_Y = 8.5;
export const EXPORT_BOX_SIZE = 6.6;
export const X_MAX_IMAGE_SIDE = 4096;

// Sharing and UI
export const X_SEARCH_WINDOW_NAME = "nt-x-search-window";
export const SHARE_PARAM_NAME = "s";

// Stats box positioning
export const STATS_BOX_WIDTH = 94;
export const STATS_BOX_HEIGHT = 36;
export const STATS_BOX_X = 21;
export const STATS_BOX_Y_RATIO = 0.58;
export const STATS_BOX_UPWARD_FACTOR = 1.3;
export const STATS_BOX_UPWARD_CHAR = 16;

// Region ordering
export const REGION_ORDER = ["北陸", "東海", "関東", "関西", "北海道", "東北", "九州", "中国", "海外", "その他", "未分類"];

// DOM element cache
export const els = {
  sourceStatus: document.getElementById("sourceStatus"),
  sourceName: document.getElementById("sourceName"),
  toolbar: document.querySelector(".toolbar"),
  sidePane: document.querySelector(".side-pane"),
  keyword: document.getElementById("keyword"),
  regionFilter: document.getElementById("regionFilter"),
  sortOrder: document.getElementById("sortOrder"),
  xAccount: document.getElementById("xAccount"),
  reloadData: document.getElementById("reloadData"),
  bulkCheckFiltered: document.getElementById("bulkCheckFiltered"),
  bulkUncheckFiltered: document.getElementById("bulkUncheckFiltered"),
  copyShareUrl: document.getElementById("copyShareUrl"),
  startChecking: document.getElementById("startChecking"),
  exportCsv: document.getElementById("exportCsv"),
  exportPng: document.getElementById("exportPng"),
  countVisible: document.getElementById("countVisible"),
  countTotal: document.getElementById("countTotal"),
  countVisitChecked: document.getElementById("countVisitChecked"),
  countExhibitChecked: document.getElementById("countExhibitChecked"),
  rateVisitChecked: document.getElementById("rateVisitChecked"),
  rateExhibitChecked: document.getElementById("rateExhibitChecked"),
  checkStats: document.getElementById("checkStats"),
  xAccountDisplay: document.getElementById("xAccountDisplay"),
  loading: document.getElementById("loading"),
  pdfStage: document.getElementById("pdfStage"),
  pdfImage: document.getElementById("pdfImage"),
  checkboxLayer: document.getElementById("checkboxLayer"),
  eventList: document.getElementById("eventList"),
};
