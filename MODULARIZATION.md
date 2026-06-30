# ソースコード構造 - モジュール分割ガイド

NTイベント参加チェックのソースコードを 15 個の機能別モジュールに分割しました。メンテナンス性と拡張性が向上しています。

## モジュール構成

### 📁 `/modules/` ディレクトリ

#### 1. **config.js** (定数・DOM要素)
- アプリケーション全体で使用する定数
- DOM要素キャッシュ（`els` オブジェクト）
- リージョン順序定義

**責務**: グローバル設定情報の一元管理

#### 2. **state.js** (状態管理)
- グローバルアプリケーション状態（`state` オブジェクト）
- localStorage との読み書き
- `loadStatusMap()`, `saveStatusMap()`, `loadXAccount()`, `saveXAccount()`

**責務**: アプリケーション状態とローカルストレージの同期

#### 3. **account.js** (Xアカウント検証)
- `isValidXAccount()` - アカウント名妥当性検証（4-15文字、英数字+アンダースコア）
- `extractShareAccountFromLocation()` - URLからアカウント抽出

**責務**: X公式仕様に準拠したアカウント検証

#### 4. **sharing.js** (共有URL・トークン)
- `bytesToBase64Url()`, `base64UrlToBytes()` - Base64URL エンコード/デコード
- `extractShareTokenFromLocation()` - URLからシェアトークン抽出
- `buildShareUrl()` - 共有URL生成
- `getUrlWithoutArgs()` - クエリ/ハッシュ除去

**責務**: 共有URL・トークン処理

#### 5. **codec.js** (ステータスマップ圧縮)
- `encodeStatusMap()` - イベント状態を2ビット/イベント で圧縮
- `decodeStatusMap()` - 圧縮状態をデコード

**責務**: 効率的な状態圧縮・展開（30イベント ≈ 33文字）

#### 6. **data.js** (イベント処理)
- `eventId()` - イベント一意IDの生成
- `getStatus()`, `setStatus()` - ステータス取得/設定
- `eventMatches()` - フィルタリング判定
- `compareEvents()` - ソート比較
- `escapeHtml()`, `csvEscape()` - エスケープ処理
- `plusOneDay()` - 日付操作
- `stateLabel()` - ステータスを日本語表記

**責務**: イベントデータ操作

#### 7. **statistics.js** (統計計算・表示)
- `getCheckStats()` - チェック統計計算
- `updateCheckStats()` - 統計情報をDOMに反映
- `updateStatsOverlayPosition()` - オーバーレイ位置計算

**責務**: 統計表示と位置計算

#### 8. **canvas.js** (キャンバス描画)
- `drawRoundedRect()` - 角丸矩形描画
- `drawCheckboxOnCanvas()` - チェックボックス描画
- `drawStatsOnCanvas()` - 統計ボックス描画
- `getStatsBoxRect()` - ボックス位置計算

**責務**: PNG export 時のキャンバス描画

#### 9. **ui.js** (UI更新・モード)
- `applyModeUi()` - モード別UI表示切り替え
- `setTransientStatus()` - 一時ステータス表示
- `copyShareUrl()` - 共有URL コピー
- `goToEditableMode()` - 編集モードへ遷移

**責務**: UI表示と モード制御

#### 10. **ui-helpers.js** (UI支援関数)
- `checkboxStyle()` - チェックボックスCSSスタイル生成

**責務**: UI関連ユーティリティ

#### 11. **renderer.js** (DOM更新・レンダリング)
- `buildRegionOptions()` - リージョン選択肢生成
- `renderCheckboxLayer()` - チェックボックスレイヤー更新
- `renderEventList()` - イベントリスト更新
- `buildXSearchUrl()` - X検索URL生成

**責務**: DOM レンダリング

#### 12. **filters.js** (フィルタ・ソート・一括操作)
- `applyFilters()` - 検索フィルタと ソート適用
- `setBulkForFiltered()` - 絞り込み結果への一括チェック

**責務**: イベント フィルタリングと ソート

