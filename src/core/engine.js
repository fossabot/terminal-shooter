'use strict';

/**
 * ゲームエンジン（プレイ中の状態管理・更新ロジック）
 * 雑魚のウェーブ進行 → ボス戦 → ステージクリア の流れを司る。
 */
const {
  WIDTH, HEIGHT, HALF_W, SIZES, EXPLODE, ENEMY_TYPES,
  INIT_LIVES, MAX_LIVES, EXTRA_LIFE_SCORE,
  DROP_RATE, ITEM_CHARS, DROP_WEIGHTS, POWER_TICKS, ITEM_FALL_SPD,
} = require('../config');
const { stageData } = require('../story/stages');

/** 大画面モードの画面サイズを E に適用 */
function applySize(E) {
  const sz = SIZES[E.sizeMode] || SIZES.normal;
  E.width = sz.width;
  E.height = sz.height;
  E.halfW = Math.floor(E.width / 2);
}

/** オンライン対戦時の自陣のX範囲を取得（netSide: 'L' | 'R' | null） */
function sideRange(E) {
  if (E.netSide === 'L') return { min: 1, max: E.halfW - 1 };
  if (E.netSide === 'R') return { min: E.halfW, max: E.width - 2 };
  return { min: 1, max: E.width - 2 };
}

/** 初期状態を生成 */
function newState() {
  const E = {
    mode: 'menu',            // menu | help | intro | play | clear | over | ending | lobby | netconfig | netwait | netplay
    stage: 1,
    sizeMode: 'normal',      // normal | large（大画面モード）
    width: WIDTH,
    height: HEIGHT,
    halfW: HALF_W,
    px: Math.floor(WIDTH / 2),
    py: HEIGHT - 2,
    bullets: [],
    enemies: [],
    ebullets: [],
    items: [],
    explosions: [],
    tick: 0,
    score: 0,
    lives: INIT_LIVES,
    weapon: 1,
    power: 0,        // パワーモード残り時間 (tick)
    overdrive: 0,    // オーバードライブ残り時間 (tick) ※無敵付き
    toast: null,     // { text, t } 画面下部の告知
    wave: -1,        // 現在のウェーブ (0始まり)
    wavePool: [],            // 残スポーン予約
    spawnTick: 0,
    waveBanner: null,        // { text, t }
    boss: null,
    bossMaxHp: 0,
    over: false,
    paused: false,
    invuln: 0,
    stageClear: false,
    extraNext: EXTRA_LIFE_SCORE,
    runStats: { kills: 0, bosses: 0, maxStage: 1 },
  };
  applySize(E);
  return E;
}

/** ウェーブ開始 */
function startWave(E, idx) {
  const st = stageData(E);
  if (idx >= st.waves.length) return;
  E.wave = idx;
  const w = st.waves[idx];
  E.wavePool = [];
  for (const [type, count] of w.enemies) {
    for (let i = 0; i < count; i++) E.wavePool.push(type);
  }
  // シャッフル
  for (let i = E.wavePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [E.wavePool[i], E.wavePool[j]] = [E.wavePool[j], E.wavePool[i]];
  }
  E.spawnTick = 0;
  E.waveBanner = { text: `WAVE ${idx + 1} / ${st.waves.length}`, t: 50 };
}

/** ステージ開始（プレイ状態を初期化） */
function startStage(E, stage) {
  applySize(E); // 大画面モードなら拡大されたフィールドで開始
  E.stage = stage;
  E.runStats.maxStage = Math.max(E.runStats.maxStage || 1, stage);
  E.px = Math.floor(E.width / 2);
  E.py = E.height - 2;
  E.bullets = [];
  E.enemies = [];
  E.ebullets = [];
  E.items = [];
  E.explosions = [];
  E.tick = 0;
  E.paused = false;
  E.over = false;
  E.invuln = 0;
  E.power = 0;
  E.overdrive = 0;
  E.toast = null;
  E.stageClear = false;
  E.boss = null;
  E.bossMaxHp = 0;
  E.waveBanner = null;
  E.wave = -1;
  E.wavePool = [];
  E.spawnTick = 0;
  startWave(E, 0);
}

