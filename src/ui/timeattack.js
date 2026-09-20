'use strict';

/**
 * タイムアタックモード結果画面
 */
function drawTimeAttack(E) {
  const W = E.width;
  const { C } = require('../config');
  
  // 合計タイムを計算（秒）
  const totalTime = E.stageTimes.reduce((sum, t) => sum + (t || 0), 0);
  const bestTime = E.bestTimeAttackTime.toFixed(2);
  const isNewRecord = totalTime < E.bestTimeAttackTime && E.bestTimeAttackTime > 0;
  
  let out = '\x1b[1;1H';
  
  // タイトル
  const title = ' タイムアタックモード 結果 ';
  out += '\x1b[K' + C.dim + ' '.repeat(Math.floor((W - title.length) / 2)) + title + ' '.repeat(Math.ceil((W - title.length) / 2)) + C.reset + '\n';
  
  // 結果表示
  out += '\x1b[K' + '\n';
  out += '\x1b[K' + `  合計タイム: ${totalTime.toFixed(2)}秒 `.padStart(W - 2, ' ') + '\n';
  out += '\x1b[K' + `  ベストタイム: ${bestTime}秒 `.padStart(W - 2, ' ') + '\n';
  
  if (isNewRecord) {
    out += '\x1b[K' + C.gold + '  ★ 新記録！ ★ '.padStart(W - 2, ' ') + C.reset + '\n';
  } else if (E.bestTimeAttackTime === 0) {
    out += '\x1b[K' + `  初プレイ！ `.padStart(W - 2, ' ') + '\n';
  }
  
  out += '\x1b[K' + '\n';
  
  // ステージ別タイム表示
  out += '\x1b[K' + C.dim + ' ステージ別タイム ' + C.reset + '\n';
  for (let i = 0; i < E.stageTimes.length; i++) {
    const stageNum = i + 1;
    const stageTime = E.stageTimes[i] || 0;
    const timeStr = stageTime.toFixed(2);
    out += '\x1b[K' + `  Stage ${stageNum}: ${timeStr}s `.padStart(W - 2, ' ') + '\n';
  }
  
  out += '\x1b[K' + '\n';
  
  // フッター
  const footer = ' [R]リトライ  [M]メニューへ  [Q]終了 ';
  out += '\x1b[K' + footer.substring(0, W - 2) + C.reset;
  
  process.stdout.write(out);
}

module.exports = { drawTimeAttack };