#### 13. **exports.js** (エクスポート機能)
- `exportCsv()` - CSV エクスポート
- `exportPng()` - PNG エクスポート

**責務**: ファイル エクスポート機能

#### 14. **loaders.js** (データロード・共有復元)
- `loadData()` - events.json 読み込み
- `applySharedStatusIfExists()` - 共有URLからのステータス復元
- `applySharedStatusAndRefresh()` - 復元後UI更新

**責務**: 初期データロード と 共有ステータス復元

#### 15. **events.js** (イベントハンドラ・モード管理)
- `initializeMode()` - 初期モード設定
- `syncModeFromLocation()` - URLからモード同期
- `attachEvents()` - 全イベントハンドラ登録
- `handleLayerClick()` - PDF層クリック処理
- `handleEventListChange()` - イベントリスト チェンジ処理

**責務**: アプリケーション イベント管理

---

## 旧コード(app.js)との対応

| 機能 | 旧location | 新location |
|------|-----------|-----------|
| グローバル定数 | app.js (L1-15) | config.js |
| DOM要素キャッシュ | app.js (L17-47) | config.js |
| 状態管理 | app.js (L51-98) | state.js |
| Xアカウント検証 | app.js (L190-211) | account.js |
| トークン処理 | app.js (L112-181) | sharing.js, codec.js |
| イベント操作 | app.js (L256-309) | data.js |
| 統計計算 | app.js (L437-505) | statistics.js |
| Canvas描画 | app.js (L683-787) | canvas.js |
| UI更新 | app.js (L271-363) | ui.js, renderer.js |
| フィルタ処理 | app.js (L339-416) | filters.js |
| エクスポート | app.js (L655-787) | exports.js |
| データロード | app.js (L792-841) | loaders.js |
| イベント登録 | app.js (L843-924) | events.js |

---

## モジュール依存関係図

```
config.js
    ↑
    ├─ state.js
    ├─ account.js
    ├─ sharing.js ← codec.js
    ├─ data.js
    ├─ statistics.js ← canvas.js
    ├─ ui.js ← ui-helpers.js
    ├─ renderer.js
    ├─ filters.js
    ├─ exports.js
    ├─ loaders.js
    └─ events.js
         ↑
         └─ app.js (Entry Point)
```

---

## 使用方法

### index.html に以下を追加

```html
<script type="module" src="./app-new.js"></script>
```

古いスクリプトタグを削除：
```html
<!-- 削除 -->
<script src="app.js"></script>
```

---

## メンテナンス上の利点

### ✅ 利点

1. **単一責任の原則** - 各モジュールが 1 つの役割に集中
2. **再利用性** - 他のプロジェクトでのモジュール流用が容易
3. **テスト容易性** - 各モジュールを独立してテスト可能
4. **保守性** - バグ修正時に関連モジュールを特定しやすい
5. **拡張性** - 新機能追加時の影響範囲が限定的
6. **可読性** - 各ファイルが小規模で理解しやすい

### 🔄 リファクタリング例

**新機能追加**: イベント通知機能を追加
```
新ファイル: notifications.js
変更対象: events.js, loaders.js
```

**バグ修正**: ソート順序の問題
```
対象ファイル: data.js (compareEvents関数)
影響範囲: filters.js が利用
```

---

## 移行チェックリスト

- [ ] `/modules/` 内の 15 個ファイルが全て作成
- [ ] `app-new.js` が正しくインポート
- [ ] index.html で `type="module"` 指定
- [ ] ブラウザ DevTools で循環参照エラーがない
- [ ] 機能テスト (filtering, export, sharing)
- [ ] 旧 `app.js` を削除（バックアップ保管推奨）

---

## 今後の改善案

1. **TypeScript化** - 型安全性向上
2. **ユニットテスト** - Jest/Vitest でテスト網構築
3. **バンドル化** - Vite/esbuild で最適化
4. **PWA化** - Service Worker 追加
5. **国際化** - i18n 対応