/** 敵のステータスをステージ難度に応じてスケーリング */
function scaled(typeName, E) {
  const base = ENEMY_TYPES[typeName];
  const diff = 1 + (E.stage - 1) * 0.12;
  const range = sideRange(E);
  return {
    x: range.min + Math.random() * (range.max - range.min),
    y: 1,
    ch: base.ch,
    hp: base.hp + (E.stage >= 3 ? 1 : 0),
    sp: base.sp * diff * (0.9 + Math.random() * 0.2),
    score: base.score * E.stage,
    fire: base.fire * (1 + (E.stage - 1) * 0.15),
    type: typeName,
  };
}

function spawnBoss(E) {
  const b = stageData(E).boss;
  const range = sideRange(E);
  E.boss = {
    name: b.name,
    ch: b.ch,
    hp: b.hp,
    maxHp: b.hp,
    x: Math.floor((range.min + range.max) / 2),
    y: 1,
    dir: 1,
    sp: b.sp,
    fireTick: 0,
    fireEvery: b.fireEvery,
    pattern: b.pattern,
  };
  E.bossMaxHp = b.hp;
  E.waveBanner = { text: `!! BOSS : ${b.name} !!`, t: 70 };
}

function explode(E, x, y) {
  E.explosions.push({ x, y, t: 7, ch: EXPLODE[Math.floor(Math.random() * 3)] });
}

function addScore(E, n) {
  E.score += n;
}

/** 敵撃破時にアイテムをドロップ (25%) */
function rollDrop(E, x, y) {
  if (Math.random() > DROP_RATE) return;
  const r = Math.random();
  let type;
  if (r < DROP_WEIGHTS.life) type = 'life';
  else if (r < DROP_WEIGHTS.life + DROP_WEIGHTS.power) type = 'power';
  else type = 'overdrive';
  E.items.push({
    x: Math.max(1, Math.min(E.width - 2, x)),
    y,
    ch: ITEM_CHARS[type],
    type,
    sp: ITEM_FALL_SPD * (0.9 + Math.random() * 0.2),
  });
}

/** アイテム取得時の効果 */
function applyItem(E, item) {
  if (item.type === 'life') {
    if (E.lives < MAX_LIVES) {
      E.lives++;
      E.toast = { text: '♥ ライフ+1 !', t: 60 };
    } else {
      addScore(E, 500);
      E.toast = { text: '♥ ライフMAX ! +500点', t: 60 };
    }
  } else if (item.type === 'power') {
    E.power = POWER_TICKS;
    E.toast = { text: 'P パワーモード 10秒 !', t: 60 };
  } else if (item.type === 'overdrive') {
    E.overdrive = POWER_TICKS;
    E.toast = { text: '★ オーバードライブ 10秒 !', t: 60 };
  }
}

function bossFire(E, b) {
  if (b.pattern === 'aim') {
    let vx = (E.px - b.x) / 16;
    vx = Math.max(-0.7, Math.min(0.7, vx));
    E.ebullets.push({ x: b.x, y: b.y + 1, vx: 0, vy: 0.5 });
    E.ebullets.push({ x: b.x, y: b.y + 1, vx: vx - 0.4, vy: 0.42 });
    E.ebullets.push({ x: b.x, y: b.y + 1, vx: vx + 0.4, vy: 0.42 });
  } else {
    E.ebullets.push({ x: b.x, y: b.y + 1, vx: 0, vy: 0.55 });
    E.ebullets.push({ x: b.x - 1, y: b.y + 1, vx: -0.45, vy: 0.45 });
    E.ebullets.push({ x: b.x + 1, y: b.y + 1, vx: 0.45, vy: 0.45 });
  }
}

