'use strict';

/** UI 共通ヘルパー */
const { C } = require('../config');

function cls() { process.stdout.write('\x1b[2J\x1b[H'); }
function w(s) { process.stdout.write(s); }

/** 表示幅（全角=2） */
function dispLen(s) {
  let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) > 0xff ? 2 : 1;
  return n;
}

function padDisp(s, width) {
  const d = dispLen(s);
  return s + ' '.repeat(Math.max(0, width - d));
}

function centerDisp(s, width) {
  const d = dispLen(s);
  const pad = Math.max(0, Math.floor((width - d) / 2));
  return ' '.repeat(pad) + s;
}

/** 角付きボックスを描く */
function box(lines, width) {
  const out = ['┌' + '─'.repeat(width - 2) + '┐'];
  for (const l of lines) out.push('│' + padDisp(l, width - 2) + '│');
  out.push('└' + '─'.repeat(width - 2) + '┘');
  return out;
}

/** 画面中央にボックスを出力 */
function printBox(lines, width, topPad = 3) {
  const b = box(lines, width);
  const rows = '\n'.repeat(topPad);
  const text = b.map((l) => centerDisp(l, 80)).join('\n');
  w(rows + text + '\n');
}

/** キー操作ヒントを表示 */
function hint(msg) {
  w(C.dim + centerDisp(msg, 80) + C.reset + '\n');
}

// ── タイトルアート（ANSI Shadow）──
const TITLE_ART = [
  '███████╗ █████╗ ██╗      █████╗ ██╗  ██╗██╗   ██╗',
  '██╔════╝██╔══██╗██║     ██╔══██╗╚██╗██╔╝╚██╗ ██╔╝',
  '█████╗  ███████║██║     ███████║ ╚███╔╝  ╚████╔╝ ',
  '██╔══╝  ██╔══██║██║     ██╔══██║ ██╔██╗   ╚██╔╝  ',
  '███████╗██║  ██║███████╗██║  ██║██╔╝ ██╗   ██║   ',
  '╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ',
  '███████╗████████╗██████╗ ██╗██╗  ██╗███████╗',
  '██╔════╝╚══██╔══╝██╔══██╗██║██║ ██╔╝██╔════╝',
  '███████╗   ██║   ██████╔╝██║█████╔╝ █████╗  ',
  '╚════██║   ██║   ██╔══██╗██║██╔═██╗ ██╔══╝  ',
  '███████║   ██║   ██║  ██║██║██║  ██╗███████╗',
  '╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝',
];

function drawTitle() {
  for (const l of TITLE_ART) w(centerDisp(C.gold + l + C.reset, 80) + '\n');
}

module.exports = {
  cls, w, dispLen, padDisp, centerDisp, box, printBox, hint, drawTitle,
};
