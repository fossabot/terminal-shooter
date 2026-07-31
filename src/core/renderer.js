'use strict';

/**
 * プレイ画面のレンダラー
 * グリッドを1文字単位で組み立て、1フレーム分をまとめて描画する。
 */
const {
  WIDTH, HEIGHT, PLAYER, BULLET, EBULLET, EXPLODE, ENEMY_TYPES, INIT_LIVES, C,
  ITEM_CHARS, ITEM_COLORS, POWER_TICKS,
} = require('../config');
const { WEAPONS } = require('./weapons');
const { stageData } = require('../story/stages');

const ENEMY_CHARS = new Set(Object.values(ENEMY_TYPES).map((t) => t.ch));
const ITEM_COLORS_BY_CHAR = {};
for (const [type, ch] of Object.entries(ITEM_CHARS)) ITEM_COLORS_BY_CHAR[ch] = ITEM_COLORS[type];

function renderGame(E) {
  const g = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(' '));

  // 枠
  for (let x = 0; x < WIDTH; x++) { g[0][x] = '─'; g[HEIGHT - 1][x] = '─'; }
  for (let y = 0; y < HEIGHT; y++) { g[y][0] = '│'; g[y][WIDTH - 1] = '│'; }
  g[0][0] = '┌'; g[0][WIDTH - 1] = '┐';
  g[HEIGHT - 1][0] = '└'; g[HEIGHT - 1][WIDTH - 1] = '┘';

  // タイトル行
  const t = ' NOVA ';
  for (let i = 0; i < t.length && i < WIDTH - 2; i++) g[0][1 + i] = t[i];

  // 自機弾
  for (const b of E.bullets) {
    const bx = Math.floor(b.x), by = Math.floor(b.y);
    if (by > 0 && by < HEIGHT - 1 && bx > 0 && bx < WIDTH - 1) g[by][bx] = BULLET;
  }

  // 雑魚敵
  for (const e of E.enemies) {
    const ex = Math.floor(e.x), ey = Math.floor(e.y);
    if (ey > 0 && ey < HEIGHT - 1 && ex > 0 && ex < WIDTH - 1) g[ey][ex] = e.ch;
  }

  // ボス
  if (E.boss) {
    const bx = Math.floor(E.boss.x), by = Math.floor(E.boss.y);
    if (by > 0 && by < HEIGHT - 1 && bx > 0 && bx < WIDTH - 1) g[by][bx] = E.boss.ch;
  }

  // 敵弾
  for (const eb of E.ebullets) {
    const ex = Math.floor(eb.x), ey = Math.floor(eb.y);
    if (ey > 0 && ey < HEIGHT - 1 && ex > 0 && ex < WIDTH - 1) g[ey][ex] = EBULLET;
  }

  // アイテム
  for (const it of E.items) {
    const ix = Math.floor(it.x), iy = Math.floor(it.y);
    if (iy > 0 && iy < HEIGHT - 1 && ix > 0 && ix < WIDTH - 1) g[iy][ix] = it.ch;
  }

  // 爆発
  for (const ex of E.explosions) {
    const exx = Math.floor(ex.x), eyy = Math.floor(ex.y);
    if (eyy > 0 && eyy < HEIGHT - 1 && exx > 0 && exx < WIDTH - 1) g[eyy][exx] = ex.ch;
  }

  // 自機（無敵中はブリンク）
  if (!E.over) {
    const blink = E.invuln > 0 && Math.floor(E.tick / 6) % 2 === 0;
    g[E.py][E.px] = blink ? ' ' : PLAYER;
  }

  // ウェーブ/ボスバナー（グリッド中央に重ねる）
  if (E.waveBanner) {
    const msg = `<< ${E.waveBanner.text} >>`;
    const sx = Math.max(1, Math.floor((WIDTH - msg.length) / 2));
    const sy = Math.floor(HEIGHT / 2);
    for (let i = 0; i < msg.length && sx + i < WIDTH - 1; i++) g[sy][sx + i] = msg[i];
  }

  // ── 描画 ──
  const bossCh = E.boss ? E.boss.ch : null;
  let out = '\x1b[1;1H';
  for (let y = 0; y < HEIGHT; y++) {
    out += '\x1b[K';
    for (let x = 0; x < WIDTH; x++) {
      const ch = g[y][x];
      if (ch === ' ') { out += ' '; continue; }
      if (ch === PLAYER) out += C.player + PLAYER + C.reset;
      else if (ch === BULLET) out += C.bullet + ch + C.reset;
      else if (ch === EBULLET) out += C.ebullet + ch + C.reset;
      else if (ITEM_COLORS_BY_CHAR[ch]) out += ITEM_COLORS_BY_CHAR[ch] + ch + C.reset;
      else if (bossCh && ch === bossCh) out += C.boss + ch + C.reset;
      else if (ch === ENEMY_TYPES.elite.ch) out += '\x1b[1;35m' + ch + C.reset;
      else if (ENEMY_CHARS.has(ch)) out += C.enemy + ch + C.reset;
      else if (EXPLODE.includes(ch)) out += C.explode + ch + C.reset;
      else if (ch === '─' || ch === '│' || ch === '┌' || ch === '┐' || ch === '└' || ch === '┘')
        out += C.frame + ch + C.reset;
      else if (ch === '<' || ch === '>' || ch === '!') out += C.gold + ch + C.reset;
      else out += ch;
    }
    out += C.reset + '\n';
  }

  // ── HUD ──
  const st = stageData(E);
  const hearts = '♥'.repeat(Math.max(0, E.lives)) + '♡'.repeat(Math.max(0, INIT_LIVES - Math.min(INIT_LIVES, E.lives)));
  const wname = WEAPONS[E.weapon - 1] ? WEAPONS[E.weapon - 1].name : '';
  const hud = ` SCORE:${String(E.score).padStart(6, '0')}  ${hearts}  ST:${E.stage}/5  WPN:Lv${E.weapon} ${wname}`;
  out += '\x1b[K' + hud.substring(0, WIDTH + 14) + C.reset + '\n';

  // パワー/オーバードライブ タイマー
  if (E.power > 0 || E.overdrive > 0) {
    const t = Math.max(E.power, E.overdrive);
    const secs = Math.ceil(t / (POWER_TICKS / 10));
    const filled = Math.round((t / POWER_TICKS) * 10);
    const label = E.overdrive > 0 ? '★ OVERDRIVE' : 'P POWER';
    const color = E.overdrive > 0 ? C.gold : C.cyan;
    out += '\x1b[K' + color + ` ${label} ${secs}s ${'█'.repeat(filled)}${'░'.repeat(10 - filled)}` + C.reset + '\n';
  } else {
    out += '\x1b[K' + '\n';
  }

  // トースト（実績・アイテム告知）
  if (E.toast) {
    out += '\x1b[K' + C.gold + E.toast.text.substring(0, WIDTH + 10) + C.reset + '\n';
  } else {
    out += '\x1b[K' + '\n';
  }

  // ボス HP バー
  if (E.boss) {
    const filled = Math.round((E.boss.hp / E.boss.maxHp) * 10);
    const bar = C.boss + ` BOSS ${E.boss.ch} ` + '█'.repeat(filled) + '░'.repeat(10 - filled) + C.reset;
    out += '\x1b[K' + bar + '\n';
  } else {
    out += '\x1b[K' + C.dim + ` 残ウェーブ:${E.wave + 1}/${st.waves.length}` + C.reset + '\n';
  }

  // ── フッター ──
  let footer;
  if (E.over) footer = ' GAME OVER!  [R]再挑戦  [M]メニュー  [Q]終了  ';
  else if (E.paused) footer = ' ** PAUSED **  [P]再開  [R]リトライ  [M]メニュー  [Q]終了  ';
  else footer = ' ←→/AD:移動  Space/W:射撃  P:一時停止  Q:終了  ';
  out += '\x1b[K' + footer.substring(0, WIDTH + 22) + C.reset;

  process.stdout.write(out);
}

module.exports = { renderGame };
