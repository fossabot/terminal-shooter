'use strict';

/**
 * サバイバルモード結果画面
 */
function drawSurvival(E) {
  const W = E.width;
  const { C } = require('../config');
  
  // 生存時間を計算（秒）
  const survivalTime = E.survivalTime.toFixed(2);
  const bestTime = E.bestSurvivalTime.toFixed(2);
  const isNewRecord = E.survivalTime > E.bestSurvivalTime && E.bestSurvivalTime > 0;
  
  let out = '\x1b[1;1H';
  
  // タイトル
  const title = ' サバイバルモード 結果 ';
  out += '\x1b[K' + C.dim + ' '.repeat(Math.floor((W - title.length) / 2)) + title + ' '.repeat(Math.ceil((W - title.length) / 2)) + C.reset + '\n';
  
  // 結果表示
  out += '\x1b[K' + '\n';
  out += '\x1b[K' + `  生存時間: ${survivalTime}秒 `.padStart(W - 2, ' ') + '\n';
  out += '\x1b[K' + `  ベストタイム: ${bestTime}秒 `.padStart(W - 2, ' ') + '\n';
  
  if (isNewRecord) {
    out += '\x1b[K' + C.gold + '  ★ 新記録！ ★ '.padStart(W - 2, ' ') + C.reset + '\n';
  } else if (E.bestSurvivalTime === 0) {
    out += '\x1b[K' + `  初プレイ！ `.padStart(W - 2, ' ') + '\n';
  }
  
  out += '\x1b[K' + `  最終スコア: ${String(E.score).padStart(6, '0')} `.padStart(W - 2, ' ') + '\n';
  out += '\x1b[K' + `  最高武器: Lv${E.weapon} `.padStart(W - 2, ' ') + '\n';
  
  out += '\x1b[K' + '\n';
  
  // フッター
  const footer = ' [R]リトライ  [M]メニューへ  [Q]終了 ';
  out += '\x1b[K' + footer.substring(0, W - 2) + C.reset;
  
  process.stdout.write(out);
}

module.exports = { drawSurvival };