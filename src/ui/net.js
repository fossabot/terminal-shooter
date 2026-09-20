'use strict';

/**
 * オンライン対戦の UI
 *  - ロビー画面（接続状態・プレイヤー一覧・募集中の部屋一覧）
 *  - カスタムAPI設定画面（Cluster ID / API Key の入力・保存）
 */
const { C } = require('../config');
const api = require('../net/api-config');
const net = require('../net/net');
const { cls, w, centerDisp, printBox, hint } = require('./helpers');

/** 接続状態の表示ラベル */
function statusLabel() {
  const N = net.N;
  switch (N.status) {
    case 'off': return 'オフライン';
    case 'connecting': return '接続中…';
    case 'lobby': return N.connected ? 'ロビー接続済' : '再接続中…';
    case 'game': return '対戦部屋';
    default: return N.status;
  }
}

/** ロビー画面 */
function drawLobby(E) {
  cls();
  const N = net.N;
  w('\n');
  w(centerDisp(C.gold + '═  ONLINE LOBBY ═' + C.reset, 80) + '\n');
  w('\n');
  if (E.netDropMsg) {
    w(centerDisp(C.red + ` ⚠ ${E.netDropMsg}` + C.reset, 80) + '\n');
    E.netDropMsg = null;
    w('\n');
  }
  const stColor = N.connected ? C.green : C.red;
  w(centerDisp(` 接続状態: ${stColor}${statusLabel()}${C.reset}   (Cluster: ${N.cluster})`, 80) + '\n');
  w(centerDisp(C.dim + ` あなた: ${N.me}`, 80) + C.reset + '\n');
  w('\n');

  // ロビーのプレイヤー
  const players = [...N.lobby.players];
  w(centerDisp(C.cyan + ` ロビーにいるプレイヤー (${players.length}人)` + C.reset, 80) + '\n');
  if (players.length === 0) {
    w(centerDisp(C.dim + '   （まだ誰もいません）', 80) + C.reset + '\n');
  } else {
    for (const p of players) {
      w(centerDisp('  • ' + p, 80) + '\n');
    }
  }
  w('\n');

  // モード選択
  const modeColor = N.mode === 'coop' ? C.green : C.cyan;
  const modeText = N.mode === 'coop' ? '協力モード' : (N.mode === 'duel' ? '対戦モード' : '未選択');
  w(centerDisp(` ゲームモード: ${modeColor}${modeText}${C.reset}   [D]対戦  [C]協力`, 80) + '\n');
  w('\n');

  // 募集中の部屋
  const rooms = [...N.lobby.rooms.entries()];
  w(centerDisp(C.gold + ` 募集中の部屋 (${rooms.length}件)` + C.reset, 80) + '\n');
  if (rooms.length === 0) {
    w(centerDisp(C.dim + '   （募集中の部屋はありません）', 80) + C.reset + '\n');
  } else {
    rooms.slice(0, 9).forEach(([id, r], i) => {
      const modeIcon = r.mode === 'coop' ? '[C]' : (r.mode === 'duel' ? '[D]' : '[?]');
      w(centerDisp(`  [${i + 1}] ${id} ${modeIcon}  主催: ${r.from}`, 80) + '\n');
    });
  }
  w('\n\n');
  w(centerDisp(C.bold + '  [R] 部屋を作る     [1-9] 部屋に参加     [C] API設定     [B] 戻る     [Q] 終了', 80) + C.reset + '\n');
  if (!N.connected && N.status !== 'off') {
    hint('接続中です…しばらくお待ちください');
  }
}

/** 対戦部屋の待機画面 */
function drawWait() {
  cls();
  const N = net.N;
  w('\n\n\n');
  w(centerDisp(C.gold + '═  対戦部屋を待機中  ═' + C.reset, 80) + '\n');
  w('\n');
  w(centerDisp(C.dim + `  部屋: ${N.room}`, 80) + C.reset + '\n');
  w(centerDisp(C.dim + `  Cluster: ${N.cluster}`, 80) + C.reset + '\n');
  w('\n');
  
  if (N.mode === 'coop') {
    w(centerDisp('  協力モード: 同じフィールドで協力プレイ', 80) + C.reset + '\n');
    if (N.host) {
      w(centerDisp(C.dim + '  ※ ロビーに協力部屋を告知しました。相手が入室すると自動で開始します', 80) + C.reset + '\n');
    } else {
      w(centerDisp(C.dim + '  ※ ホストが開始すると自動で協力プレイが始まります', 80) + C.reset + '\n');
    }
  } else {
    // duel mode (default)
    w(centerDisp('  対戦相手が入室するのを待っています…', 80) + '\n');
    if (N.host) {
      w(centerDisp(C.dim + '  ※ ロビーに部屋を告知しました。相手が入室すると自動で開始します', 80) + C.reset + '\n');
    } else {
      w(centerDisp(C.dim + '  ※ ホストが開始すると自動で対戦が始まります', 80) + C.reset + '\n');
    }
  }
  w('\n\n\n');
  w(centerDisp('  [Q] 中止してロビーへ', 80) + '\n');
}

/** APIキーをマスク表示 */
function maskKey(key) {
  if (!key || key.length <= 4) return key || '（未設定）';
  return key.slice(0, 4) + '••••' + key.slice(-2);
}

/** カスタムAPI設定画面 */
function drawNetConfig(E) {
  cls();
  const cfg = api.current();
  w('\n');
  w(centerDisp(C.gold + '═  CUSTOM API SETTINGS ═' + C.reset, 80) + '\n');
  w('\n');
  w(centerDisp(`  Cluster ID : ${C.cyan}${cfg.cluster}${C.reset}`, 80) + '\n');
  w(centerDisp(`  API Key    : ${C.cyan}${maskKey(cfg.apiKey)}${C.reset}`, 80) + '\n');
  w('\n');
  w(centerDisp(C.dim + '  ※ 設定は ~/.nova-net.json に保存され、次回から優先されます', 80) + C.reset + '\n');
  w('\n\n');
  w(centerDisp(C.bold + '  [E] 編集（入力）     [D] デフォルトに戻す     [B] 戻る     [Q] 終了', 80) + C.reset + '\n');
  w('\n');

  // 入力中なら入力フォームを表示
  if (E.netEdit) {
    const label = E.netEdit === 'cluster' ? 'Cluster ID' : 'API Key';
    const value = E.netInput[E.netEdit] || '';
    w(centerDisp(C.cyan + `  ${label} を入力して Enter → ${value}▍` + C.reset, 80) + '\n');
    w(centerDisp(C.dim + '  [Esc] キャンセル', 80) + C.reset + '\n');
  }
}

module.exports = { drawLobby, drawWait, drawNetConfig, statusLabel, maskKey };
