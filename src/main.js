'use strict';

/**
 * NOVA 🚀 メインオーケストレーター
 * モード（menu / help / intro / play / clear / over / ending / lobby / netconfig / netwait / netplay）を遷移させる。
 *
 * 操作方法:
 *   ← → / A D ..... 移動
 *   Space / W ↑ .... 射撃
 *   P ............. 一時停止
 *   R ............. 再挑戦
 *   M ............. メニューへ
 *   Q ............. 終了
 *
 * オンライン対戦（PieSocket）:
 *   [N] ONLINE MODE → ロビー（home）へ自動接続
 *   [R] 部屋を作る / [1-9] 部屋に参加 / [C] API設定
 */
const {
  INIT_LIVES, TICK_MS, MAX_WEAPON, EXTRA_LIFE_SCORE, STAGE_CLEAR_LIFE, C,
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
const netUI = require('./ui/net');
const net = require('./net/net');
const api = require('./net/api-config');

const E = engine.newState();
let iv = null;

// ── 画面遷移 ──
function newGame() {
  E.score = 0;
  E.lives = INIT_LIVES;
  E.weapon = 1;
  E.extraNext = EXTRA_LIFE_SCORE;
  E.runStats.kills = 0;
  E.survivalTime = 0;
  E.timeAttackStartTime = 0;
  E.stageTimes = [];
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
  if (E.netSide) startNetPlay(E.netSide);
  else startPlay();
}

function startSurvival() {
  E.score = 0;
  E.lives = INIT_LIVES;
  E.weapon = 1;
  E.extraNext = EXTRA_LIFE_SCORE;
  E.runStats.kills = 0;
  E.survivalTime = 0;
  E.bestSurvivalTime = loadBestSurvivalTime(); // ベストタイムをロード
  engine.startStage(E, 1); // ステージ1から開始
  E.mode = 'survival';
}

function startTimeAttack() {
  E.score = 0;
  E.lives = INIT_LIVES;
  E.weapon = 1;
  E.extraNext = EXTRA_LIFE_SCORE;
  E.runStats.kills = 0;
  E.timeAttackStartTime = Date.now();
  E.stageTimes = new Array(STAGES.length).fill(0); // 各ステージのタイムを保存
  E.bestTimeAttackTime = loadBestTimeAttackTime(); // ベストタイムをロード
  engine.startStage(E, 1);
  E.mode = 'timeattack';
}

function toMenu() {
  E.mode = 'menu';
}

function quit() {
  if (iv) clearInterval(iv);
  net.shutdown();
  cleanup();
  process.exit(0);
}

// ── オンライン対戦 ──
/** オンライン対戦の開始（位置同期プレイ） */
function startNetPlay(side, size, mode) {
  E.netSide = side;
  E.netMode = mode; // モードを保存
  if (size) E.sizeMode = size; // ホストの画面サイズに合わせる
  E.stage = 1;
  engine.startStage(E, 1);
  E.netSide = side; // startStage は netSide を触らないが明示的に維持
  E.netMode = mode; // モードも維持
  
  // 位置初期化
  if (mode === 'duel') {
    // 従来の1v1対戦モード（左右分割）
    E.px = side === 'L' ? Math.floor(E.halfW / 2) : E.halfW + Math.floor((E.width - 2 - E.halfW) / 2);
  } else if (mode === 'coop') {
    // 協力モード：同じフィールドに並ぶ（左側と右側に少しずつずらす）
    const offset = Math.floor(E.width / 4); // 幅の1/4ずつオフセット
    E.px = side === 'L' ? offset : E.width - 2 - offset;
  }
  E.py = E.height - 2;
  E.mode = 'netplay';
}

/** オンライン対戦からロビーへ戻る */
function backToLobby() {
  E.netSide = null;
  E.netMode = null;
  net.leaveGame();
  E.mode = 'lobby';
}

/** 対戦中の通信断など */
function onGameDrop(msg) {
  E.netDropMsg = msg || '接続が切れました';
  E.netSide = null;
  E.netMode = null;
  net.connectLobby();
  E.mode = 'lobby';
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

// ── カスタムAPI設定の入力（raw文字を大文字小文字のまま扱う） ──
function handleNetEdit(raw) {
  if (raw === '\x03') return quit();
  if (raw === '\r' || raw === '\n') return commitNetField();
  if (raw === '\x7f' || raw === '\x08') {
    E.netInput[E.netEdit] = (E.netInput[E.netEdit] || '').slice(0, -1);
    return;
  }
  if (raw === '\x1b') { E.netEdit = null; return; } // キャンセル
  if (/^[\x20-\x7e]$/.test(raw)) { // 表示可能なASCIIのみ
    E.netInput[E.netEdit] = (E.netInput[E.netEdit] || '') + raw;
  }
}

function commitNetField() {
  const val = (E.netInput[E.netEdit] || '').trim();
  if (E.netEdit === 'cluster') {
    if (val) E.netInput.cluster = val;
    E.netEdit = 'key';
  } else if (E.netEdit === 'key') {
    if (val) E.netInput.key = val;
    // 保存 → 再接続
    const cfg = api.loadCustom() || {};
    api.saveCustom({
      cluster: E.netInput.cluster || cfg.cluster || api.DEFAULT_CLUSTER,
      apiKey: E.netInput.key || cfg.apiKey || api.DEFAULT_API_KEY,
      name: cfg.name || api.current().name,
    });
    E.netEdit = null;
    net.applyConfig();
    net.connectLobby(); // 新しいキーで再接続
  }
}

// ── 入力処理 ──
function handleKey(raw) {
  // 設定入力中は生キーをそのまま扱う
  if (E.mode === 'netconfig' && E.netEdit) {
    handleNetEdit(raw);
    return;
  }

  const t = keyToken(raw);
  if (!t) return;
  if (t === 'ctrl-c') return quit();

  switch (E.mode) {
case 'menu':
       if (t === 's' || t === 'enter' || t === 'space') newGame();
       else if (t === 'n') E.mode = 'lobby';
       else if (t === 'h') E.mode = 'help';
       else if (t === 'l') E.sizeMode = E.sizeMode === 'large' ? 'normal' : 'large'; // 大画面モード切替
       else if (t === 'v') startSurvival(); // サバイバルモード
       else if (t === 't') startTimeAttack(); // タイムアタックモード
       else if (t === 'q') quit();
       break;

    case 'help':
      if (t === 'space' || t === 'enter' || t === 'q' || t === 'esc') toMenu();
      break;

    case 'lobby': {
      if (t === 'r') { 
        // 現在選択されているモードで部屋を作る
        const mode = net.N.mode || 'duel'; // デフォルトはデュエル
        net.N.sizeMode = E.sizeMode; 
        net.createRoom(mode); 
        E.mode = 'netwait'; 
      }
      else if (t === 'c') { E.mode = 'netconfig'; E.netEdit = null; }
      else if (t === 'd') { // デュエルモード選択
        net.N.mode = 'duel';
        netUI.drawLobby(E); // 即時UI更新
      }
      else if (t === 'c' && E.mode === 'lobby') { // 協力モード選択（ロビー画面時のみ）
        net.N.mode = 'coop';
        netUI.drawLobby(E); // 即時UI更新
      }
      else if (t >= '1' && t <= '9') {
        const rooms = [...net.N.lobby.rooms.keys()];
        const idx = Number(t) - 1;
        if (rooms[idx]) { 
          // 部屋のモードを取得して参加
          const roomInfo = net.N.lobby.rooms.get(rooms[idx]);
          const mode = roomInfo ? roomInfo.mode : 'duel'; // デフォルトはデュエル
          net.N.sizeMode = E.sizeMode; 
          net.joinRoom(rooms[idx], false, mode); 
          E.mode = 'netwait'; 
        }
      }
      else if (t === 'b' || t === 'esc' || t === 'm') toMenu();
      else if (t === 'q') quit();
      break;
    }

    case 'netconfig':
      if (t === 'e') { E.netEdit = 'cluster'; E.netInput = { cluster: '', key: '' }; }
      else if (t === 'd') {
        api.resetCustom();
        net.applyConfig();
        net.connectLobby();
      }
      else if (t === 'b' || t === 'esc') E.mode = 'lobby';
      else if (t === 'q') quit();
      break;

    case 'netwait':
      if (t === 'q' || t === 'esc' || t === 'm') backToLobby();
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
     case 'netplay':
       if (E.paused) {
         if (t === 'p') E.paused = false;
         else if (t === 'r') retry();
         else if (t === 'm') (E.mode === 'netplay' ? backToLobby() : toMenu());
         else if (t === 'q') quit();
         break;
       }
       switch (t) {
         case 'left':
           if (E.mode === 'netplay') {
             if (E.netMode === 'duel') {
               // 1v1対戦モード：左右分割での移動制限
               E.px = Math.max(E.netSide === 'L' ? 1 : E.halfW, E.px - 1);
             } else if (E.netMode === 'coop') {
               // 協力モード：フル幅で移動可能
               E.px = Math.max(1, E.px - 1);
             }
           } else {
             // オフラインモード
             E.px = Math.max(1, E.px - 1);
           }
           break;
         case 'right':
           if (E.mode === 'netplay') {
             if (E.netMode === 'duel') {
               // 1v1対戦モード：左右分割での移動制限
               E.px = Math.min(E.netSide === 'L' ? E.halfW - 1 : E.width - 2, E.px + 1);
             } else if (E.netMode === 'coop') {
               // 協力モード：フル幅で移動可能
               E.px = Math.min(E.width - 2, E.px + 1);
             }
           } else {
             // オフラインモード
             E.px = Math.min(E.width - 2, E.px + 1);
           }
           break;
         case 'up': case 'w': case 'space': fireWeapon(E); break;
         case 'p': E.paused = true; break;
         case 'm': if (E.mode === 'netplay') backToLobby(); break;
         case 'q': quit(); break;
       }
       break;

    case 'clear':
      if (t === 'space' || t === 'enter') nextAfterClear();
      else if (t === 'q' || t === 'esc') toMenu();
      break;

    case 'over':
      if (t === 'r' || t === 'space') retry();
      else if (t === 'm') (E.netSide ? backToLobby() : toMenu());
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
   if (E.mode === 'play' || E.mode === 'netplay' || E.mode === 'survival' || E.mode === 'timeattack') {
     engine.update(E);
     if (E.mode === 'netplay') {
       net.sendPos(E.px, E.py, E.lives, E.score, E.weapon);
       if (!net.peerAlive()) onGameDrop('対戦相手との通信が途切れました');
     }
     // サバイバルモードの時間計測
     if (E.mode === 'survival') {
       E.survivalTime += TICK_MS / 1000; // 秒単位で加算
       // 一定時間ごとに難易度を上げる（ウェーブシステムを変更）
       if (Math.floor(E.survivalTime) % 30 === 0 && E.survivalTime > 0 && Math.floor(E.survivalTime * 10) % 300 < 10) {
         // 30秒ごとに敵のスポーン率を上げる（エンジン側で処理するか、ここでステージデータを動的に変更）
         // ここでは簡易的に、一定時間ごとにスコアボーナスを与える
         E.score += Math.floor(E.survivalTime / 30) * 100;
       }
     }
     // タイムアタックモードのタイム計測
     if (E.mode === 'timeattack') {
       // 経過時間は結果表示時に計算
     }
     if (E.stageClear) {
       if (E.mode === 'netplay') E.mode = 'over'; // オンラインは1ステージ完走で結果へ
       else if (E.mode === 'survival') {
         // サバイバルモードではステージクリアでも続ける（無限モード）
         applyRewards();
         // 次のステージへ（ステージ数を超えたら最初に戻す）
         E.stage = (E.stage % STAGES.length) + 1;
         engine.startStage(E, E.stage);
       } else if (E.mode === 'timeattack') {
         // タイムアタックモードではステージクリアタイムを記録
         const stageClearTime = (Date.now() - E.timeAttackStartTime) / 1000;
         E.stageTimes[E.stage - 1] = stageClearTime;
         applyRewards();
         if (E.stage < STAGES.length) {
           startIntro(E.stage + 1);
         } else {
           // 全ステージクリア
           const totalTime = (Date.now() - E.timeAttackStartTime) / 1000;
           E.endingState = { 
             lines: [
               { who: 'SYSTEM', text: `タイムアタック完了！` },
               { who: 'SYSTEM', text: `合計タイム: ${totalTime.toFixed(2)}秒` },
               { who: 'SYSTEM', text: `ベストタイム: ${E.bestTimeAttackTime.toFixed(2)}秒` },
               { who: 'SYSTEM', text: totalTime < E.bestTimeAttackTime || E.bestTimeAttackTime === 0 ? '新記録！' : '' }
             ], 
             page: 0, 
             char: 0, 
             phase: 'story' 
           };
           E.mode = 'ending';
           // ベストタイムを更新
           if (totalTime < E.bestTimeAttackTime || E.bestTimeAttackTime === 0) {
             saveBestTimeAttackTime(totalTime);
           }
         }
       }
       else stageClearFlow();
     }
     else if (E.over) E.mode = 'over';
   }

// 描画
   switch (E.mode) {
     case 'menu': menuUI.drawMenu(E); break;
     case 'help': menuUI.drawHelp(E); break;
     case 'lobby': netUI.drawLobby(E); break;
     case 'netconfig': netUI.drawNetConfig(E); break;
     case 'netwait': netUI.drawWait(E); break;
     case 'intro': introUI.drawIntro(E); break;
     case 'play': renderer.renderGame(E); break;
     case 'netplay': renderer.renderGame(E); break;
     case 'survival': renderer.renderGame(E); break;
     case 'timeattack': renderer.renderGame(E); break;
     case 'clear': clearUI.drawClear(E); break;
     case 'over': gameoverUI.drawGameOver(E); break;
     case 'ending': endingUI.drawEnding(E); break;
   }
}

function loadBestSurvivalTime() {
  try {
    const fs = require('fs');
    const data = fs.readFileSync('./survival_best.json', 'utf8');
    return JSON.parse(data).bestTime || 0;
  } catch (e) {
    return 0;
  }
}

function saveBestSurvivalTime(time) {
  try {
    const fs = require('fs');
    const data = JSON.stringify({ bestTime: time });
    fs.writeFileSync('./survival_best.json', data, 'utf8');
  } catch (e) {
    // エラーは無視（ファイル書き込み権限がない場合など）
  }
}

function loadBestTimeAttackTime() {
  try {
    const fs = require('fs');
    const data = fs.readFileSync('./timeattack_best.json', 'utf8');
    return JSON.parse(data).bestTime || 0;
  } catch (e) {
    return 0;
  }
}

function saveBestTimeAttackTime(time) {
  try {
    const fs = require('fs');
    const data = JSON.stringify({ bestTime: time });
    fs.writeFileSync('./timeattack_best.json', data, 'utf8');
  } catch (e) {
    // エラーは無視
  }
}

function main() {
  process.stdout.write('\x1b[?25l');
  setupInput(handleKey);
  net.init({ gameStart: startNetPlay, gameDrop: onGameDrop });
  net.connectLobby(); // 起動時にロビー「home」へ自動接続
  iv = setInterval(tick, TICK_MS);
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

main();
