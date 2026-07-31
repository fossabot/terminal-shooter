'use strict';

/**
 * キーボード入力（raw mode）
 * 既存実装と同じ raw mode で、モードごとにトークンへ変換して配る。
 */
const { stdin } = process;

function setupInput(handler) {
  if (!stdin.isTTY) {
    console.error('⚠️  このゲームはターミナルで実行してください');
    process.exit(1);
  }
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', handler);
}

function cleanup() {
  try { stdin.setRawMode(false); stdin.pause(); } catch { /* noop */ }
  process.stdout.write('\x1b[?25h\x1b[0m\x1b[2J\x1b[H');
}

/** 生キー列 → トークン */
function keyToken(key) {
  if (key === '\x03') return 'ctrl-c';
  if (key === '\r' || key === '\n') return 'enter';
  if (key === ' ') return 'space';
  if (key.length > 1) {
    if (key === '\x1b[C' || key === '\x1bOC') return 'right';
    if (key === '\x1b[D' || key === '\x1bOD') return 'left';
    if (key === '\x1b[A' || key === '\x1bOA') return 'up';
    if (key === '\x1b') return 'esc';
    return null;
  }
  return key.toLowerCase();
}

module.exports = { setupInput, cleanup, keyToken };