/** 1ティック分の更新 */
function update(E) {
  if (E.over || E.paused) return;
  E.tick++;

  // ── スポーン（ウェーブ → ボス）──
  if (!E.boss) {
    const st = stageData(E);
    if (E.wave >= 0 && E.wave < st.waves.length) {
      const w = st.waves[E.wave];
      if (E.wavePool.length > 0) {
        E.spawnTick++;
        if (E.spawnTick >= w.rate && E.enemies.length < w.cap) {
          E.enemies.push(scaled(E.wavePool.pop(), E));
          E.spawnTick = 0;
        }
      } else if (E.enemies.length === 0) {
        if (E.wave + 1 < st.waves.length) startWave(E, E.wave + 1);
        else spawnBoss(E);
      }
    }
  }

  // ── 自機弾の移動 ──
  for (let i = E.bullets.length - 1; i >= 0; i--) {
    const b = E.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.y < 1 || b.x < 1 || b.x > E.width - 1) E.bullets.splice(i, 1);
  }

  // ── 敵の移動 + 射撃 ──
  for (let i = E.enemies.length - 1; i >= 0; i--) {
    const e = E.enemies[i];
    e.y += 0.15 * e.sp;
    if (e.y < E.height - 2 && e.fire > 0 && Math.random() < e.fire) {
      E.ebullets.push({ x: e.x, y: e.y + 0.6, vx: 0, vy: 0.5 });
    }
  }

  // ── 敵弾の移動 ──
  for (let i = E.ebullets.length - 1; i >= 0; i--) {
    const eb = E.ebullets[i];
    eb.x += eb.vx;
    eb.y += eb.vy;
    if (eb.y > E.height - 1 || eb.x < 1 || eb.x > E.width - 1) E.ebullets.splice(i, 1);
  }

  // ── 自機弾 vs 雑魚敵 ──
  for (let bi = E.bullets.length - 1; bi >= 0; bi--) {
    const b = E.bullets[bi];
    let hit = false;
    for (let ei = E.enemies.length - 1; ei >= 0; ei--) {
      const e = E.enemies[ei];
      if (Math.abs(b.x - e.x) < 0.8 && Math.abs(b.y - e.y) < 0.8) {
        e.hp--;
        hit = true;
        if (e.hp <= 0) {
          explode(E, e.x, e.y);
          addScore(E, e.score);
          rollDrop(E, e.x, e.y);
          E.runStats.kills++;
          E.enemies.splice(ei, 1);
        } else {
          explode(E, e.x, e.y - 0.4);
        }
        break;
      }
    }
    if (hit) {
      if (b.pierce > 0) b.pierce--;
      else E.bullets.splice(bi, 1);
    }
  }

  // ── 自機弾 vs ボス ──
  if (E.boss) {
    const b = E.boss;
    for (let bi = E.bullets.length - 1; bi >= 0; bi--) {
      const bl = E.bullets[bi];
      if (Math.abs(bl.x - b.x) < 0.9 && Math.abs(bl.y - b.y) < 0.9) {
        b.hp--;
        explode(E, bl.x, bl.y);
        if (bl.pierce > 0) bl.pierce--;
        else E.bullets.splice(bi, 1);
        if (b.hp <= 0) {
          for (let k = 0; k < 8; k++) {
            explode(E, b.x + (Math.random() - 0.5) * 2, b.y + (Math.random() - 0.5) * 2);
          }
          addScore(E, stageData(E).clearScore);
          E.runStats.bosses++;
          // ボスは確定ドロップ（ライフ）+ 確率でパワー
          E.items.push({ x: b.x, y: b.y + 1, ch: ITEM_CHARS.life, type: 'life', sp: ITEM_FALL_SPD });
          if (Math.random() < 0.5) {
            E.items.push({ x: b.x + 2, y: b.y + 1, ch: ITEM_CHARS.power, type: 'power', sp: ITEM_FALL_SPD });
          }
          E.boss = null;
          E.stageClear = true;
          break;
        }
      }
    }
  }

  // ── ボス移動・射撃 ──
  if (E.boss) {
    const b = E.boss;
    const range = sideRange(E);
    b.x += b.dir * b.sp;
    if (b.x <= range.min + 1) { b.dir = 1; b.y += 0.7; }
    if (b.x >= range.max - 1) { b.dir = -1; b.y += 0.7; }
    if (b.y > 5) b.y = 2;
    b.fireTick++;
    if (b.fireTick >= b.fireEvery) {
      b.fireTick = 0;
      bossFire(E, b);
    }
  }

  // ── 雑魚敵が底到達 / 自機接触 ──
  for (let i = E.enemies.length - 1; i >= 0; i--) {
    const e = E.enemies[i];
    if (e.y >= E.height - 1) {
      if (E.invuln <= 0) {
        E.lives--;
        E.invuln = 90;
        explode(E, e.x, E.height - 2);
      }
      E.enemies.splice(i, 1);
      if (E.lives <= 0) E.over = true;
    } else if (E.invuln <= 0 && Math.abs(e.x - E.px) < 0.8 && Math.abs(e.y - E.py) < 0.8) {
      E.lives--;
      E.invuln = 90;
      explode(E, E.px, E.py);
      E.enemies.splice(i, 1);
      if (E.lives <= 0) E.over = true;
    }
  }

  // ── 敵弾 vs 自機 ──
  for (let i = E.ebullets.length - 1; i >= 0; i--) {
    const eb = E.ebullets[i];
    if (E.invuln <= 0 && Math.abs(eb.x - E.px) < 0.8 && Math.abs(eb.y - E.py) < 0.8) {
      E.lives--;
      E.invuln = 90;
      explode(E, E.px, E.py);
      E.ebullets.splice(i, 1);
      if (E.lives <= 0) E.over = true;
    }
  }

  // ── ボス vs 自機 ──
  if (E.boss && E.invuln <= 0 && Math.abs(E.boss.x - E.px) < 0.9 && Math.abs(E.boss.y - E.py) < 0.9) {
    E.lives--;
    E.boss.hp -= 2;
    E.invuln = 90;
    explode(E, E.px, E.py);
    if (E.lives <= 0) E.over = true;
  }

  // ── 無敵時間 ──
  if (E.invuln > 0) E.invuln--;

  // ── パワー/オーバードライブ タイマー ──
  if (E.power > 0) E.power--;
  if (E.overdrive > 0) {
    E.overdrive--;
    if (E.invuln < 2) E.invuln = 2; // 無敵維持
  }

  // ── アイテム移動・取得 ──
  for (let i = E.items.length - 1; i >= 0; i--) {
    const it = E.items[i];
    it.y += 0.15 * it.sp;
    if (it.y >= E.height - 1) {
      E.items.splice(i, 1); // 画面外へ
      continue;
    }
    if (Math.abs(it.x - E.px) < 0.9 && Math.abs(it.y - E.py) < 0.9) {
      applyItem(E, it);
      explode(E, it.x, it.y);
      E.items.splice(i, 1);
    }
  }

  // ── トースト更新 ──
  if (E.toast) {
    E.toast.t--;
    if (E.toast.t <= 0) E.toast = null;
  }

  // ── 爆発更新 ──
  for (let i = E.explosions.length - 1; i >= 0; i--) {
    E.explosions[i].t--;
    if (E.explosions[i].t <= 0) E.explosions.splice(i, 1);
  }

  // ── バナー更新 ──
  if (E.waveBanner) {
    E.waveBanner.t--;
    if (E.waveBanner.t <= 0) E.waveBanner = null;
  }

  // ── スコアに応じたエクストラライフ ──
  if (E.score >= E.extraNext) {
    E.lives++;
    E.extraNext += EXTRA_LIFE_SCORE;
  }
}

module.exports = { newState, update, startStage, startWave, stageData, addScore };
