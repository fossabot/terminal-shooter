'use strict';

/** ステージ導入ダイアログ（タイプライター風） */
const { C } = require('../config');
const { stageData } = require('../story/stages');
const { cls, w, centerDisp, printBox, padDisp } = require('./helpers');

function drawIntro(E) {
  const st = stageData(E);
  const IS = E.introState;
  const entry = IS.lines[IS.page];
  const name = entry.who;
  const text = entry.text.slice(0, IS.char);

  cls();
  // ヘッダー
  w('\n');
  w(centerDisp(C.gold + `= STAGE ${st.id} / 5 : ${st.title} =` + C.reset, 80) + '\n');
  w(centerDisp(C.dim + st.code + C.reset, 80) + '\n\n');

  // 過去の台詞（それまで読んだページ）
  for (let p = 0; p < IS.page; p++) {
    const l = IS.lines[p];
    w(centerDisp(C.dim + `「${l.text}」` + C.reset, 80) + '\n');
  }

  // 現在の台詞
  const typing = IS.char < entry.text.length;
  w(centerDisp(C.cyan + `「${text}${typing ? '▍' : ''}」` + C.reset, 80) + '\n');
  w(centerDisp(C.dim + `      ── ${name} ──` + C.reset, 80) + '\n\n');

  w(centerDisp(C.dim + `  ${st.waves.length} ウェーブ → ボス ${st.boss.name} 戦` + C.reset, 80) + '\n');
  w('\n');
  w(centerDisp('  [SPACE] 次へ    [Q] メニューへ', 80) + '\n');
}

module.exports = { drawIntro };
