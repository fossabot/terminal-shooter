'use strict';

/**
 * Galaxy Strike 🚀 メインオーケストレーター
 * モード（menu / help / intro / play / clear / over / ending）を遷移させる。
 *
 * 操作方法:
 *   ← → / A D ..... 移動
 *   Space / W ↑ .... 射撃
 *   P ............. 一時停止
 *   R ............. 再挑戦
 *   M ............. メニューへ
 *   Q ............. 終了
 */
const {
  WIDTH, INIT_LIVES, TICK_MS, MAX_WEAPON, EXTRA_LIFE_SCORE, STAGE_CLEAR_LIFE, C,
} = require('./config');
const engine = require('./core/engine');
const { fireWeapon, WEAPONS } = require('./core/weapons');
const renderer = require('./core/renderer');
const { setupInput, cleanup, keyToken } = require('./core/input');
const { INTROS, ENDING } = require('./story/dialogue');
const { STAGES } = require('./story/stages');
const menuUI = require('./ui/menu');
const introUI = require('./ui/intro');
const clearUI = require('./ui/clear');
const gameoverUI = require('./ui/gameover');
const endingUI = require('./ui/ending');

const E = engine.newState();
let iv = null;

// ── 画面遷移 ──
function newGame() {
  E.score = 0;
  E.lives = INIT_LIVES;
  E.weapon = 1;
  E.extraNext = EXTRA_LIFE_SCORE;
  E.runStats.kills = 0;
  startIntro(1);
}

function startIntro(stage) {
  E.stage = stage;
  E.introState = { lines: INTROS[stage - 1], page: 0, char: 0 };
  E.mode = 'intro';
}

function startPlay() {
  engine.startStage(E, E.stage);
  E.mode = 'play';
}

function retry() {
  E.lives = INIT_LIVES; // スコア・武器は維持
  startPlay();
}

function toMenu() {
  E.mode = 'menu';
}

function quit() {
  if (iv) clearInterval(iv);
  cleanup();
  process.exit(0);
}

/** クリア報酬を適用 */
function applyRewards() {
  const st = STAGES[E.stage - 1];
  const rewards = { score: st.clearScore, life: STAGE_CLEAR_LIFE, weaponText: null };
  E.score += st.clearScore;
  E.lives += STAGE_CLEAR_LIFE;
  if (E.weapon < MAX_WEAPON) {
    E.weapon++;
    rewards.weaponText = `WEAPON → Lv${E.weapon} ${WEAPONS[E.weapon - 1].name} に進化！`;
  } else {
    E.score += 2000;
    rewards.weaponText = 'WEAPON → Lv6 MAX 維持（スコア+2000）';
  }
  E.reward = rewards;
}

function stageClearFlow() {
  applyRewards();
  E.mode = 'clear';
}

function nextAfterClear() {
  if (E.stage < STAGES.length) {
    startIntro(E.stage + 1);
  } else {
    E.endingState = { lines: ENDING, page: 0, char: 0, phase: 'story' };
    E.mode = 'ending';
  }
}

// ── 入力処理 ──
function handleKey(raw) {
  const t = keyToken(raw);
  if (!t) return;
  if (t === 'ctrl-c') return quit();

  switch (E.mode) {
    case 'menu':
      if (t === 's' || t === 'enter' || t === 'space') newGame();
      else if (t === 'h') E.mode = 'help';
      else if (t === 'q') quit();
      break;

    case 'help':
      if (t === 'space' || t === 'enter' || t === 'q' || t === 'esc') toMenu();
      break;

    case 'intro': {
      const IS = E.introState;
      const done = IS.char >= IS.lines[IS.page].text.length;
      if (done) {
        if (IS.page < IS.lines.length - 1) { IS.page++; IS.char = 0; }
        else startPlay();
      } else {
        IS.char = IS.lines[IS.page].text.length; // タイプ演出スキップ
      }
      if (t === 'q' || t === 'esc') toMenu();
      break;
    }

    case 'play':
      if (E.paused) {
        if (t === 'p') E.paused = false;
        else if (t === 'r') retry();
        else if (t === 'm') toMenu();
        else if (t === 'q') quit();
        break;
      }
      switch (t) {
        case 'left': E.px = Math.max(1, E.px - 1); break;
        case 'right': E.px = Math.min(WIDTH - 2, E.px + 1); break;
        case 'up': case 'w': case 'space': fireWeapon(E); break;
        case 'p': E.paused = true; break;
        case 'q': quit(); break;
      }
      break;

    case 'clear':
      if (t === 'space' || t === 'enter') nextAfterClear();
      else if (t === 'q' || t === 'esc') toMenu();
      break;

    case 'over':
      if (t === 'r' || t === 'space') retry();
      else if (t === 'm') toMenu();
      else if (t === 'q') quit();
      break;

    case 'ending': {
      const ES = E.endingState;
      if (ES.phase === 'story') {
        const done = ES.char >= ES.lines[ES.page].text.length;
        if (done) {
          if (ES.page < ES.lines.length - 1) { ES.page++; ES.char = 0; }
          else ES.phase = 'credits';
        } else {
          ES.char = ES.lines[ES.page].text.length;
        }
      } else {
        if (t === 'space' || t === 'enter') toMenu();
      }
      if (t === 'q' || t === 'esc') toMenu();
      break;
    }
  }
}

// ── メインループ ──
function tick() {
  // タイプライター演出
  if (E.mode === 'intro' && E.introState) {
    const IS = E.introState;
    const len = IS.lines[IS.page].text.length;
    if (IS.char < len) IS.char = Math.min(len, IS.char + 2);
  }
  if (E.mode === 'ending' && E.endingState && E.endingState.phase === 'story') {
    const ES = E.endingState;
    const len = ES.lines[ES.page].text.length;
    if (ES.char < len) ES.char = Math.min(len, ES.char + 2);
  }

  // プレイ更新
  if (E.mode === 'play') {
    engine.update(E);
    if (E.stageClear) stageClearFlow();
    else if (E.over) E.mode = 'over';
  }

  // 描画
  switch (E.mode) {
    case 'menu': menuUI.drawMenu(E); break;
    case 'help': menuUI.drawHelp(E); break;
    case 'intro': introUI.drawIntro(E); break;
    case 'play': renderer.renderGame(E); break;
    case 'clear': clearUI.drawClear(E); break;
    case 'over': gameoverUI.drawGameOver(E); break;
    case 'ending': endingUI.drawEnding(E); break;
  }
}

function main() {
  process.stdout.write('\x1b[?25l');
  setupInput(handleKey);
  iv = setInterval(tick, TICK_MS);
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

main();
