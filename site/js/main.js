'use strict';

/* ============================================================
   NOVA 公式サイト
   1. 星背景アニメーション
   2. npx コマンドのコピーボタン
   3. スクロール出現アニメーション
   4. ブラウザで遊べるミニデモ（ターミナル版の簡易再現）
   ============================================================ */

// ── 1. 星背景 ──
(function makeStars() {
  const wrap = document.getElementById('stars');
  if (!wrap) return;
  const count = Math.min(140, Math.floor(window.innerWidth / 9));
  for (let i = 0; i < count; i++) {
    const star = document.createElement('i');
    const size = Math.random() < 0.85 ? 1 : 2;
    star.style.cssText =
      `left:${Math.random() * 100}%;` +
      `top:${Math.random() * 100}%;` +
      `width:${size}px;height:${size}px;` +
      `--dur:${(2 + Math.random() * 4).toFixed(1)}s;` +
      `--delay:${(Math.random() * 5).toFixed(1)}s;`;
    wrap.appendChild(star);
  }
})();

// ── 2. コピーボタン ──
(function copyCommand() {
  const btn = document.getElementById('copy-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('npx galaxy-strike');
      btn.textContent = 'COPIED ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'COPY';
        btn.classList.remove('copied');
      }, 1600);
    } catch {
      btn.textContent = '手動でコピーしてね';
    }
  });
})();

// ── 3. スクロール出現 ──
(function revealOnScroll() {
  const targets = document.querySelectorAll('.card, .section-title, .install-block, .key');
  targets.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((el) => io.observe(el));
})();

// ── 4. ブラウザで遊べるミニデモ ──
(function miniDemo() {
  const field = document.getElementById('demo-field');
  const hud = document.getElementById('demo-hud');
  if (!field) return;

  const W = 30;
  const H = 13;
  const PLAYER = '▲';
  const BULLET = '|';
  const ENEMY_CHARS = ['▼', '●', '◆'];

  const S = {
    px: Math.floor(W / 2),
    bullets: [],
    enemies: [],
    explosions: [],
    score: 0,
    lives: 3,
    over: false,
    tick: 0,
  };

  // 入力
  const keys = { left: false, right: false, space: false };
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') keys.left = true;
    if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') keys.right = true;
    if (ev.key === ' ') { keys.space = true; ev.preventDefault(); }
  });
  window.addEventListener('keyup', (ev) => {
    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') keys.left = false;
    if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') keys.right = false;
    if (ev.key === ' ') keys.space = false;
  });

  // タップ/クリック操作（モバイル）→ ワンショット射撃
  field.addEventListener('click', () => {
    if (!S.over) S.bullets.push({ x: S.px, y: H - 3 });
  });

  const EXPLODE = ['※', '×', '＋'];
  const EX = { x: '※', y: '×', p: '＋' };

  function update() {
    if (S.over) return;
    S.tick++;

    if (keys.left) S.px = Math.max(1, S.px - 1);
    if (keys.right) S.px = Math.min(W - 2, S.px + 1);
    if (keys.space && S.tick % 5 === 0) S.bullets.push({ x: S.px, y: H - 3 });

    // 敵スポーン（難度は時間で上昇）
    const rate = Math.max(8, 22 - Math.floor(S.tick / 300));
    if (S.tick % rate === 0 && S.enemies.length < 7) {
      S.enemies.push({
        x: 1 + Math.floor(Math.random() * (W - 2)),
        y: 1,
        ch: ENEMY_CHARS[Math.floor(Math.random() * 3)],
        hp: Math.random() < 0.18 ? 2 : 1,
      });
    }

    for (let i = S.bullets.length - 1; i >= 0; i--) {
      S.bullets[i].y -= 1;
      if (S.bullets[i].y < 1) S.bullets.splice(i, 1);
    }
    for (let i = S.enemies.length - 1; i >= 0; i--) {
      S.enemies[i].y += 0.18;
    }
    for (let bi = S.bullets.length - 1; bi >= 0; bi--) {
      for (let ei = S.enemies.length - 1; ei >= 0; ei--) {
        const b = S.bullets[bi], e = S.enemies[ei];
        if (Math.abs(b.x - e.x) < 0.8 && Math.abs(b.y - e.y) < 0.8) {
          e.hp--;
          S.bullets.splice(bi, 1);
          if (e.hp <= 0) {
            S.explosions.push({ x: e.x, y: e.y, t: 6, ch: EXPLODE[Math.floor(Math.random() * 3)] });
            S.score += 10;
            S.enemies.splice(ei, 1);
          }
          break;
        }
      }
    }
    for (let i = S.enemies.length - 1; i >= 0; i--) {
      const e = S.enemies[i];
      if (e.y >= H - 1) {
        S.lives--;
        S.enemies.splice(i, 1);
        if (S.lives <= 0) S.over = true;
      }
    }
    for (let i = S.explosions.length - 1; i >= 0; i--) {
      S.explosions[i].t--;
      if (S.explosions[i].t <= 0) S.explosions.splice(i, 1);
    }
  }

  const COL = {
    player: '#22d3ee',
    enemy: '#f87171',
    bullet: '#fbbf24',
    explode: '#fca5a5',
  };

  function render() {
    const g = Array.from({ length: H }, () => Array(W).fill(' '));
    for (let x = 0; x < W; x++) { g[0][x] = '─'; g[H - 1][x] = '─'; }
    for (let y = 0; y < H; y++) { g[y][0] = '│'; g[y][W - 1] = '│'; }
    g[0][0] = '┌'; g[0][W - 1] = '┐';
    g[H - 1][0] = '└'; g[H - 1][W - 1] = '┘';

    for (const b of S.bullets) {
      const x = Math.floor(b.x), y = Math.floor(b.y);
      if (y > 0 && y < H - 1 && x > 0 && x < W - 1) g[y][x] = BULLET;
    }
    for (const e of S.enemies) {
      const x = Math.floor(e.x), y = Math.floor(e.y);
      if (y > 0 && y < H - 1 && x > 0 && x < W - 1) g[y][x] = e.ch;
    }
    for (const e of S.explosions) {
      const x = Math.floor(e.x), y = Math.floor(e.y);
      if (y > 0 && y < H - 1 && x > 0 && x < W - 1) g[y][x] = e.ch;
    }
    if (!S.over) g[H - 2][S.px] = PLAYER;

    let out = '';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = g[y][x];
        if (ch === PLAYER) out += `<span style="color:${COL.player}">▲</span>`;
        else if (ch === BULLET) out += `<span style="color:${COL.bullet}">|</span>`;
        else if (ENEMY_CHARS.includes(ch)) out += `<span style="color:${COL.enemy}">${ch}</span>`;
        else if (EXPLODE.includes(ch)) out += `<span style="color:${COL.explode}">${ch}</span>`;
        else out += ch;
      }
      out += '\n';
    }
    field.innerHTML = out;
    const hearts = '♥'.repeat(Math.max(0, S.lives)) + '♡'.repeat(Math.max(0, 3 - S.lives));
    hud.textContent = `SCORE:${String(S.score).padStart(5, '0')}  ${hearts}  ${S.over ? 'GAME OVER (SPACEで再挑戦)' : ''}`;
  }

  field.setAttribute('tabindex', '0');
  field.style.outline = 'none';
  field.addEventListener('keydown', (ev) => {
    if (S.over && (ev.key === ' ' || ev.key === 'r' || ev.key === 'R')) {
      S.score = 0; S.lives = 3; S.over = false; S.bullets = []; S.enemies = []; S.explosions = [];
    }
  });

  setInterval(() => {
    update();
    render();
  }, 110);
})();
