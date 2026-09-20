'use strict';

/** メインメニュー / HOW TO PLAY */
const { C } = require('../config');
const { WEAPONS } = require('../core/weapons');
const { cls, w, centerDisp, drawTitle, hint, printBox, padDisp } = require('./helpers');

function drawMenu(E) {
  cls();
  w('\n\n');
  drawTitle();
  w('\n');
  w(centerDisp(C.cyan + '~ ターミナル発・銀河防衛シューティング ~' + C.reset, 80) + '\n');
  w('\n\n');
  w(centerDisp(C.bold + '  [S]  STORY MODE 開始' + C.reset, 80) + '\n');
  w(centerDisp(C.bold + '  [V]  サバイバルモード' + C.reset, 80) + '\n');
  w(centerDisp(C.bold + '  [T]  タイムアタックモード' + C.reset, 80) + '\n');
  w(centerDisp(C.gold + '  [N]  ONLINE MODE（デュエル・協力ロビー）' + C.reset, 80) + '\n');
  const large = E && E.sizeMode === 'large';
  w(centerDisp((large ? C.green : C.dim) + `  [L]  大画面モード: ${large ? 'ON  (50×22)' : 'OFF (34×18)'}` + C.reset, 80) + '\n');
  w(centerDisp(C.bold + '  [H]  HOW TO PLAY' + C.reset, 80) + '\n');
  w(centerDisp(C.bold + '  [Q]  QUIT' + C.reset, 80) + '\n');
  w('\n\n');
  w(C.dim + centerDisp('NOVA v1.5.0  by game_ryo', 80) + C.reset + '\n');
  w(C.dim + centerDisp('※ 全7ステージ + ボス戦  /  サバイバル・タイムアタックモード  /  武器進化・アイテム搭載  /  オンライン対戦（デュエル・協力）  /  大画面モード', 80) + C.reset + '\n');
}

function drawHelp() {
  cls();
  const lines = [
    '== 操作方法 ==',
    '  ← → / A D ........ 移動',
    '  Space / W / ↑ ..... 射撃',
    '  P ............... 一時停止',
    '  Q ............... 終了 / 戻る',
    '  R ............... 再挑戦（ゲームオーバー時）',
    '',
    '== 武器進化（ステージクリアで強化） ==',
  ];
  for (const wp of WEAPONS) {
    lines.push(C.dim + `  Lv${wp.lv} ${padDisp(wp.name, 22)} ${wp.desc}` + C.reset);
  }
  lines.push('');
lines.push('== ステージ ==');
    lines.push('  全7ステージ + ボス戦');
    lines.push('  クリア報酬: スコアボーナス & ライフ+1');
    lines.push('  8000点ごとに エクストラライフ+1');
  lines.push('');
  lines.push('== アイテム（敵撃破で 25% ドロップ） ==');
lines.push(C.green + '  ♥ ライフ回復' + C.reset + C.dim + padDisp('（最大5個・超過は+500点）', 20) + C.reset);
    lines.push(C.cyan + '  P パワーモード' + C.reset + C.dim + padDisp('（10秒間 最強弾）', 20) + C.reset);
    lines.push(C.gold + '  ★ オーバードライブ' + C.reset + C.dim + padDisp('（10秒間 最強弾+無敵・レア）', 20) + C.reset);
    lines.push('');
    lines.push('== サバイバルモード ==');
    lines.push('  無限ウェーブで敵を撃ち続けるモード');
    lines.push('  時間経過と共に難易度が上昇');
    lines.push('  生存時間を競うハイスコアモード');
    lines.push('  協力モードでもプレイ可能');
    lines.push('');
    lines.push('== タイムアタックモード ==');
    lines.push('  全ステージを最速でクリアするモード');
    lines.push('  各ステージのタイムを記録');
    lines.push('  協力モードでもプレイ可能');
    lines.push('');
    lines.push('== オンライン対戦 ==');
  lines.push('  メニューで [N] を押すとロビーへ');
  lines.push('  [R] 部屋を作る → ロビーに告知らせ → 相手を待つ');
  lines.push('  [1-9] 募集中の部屋に参加');
  lines.push('  [D] デュエルモード選択 / [C] 協力モード選択');
  lines.push('  デュエル: 2人が揃うと左右に分かれて対戦（位置同期）');
  lines.push('  協力: 同じフィールドに並んで協力プレイ（位置同期）');
  lines.push('  相手の機体は緑色で表示されます');
  lines.push('  ※ 通信には PieSocket を使用（Cluster ID / API Key は設定画面で変更可）');
  lines.push('');
  lines.push('== 大画面モード ==');
  lines.push('  メニューで [L] を押すと切替');
  lines.push('  標準 34×18 → 大画面 50×22 にフィールドが拡大');
  lines.push('  広いターミナルで遊ぶときにおすすめ');
  lines.push('');
  printBox(lines, 52, 1);
  hint('[SPACE] メニューに戻る');
}

module.exports = { drawMenu, drawHelp };
