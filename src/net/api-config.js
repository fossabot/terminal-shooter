'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 *  📡 オンライン対戦の設定ファイル（ここを編集！）
 * ═══════════════════════════════════════════════════════════════
 *
 *  PieSocket（https://www.piesocket.com）で無料アカウントを作り、
 *  Channels ダッシュボードに表示される 自分の Cluster ID と API Key を
 *  下の2つの定数に入れてください。
 *
 *  ┌ 手順 ─────────────────────────────────────────────
 *  │ 1. piesocket.com で Sign Up（無料プランOK）
 *  │ 2. Channels ダッシュボードで Cluster を確認
 *  │ 3. 表示された Cluster ID / API Key を下にコピー
 *  └───────────────────────────────────────────────────
 *
 *  ※ ゲーム内メニューの [N] ONLINE → [C] 設定 からも
 *     自分の Cluster ID / API Key を入力できます（そちらが優先）。
 */

/** [1] Cluster ID（あなたのクラスターID） */
const DEFAULT_CLUSTER = 'free.blr2';

/** [2] API Key（あなたのAPIキー） */
const DEFAULT_API_KEY = 'mrNnn0dxKqc4shXNVblyOTgxoIkxu6CcxjVILcvg';

// ────────────────────────────────────────────────
// ▼ 以下は通常編集不要
// ────────────────────────────────────────────────
const os = require('os');
const path = require('path');
const fs = require('fs');

/** ロビー（共通ルーム）のルームID */
const LOBBY_ROOM = 'home';

/** ゲーム部屋IDの接頭辞（例: stone_12345） */
const ROOM_PREFIX = 'stone_';

/** カスタム設定の保存先ファイル */
const CONFIG_PATH =
  process.env.NOVA_NET_CONFIG || path.join(os.homedir(), '.nova-net.json');

/** 保存済みカスタム設定を読む（なければ null） */
function loadCustom() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/** カスタム設定を保存 */
function saveCustom(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

/** デフォルトのプレイヤー名 */
function defaultName() {
  return 'NOVA-' + Math.floor(100 + Math.random() * 900);
}

/** 現在有効な設定（カスタム保存があればそちら優先） */
function current() {
  const c = loadCustom();
  return {
    cluster: (c && c.cluster) || DEFAULT_CLUSTER,
    apiKey: (c && c.apiKey) || DEFAULT_API_KEY,
    name: (c && c.name) || defaultName(),
  };
}

/** カスタム設定を破棄してデフォルトに戻す */
function resetCustom() {
  try { fs.unlinkSync(CONFIG_PATH); } catch { /* なければ無視 */ }
}

module.exports = {
  DEFAULT_CLUSTER,
  DEFAULT_API_KEY,
  LOBBY_ROOM,
  ROOM_PREFIX,
  CONFIG_PATH,
  loadCustom,
  saveCustom,
  current,
  resetCustom,
};
