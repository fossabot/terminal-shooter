'use strict';

/** エンディング（ストーリー + リザルト） */
const { C } = require('../config');
const { cls, w, centerDisp } = require('./helpers');

/** スコア評価 */
function rank(score) {
  if (score >= 50000) return { rank: 'S', color: C.gold };
  if (score >= 35000) return { rank: 'A', color: C.green };
  if (score >= 20000) return { rank: 'B', color: C.cyan };
  if (score >= 10000) return { rank: 'C', color: C.reset };
  return { rank: 'D', color: C.dim };
}

function drawEnding(E) {
  const ES = E.endingState;
  cls();

  if (ES.phase === 'story') {
    w('\n\n');
    w(centerDisp(C.gold + '===  EPILOGUE  ===' + C.reset, 80) + '\n\n');
    for (let p = 0; p < ES.page; p++) {
      const l = ES.lines[p];
      w(centerDisp(C.dim + `「${l.text}」` + C.reset, 80) + '\n');
    }
    const entry = ES.lines[ES.page];
    const typing = ES.char < entry.text.length;
    w(centerDisp(C.cyan + `「${entry.text.slice(0, ES.char)}${typing ? '▍' : ''}」` + C.reset, 80) + '\n');
    w(centerDisp(C.dim + `      ── ${entry.who} ──` + C.reset, 80) + '\n\n');
    w('\n');
    w(centerDisp('  [SPACE] 次へ    [Q] メニューへ', 80) + '\n');
  } else {
    const r = rank(E.score);
    w('\n\n\n');
    w(centerDisp(C.gold + '☆彡  MISSION COMPLETE  ☆彡' + C.reset, 80) + '\n');
    w('\n');
    w(centerDisp('  帝国機甲軍団「バルガン」を撃破し、', 80) + '\n');
    w(centerDisp('  銀河に平和が戻りました。', 80) + '\n\n\n');
    w(centerDisp(`  FINAL SCORE : ${E.score}`, 80) + '\n');
    w(centerDisp(`  撃破数      : ${E.runStats.kills}`, 80) + '\n');
    w(centerDisp(`  武器レベル  : Lv${E.weapon}`, 80) + '\n');
    w(centerDisp(`  総合評価    : ${r.color}${r.rank}${C.reset}`, 80) + '\n\n\n');
    w(centerDisp('  [SPACE] メニューへ    [Q] 終了', 80) + '\n');
  }
}

module.exports = { drawEnding };
