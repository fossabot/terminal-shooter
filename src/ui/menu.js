'use strict';

/** メインメニュー / HOW TO PLAY */
const { C } = require('../config');
const { WEAPONS } = require('../core/weapons');
const { cls, w, centerDisp, drawTitle, hint, printBox, padDisp } = require('./helpers');

function drawMenu() {
  cls();
  w('\n\n');
  drawTitle();
  w('\n');
  w(centerDisp(C.cyan + '~ ターミナル発・銀河防衛シューティング ~' + C.reset, 80) + '\n');
  w('\n\n');
  w(centerDisp(C.bold + '  [S]  STORY MODE 開始' + C.reset, 80) + '\n');
  w(centerDisp(C.bold + '  [H]  HOW TO PLAY' + C.reset, 80) + '\n');
  w(centerDisp(C.bold + '  [Q]  QUIT' + C.reset, 80) + '\n');
  w('\n\n');
  w(C.dim + centerDisp('v1.2.0  by game_ryo', 80) + C.reset + '\n');
  w(C.dim + centerDisp('※ 全5ステージ + ボス戦  /  武器進化・アイテム搭載', 80) + C.reset + '\n');
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
  lines.push('  全5ステージ + ボス戦');
  lines.push('  クリア報酬: スコアボーナス & ライフ+1');
  lines.push('  8000点ごとに エクストラライフ+1');
  lines.push('');
  lines.push('== アイテム（敵撃破で 25% ドロップ） ==');
  lines.push(C.green + '  ♥ ライフ回復' + C.reset + C.dim + padDisp('（最大5個・超過は+500点）', 20) + C.reset);
  lines.push(C.cyan + '  P パワーモード' + C.reset + C.dim + padDisp('（10秒間 最強弾）', 20) + C.reset);
  lines.push(C.gold + '  ★ オーバードライブ' + C.reset + C.dim + padDisp('（10秒間 最強弾+無敵・レア）', 20) + C.reset);
  lines.push('');
  printBox(lines, 52, 1);
  hint('[SPACE] メニューに戻る');
}

module.exports = { drawMenu, drawHelp };
