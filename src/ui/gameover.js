'use strict';

/** ゲームオーバー画面 */
const { C } = require('../config');
const { WEAPONS } = require('../core/weapons');
const { cls, w, centerDisp } = require('./helpers');

function drawGameOver(E) {
  cls();
  w('\n\n\n');
  w(centerDisp(C.red + '***  GAME OVER  ***' + C.reset, 80) + '\n');
  w('\n\n');
  w(centerDisp(`  SCORE  : ${E.score}`, 80) + '\n');
  w(centerDisp(`  STAGE  : ${E.stage} / 5`, 80) + '\n');
  w(centerDisp(`  WEAPON : Lv${E.weapon} ${WEAPONS[E.weapon - 1].name}`, 80) + '\n');
  w(centerDisp(`  KILLS  : ${E.runStats.kills}`, 80) + '\n');
  w('\n\n');
  w(centerDisp('  [R] ステージ再挑戦    [M] メニュー    [Q] 終了', 80) + '\n');
}

module.exports = { drawGameOver };
