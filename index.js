#!/usr/bin/env node

/**
 * Galaxy Strike 🚀
 * ターミナルで動くシューティングゲーム
 *
 * 操作方法:
 *   ← →  or  A D  ... 移動
 *   Space or  W ↑  ... 射撃
 *   P ............. 一時停止
 *   R ............. リスタート (ゲームオーバー時)
 *   Q ............. 終了
 */

const { stdin, stdout } = process;

// ── 設定 ──
const WIDTH = 34;
const HEIGHT = 18;
const PLAYER = '▲';
const BULLET = '|';
const ENEMIES = ['▼', '●', '◆'];
const EXPLODE = ['※', '×', '＋'];
const INIT_LIVES = 3;
const BASE_INTERVAL = 160;

// ── 状態 ──
const S = {
  px: Math.floor(WIDTH / 2),
  py: HEIGHT - 2,
  bullets: [],
  enemies: [],
  explosions: [],
  score: 0,
  lives: INIT_LIVES,
  over: false,
  paused: false,
  tick: 0,
  level: 1,
};

// ── 端末制御 ──
function cls() { stdout.write('\x1b[2J\x1b[H'); }
function loc(x, y) { stdout.write(`\x1b[${y};${x}H`); }
function col(c) { stdout.write(`\x1b[${c}m`); }
function rst() { stdout.write('\x1b[0m'); }
function hide() { stdout.write('\x1b[?25l'); }
function show() { stdout.write('\x1b[?25h'); }

// ── グリッド描画 ──
function render() {
  const g = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(' '));

  // 枠
  for (let x = 0; x < WIDTH; x++) { g[0][x] = '─'; g[HEIGHT - 1][x] = '─'; }
  for (let y = 0; y < HEIGHT; y++) { g[y][0] = '│'; g[y][WIDTH - 1] = '│'; }
  g[0][0] = '┌'; g[0][WIDTH - 1] = '┐';
  g[HEIGHT - 1][0] = '└'; g[HEIGHT - 1][WIDTH - 1] = '┘';

  // タイトル
  const t = ' GALAXY STRIKE ';
  for (let i = 0; i < t.length && i < WIDTH - 2; i++) g[0][1 + i] = t[i];

  // 弾
  for (const b of S.bullets) {
    const bx = Math.floor(b.x), by = Math.floor(b.y);
    if (by > 0 && by < HEIGHT - 1 && bx > 0 && bx < WIDTH - 1) g[by][bx] = BULLET;
  }

  // 敵
  for (const e of S.enemies) {
    const ex = Math.floor(e.x), ey = Math.floor(e.y);
    if (ey > 0 && ey < HEIGHT - 1 && ex > 0 && ex < WIDTH - 1) g[ey][ex] = e.ch;
  }

  // 爆発
  for (const e of S.explosions) {
    const ex = Math.floor(e.x), ey = Math.floor(e.y);
    if (ey > 0 && ey < HEIGHT - 1 && ex > 0 && ex < WIDTH - 1) g[ey][ex] = e.ch;
  }

  // 自機
  if (!S.over) g[S.py][S.px] = PLAYER;

  // 描画
  loc(1, 1);
  let out = '';
  for (let y = 0; y < HEIGHT; y++) {
    out += '\x1b[K';
    for (let x = 0; x < WIDTH; x++) {
      const ch = g[y][x];
      if (ch === PLAYER) out += '\x1b[1;36m▲\x1b[0m';
      else if (ENEMIES.includes(ch)) out += '\x1b[1;31m' + ch + '\x1b[0m';
      else if (ch === BULLET) out += '\x1b[1;33m|\x1b[0m';
      else if (EXPLODE.includes(ch)) out += '\x1b[1;91m' + ch + '\x1b[0m';
      else if (ch === '─' || ch === '│' || ch === '┌' || ch === '┐' || ch === '└' || ch === '┘')
        out += '\x1b[2;37m' + ch + '\x1b[0m';
      else out += ch;
    }
    out += '\x1b[0m\n';
  }

  // HUD
  const hearts = '♥'.repeat(Math.max(0, S.lives)) + '♡'.repeat(Math.max(0, INIT_LIVES - S.lives));
  const hud = ` SCORE:${String(S.score).padStart(6, '0')}  ${hearts}  LV:${S.level}`;
  out += '\x1b[K' + hud.substring(0, WIDTH + 10) + '\n';

  // フッター
  const footer = S.over ? ' GAME OVER!  [R]estart  [Q]uit  ' :
                 S.paused ? ' ⏸ PAUSED  [P] resume  ' :
                 ' ← →/A D:move  Space/W:shot  P:pause  Q:quit  ';
  out += '\x1b[K' + footer.substring(0, WIDTH + 20);

  stdout.write(out);
}

