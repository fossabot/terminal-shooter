'use strict';

// ── 画面 ──
const WIDTH = 34;
const HEIGHT = 18;

// ── シンボル ──
const PLAYER = '▲';
const BULLET = '|';
const EBULLET = 'v';
const EXPLODE = ['※', '×', '＋'];

// ── バランス ──
const INIT_LIVES = 3;
const MAX_LIVES = 5;
const TICK_MS = 90;
const MAX_WEAPON = 6;
const EXTRA_LIFE_SCORE = 8000;
const STAGE_CLEAR_LIFE = 1;
const TOTAL_STAGES = 5;

// ── アイテム（敵撃破時のドロップ） ──
const DROP_RATE = 0.25;                 // 敵撃破時のドロップ確率 (25%)
const ITEM_CHARS = { life: '♥', power: 'P', overdrive: '★' };
const ITEM_COLORS = { life: '\x1b[1;32m', power: '\x1b[1;36m', overdrive: '\x1b[1;93m' };
const DROP_WEIGHTS = { life: 0.25, power: 0.5, overdrive: 0.25 };
const POWER_TICKS = 110;                // 10秒 (90ms/tick)
const ITEM_FALL_SPD = 0.35;

// ── 敵タイプ定義 ──
const ENEMY_TYPES = {
  scout: { ch: '▼', hp: 1, sp: 0.35, score: 10, fire: 0 },
  grunt: { ch: '●', hp: 2, sp: 0.45, score: 20, fire: 0.006 },
  tank:  { ch: '◆', hp: 4, sp: 0.22, score: 40, fire: 0.005 },
  diver: { ch: '▽', hp: 1, sp: 0.75, score: 15, fire: 0 },
  elite: { ch: '◉', hp: 6, sp: 0.32, score: 80, fire: 0.012 },
};

// ── ANSI カラー ──
const C = {
  player:  '\x1b[1;36m',
  enemy:   '\x1b[1;31m',
  bullet:  '\x1b[1;33m',
  ebullet: '\x1b[1;35m',
  explode: '\x1b[1;91m',
  boss:    '\x1b[1;95m',
  gold:    '\x1b[1;93m',
  cyan:    '\x1b[1;36m',
  green:   '\x1b[1;32m',
  red:     '\x1b[1;31m',
  frame:   '\x1b[2;37m',
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
};

module.exports = {
  WIDTH, HEIGHT,
  PLAYER, BULLET, EBULLET, EXPLODE,
  INIT_LIVES, MAX_LIVES, TICK_MS, MAX_WEAPON, EXTRA_LIFE_SCORE, STAGE_CLEAR_LIFE, TOTAL_STAGES,
  DROP_RATE, ITEM_CHARS, ITEM_COLORS, DROP_WEIGHTS, POWER_TICKS, ITEM_FALL_SPD,
  ENEMY_TYPES, C,
};
