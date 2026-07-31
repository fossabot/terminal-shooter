'use strict';

/** ステージクリア・報酬画面 */
const { C } = require('../config');
const { stageData } = require('../story/stages');
const { cls, w, centerDisp } = require('./helpers');

function drawClear(E) {
  const st = stageData(E);
  const r = E.reward;
  cls();
  w('\n\n\n');
  w(centerDisp(C.gold + '★★★★★  STAGE CLEAR !  ★★★★★' + C.reset, 80) + '\n');
  w('\n');
  w(centerDisp(` ${st.boss.name} を撃破！` , 80) + '\n\n\n');
  w(centerDisp(C.bold + '== クリア報酬 ==' + C.reset, 80) + '\n');
  w(centerDisp(C.green + `  SCORE  +${r.score} 点（ボス撃破ボーナス）` + C.reset, 80) + '\n');
  w(centerDisp(C.green + `  LIFE   +${r.life}` + C.reset, 80) + '\n');
  if (r.weaponText) w(centerDisp(C.cyan + `  ${r.weaponText}` + C.reset, 80) + '\n');
  w('\n\n');
  w(centerDisp(C.dim + `  TOTAL SCORE: ${E.score}` + C.reset, 80) + '\n');
  w('\n\n');
  w(centerDisp('  [SPACE] 次へ    [Q] メニューへ', 80) + '\n');
}

module.exports = { drawClear };