// ── ゲーム更新 ──
function update() {
  if (S.over || S.paused) return;
  S.tick++;
  S.level = 1 + Math.floor(S.tick / 150);
  const rate = Math.max(2, 8 - Math.floor(S.level / 2));

  // スポーン
  if (S.tick % rate === 0 && S.enemies.length < 14) {
    S.enemies.push({
      x: 1 + Math.random() * (WIDTH - 3),
      y: 1,
      ch: ENEMIES[Math.floor(Math.random() * 3)],
      hp: Math.random() < 0.15 ? 2 : 1,
      sp: 0.3 + Math.random() * 0.4 + S.level * 0.04,
    });
  }

  // 弾移動
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    S.bullets[i].y -= 0.8;
    if (S.bullets[i].y < 1) S.bullets.splice(i, 1);
  }

  // 敵移動
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    S.enemies[i].y += 0.15 * S.enemies[i].sp;
  }

  // 衝突（弾 vs 敵）
  for (let bi = S.bullets.length - 1; bi >= 0; bi--) {
    for (let ei = S.enemies.length - 1; ei >= 0; ei--) {
      const b = S.bullets[bi], e = S.enemies[ei];
      if (Math.abs(b.x - e.x) < 0.8 && Math.abs(b.y - e.y) < 0.8) {
        e.hp--;
        S.bullets.splice(bi, 1);
        if (e.hp <= 0) {
          S.explosions.push({ x: e.x, y: e.y, t: 6, ch: EXPLODE[Math.floor(Math.random() * 3)] });
          S.score += 10 * S.level;
          S.enemies.splice(ei, 1);
        }
        break;
      }
    }
  }

  // 敵が底 or 自機衝突
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    if (e.y >= HEIGHT - 1) {
      S.lives--;
      S.explosions.push({ x: e.x, y: HEIGHT - 2, t: 8, ch: '×' });
      S.enemies.splice(i, 1);
      if (S.lives <= 0) S.over = true;
    } else if (Math.abs(e.x - S.px) < 0.8 && Math.abs(e.y - S.py) < 0.8) {
      S.lives -= 2;
      S.explosions.push({ x: S.px, y: S.py, t: 10, ch: '※' });
      S.enemies.splice(i, 1);
      if (S.lives <= 0) S.over = true;
    }
  }

  // 爆発更新
  for (let i = S.explosions.length - 1; i >= 0; i--) {
    S.explosions[i].t--;
    if (S.explosions[i].t <= 0) S.explosions.splice(i, 1);
  }
}

// ── リセット ──
function reset() {
  S.px = Math.floor(WIDTH / 2);
  S.py = HEIGHT - 2;
  S.bullets = [];
  S.enemies = [];
  S.explosions = [];
  S.score = 0;
  S.lives = INIT_LIVES;
  S.over = false;
  S.paused = false;
  S.tick = 0;
  S.level = 1;
}

// ── 入力 ──
function setupInput() {
  if (!stdin.isTTY) {
    console.error('⚠️  このゲームはターミナルで実行してください');
    process.exit(1);
  }
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', (key) => {
    // Ctrl+C
    if (key === '\x03') { cleanup(); process.exit(0); }
    if (key.length > 1) {
      // 矢印キー
      if (key === '\x1b[C' || key === '\x1bOC') { if (!S.over && !S.paused) S.px = Math.min(WIDTH - 2, S.px + 1); }
      if (key === '\x1b[D' || key === '\x1bOD') { if (!S.over && !S.paused) S.px = Math.max(1, S.px - 1); }
      if (key === '\x1b[A' || key === '\x1bOA') shoot();
      return;
    }
    switch (key) {
      case 'a': case 'A': if (!S.over && !S.paused) S.px = Math.max(1, S.px - 1); break;
      case 'd': case 'D': if (!S.over && !S.paused) S.px = Math.min(WIDTH - 2, S.px + 1); break;
      case 'w': case 'W': case ' ': shoot(); break;
      case 'p': case 'P': S.paused = !S.paused; break;
      case 'r': case 'R': if (S.over) reset(); break;
      case 'q': case 'Q': cleanup(); process.exit(0); break;
    }
  });
}

function shoot() {
  if (S.over || S.paused) return;
  S.bullets.push({ x: S.px, y: S.py - 1 });
}

// ── クリーンアップ ──
function cleanup() {
  if (iv) clearInterval(iv);
  show(); rst(); loc(1, HEIGHT + 4);
  stdout.write('\n');
  try { stdin.setRawMode(false); stdin.pause(); } catch {}
}

// ── メイン ──
let iv;
function main() {
  cls(); hide();
  setupInput();
  iv = setInterval(() => {
    update();
    render();
    // 動的スピード調整
    const target = Math.max(70, BASE_INTERVAL - S.level * 6);
    if (iv._interval !== target && !S.over) {
      clearInterval(iv);
      iv = setInterval(() => { update(); render(); }, target);
      iv._interval = target;
    }
  }, BASE_INTERVAL);
  iv._interval = BASE_INTERVAL;

  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}

main();
