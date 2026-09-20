'use strict';

/**
 * オンライン対戦（PieSocket WebSocket）ロジック
 *
 *  ロビー : 全員が共通ルーム「home」に常駐
 *  部屋作成: stone_12345 形式のユニーク部屋IDをロビーに告知
 *  参加   : ロビーから部屋IDを選んで接続先を切り替え
 *  対戦   : 2人が揃ったら gstart で開始、gpos で位置同期
 *
 * メッセージ仕様（PieSocket の event を利用）
 *  ロビー: hello {name} / bye / room {roomId}
 *  部屋  : gjoin {name, host} / gstart / gpos {x,y,lives,score,weapon} / gbye
 */
const { connect, send } = require('./piesocket');
const api = require('./api-config');

/** 通信状態（UI から直接参照してよい） */
const N = {
  status: 'off',        // off | connecting | lobby | game
  connected: false,     // WebSocket が開いているか
  conn: null,
  room: api.LOBBY_ROOM,
  cluster: api.current().cluster,
  apiKey: api.current().apiKey,
  me: api.current().name,
  host: false,
  side: null,           // 'L' | 'R' | null (for duel mode)
  mode: null,           // 'duel' | 'coop' | null
  sizeMode: 'normal',   // 大画面モードをホストから共有（normal | large）
  peer: null,           // { name, x, y, lives, score, weapon, last }
  peer2: null,          // { name, x, y, lives, score, weapon, last } (for co-op mode)
  lobby: { players: new Set(), rooms: new Map() },
  // 内部
  wantLobby: true,
  started: false,       // 対戦開始フラグ（2回目以降の gstart を無視）
  retryTimer: null,
  hbTimer: null,
  cb: {},
};

/** ロビーの部屋告知 TTL（秒） */
const ROOM_TTL = 60;
/** 対戦相手からの位置情報タイムアウト（ms） */
const PEER_TIMEOUT = 5000;
/** 位置同期の送信間隔（tick） */
const POS_EVERY = 2;

function emit(name, arg) { if (N.cb[name]) N.cb[name](arg); }

/** 設定を再読み込み（カスタムAPI設定の保存後などに呼ぶ） */
function applyConfig() {
  const c = api.current();
  N.cluster = c.cluster;
  N.apiKey = c.apiKey;
  // Note: mode is handled separately via negotiation, not stored in config
}

/** 現在の WebSocket を閉じる */
function closeConn() {
  if (N.conn) {
    const ws = N.conn;
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
    try { ws.close(); } catch { /* noop */ }
    N.conn = null;
  }
}

/** 全停止（ゲーム終了時） */
function shutdown() {
  N.wantLobby = false;
  clearTimeout(N.retryTimer);
  clearInterval(N.hbTimer);
  closeConn();
  N.status = 'off';
  N.connected = false;
}
/** 部屋IDの生成（例: stone_12345） */
function makeRoomId() {
  return api.ROOM_PREFIX + Math.floor(10000 + Math.random() * 90000);
}

/** ロビー（home）へ接続 */
function connectLobby() {
  if (N.status === 'connecting') return;
  clearTimeout(N.retryTimer);
  N.wantLobby = true;
  N.status = 'connecting';
  N.room = api.LOBBY_ROOM;
  N.started = false;
  N.mode = null; // ロビーに戻るときはモードをリセット
  N.peer = null;
  N.peer2 = null;
  emit('status');

  closeConn();
  N.conn = connect({
    cluster: N.cluster,
    apiKey: N.apiKey,
    roomId: N.room,
    onOpen: () => {
      N.status = 'lobby';
      N.connected = true;
      send(N.conn, 'hello', N.me, { name: N.me });
      emit('status');
      emit('lobby');
    },
    onMessage: (msg) => onLobbyMessage(msg),
    onClose: () => {
      N.connected = false;
      if (N.status === 'game') return; // ゲーム中は main 側で処理
      if (N.wantLobby && N.status !== 'off') {
        N.status = 'connecting';
        emit('status');
        N.retryTimer = setTimeout(connectLobby, 3000); // 自動再接続
      }
    },
    onError: () => { /* onClose に集約 */ },
  });
  if (!N.conn) {
    // WebSocket 非対応などで接続不能
    N.status = 'off';
    N.connected = false;
    emit('status');
    return;
  }
  emit('status');
}

/** ロビーのメッセージ処理 */
function onLobbyMessage(msg) {
  const { event, sender, data } = msg;
  if (!sender || sender === N.me) return; // 自分のは無視

  if (event === 'hello') {
    N.lobby.players.add(data && data.name ? data.name : sender);
    emit('lobby');
  } else if (event === 'bye') {
    N.lobby.players.delete(data && data.name ? data.name : sender);
    emit('lobby');
  } else if (event === 'room') {
    if (data && data.roomId) {
      N.lobby.rooms.set(data.roomId, { from: data.name || sender, t: ROOM_TTL });
      emit('lobby');
    }
  }
}

/** 部屋を作成（ロビーに告知 → 部屋へ移動） */
function createRoom(mode = 'duel') {
  const roomId = makeRoomId();
  // ロビーに部屋を告知（モード情報も含める）
  send(N.conn, 'room', N.me, { roomId, name: N.me, mode });
  joinRoom(roomId, true, mode);
}

/**
 * 部屋へ接続（部屋IDを切り替える）
 * @param {string} roomId  stone_12345
 * @param {boolean} isHost 部屋を作った側か
 * @param {string} mode    ゲームモード ('duel' | 'coop')
 */
function joinRoom(roomId, isHost = false, mode = 'duel') {
  clearTimeout(N.retryTimer);
  N.wantLobby = false;
  N.status = 'connecting';
  N.room = roomId;
  N.host = isHost;
  N.mode = mode; // モードを設定
  // duel モードでは side を設定、coop モードでは peer2 用に後で設定
  N.side = isHost && mode === 'duel' ? 'L' : (mode === 'duel' && !isHost ? 'R' : null);
  N.started = false;
  N.peer = null;
  N.peer2 = null;
  emit('status');

  closeConn();
  N.conn = connect({
    cluster: N.cluster,
    apiKey: N.apiKey,
    roomId,
    onOpen: () => {
      N.status = 'game';
      N.connected = true;
      // ホストがまずモードを送信
      if (N.host) {
        send(N.conn, 'gmode', N.me, { mode: N.mode });
      }
      // 自分自身の参加を通知
      send(N.conn, 'gjoin', N.me, { name: N.me, host: isHost });
      emit('status');
    },
    onMessage: (msg) => onGameMessage(msg),
    onClose: () => {
      N.connected = false;
      if (N.status === 'game' && !N.started) {
        // 対戦開始前に切断 → ロビーへ戻る
        N.status = 'connecting';
        emit('status');
        emit('gameDrop', '接続が切れました');
        connectLobby();
      } else if (N.status === 'game') {
        emit('gameDrop', '対戦相手との接続が切れました');
      }
    },
    onError: () => { /* onClose に集約 */ },
  });
  if (!N.conn) {
    N.status = 'off';
    N.connected = false;
    emit('gameDrop', '接続できません（WebSocket非対応）');
    return;
  }
  emit('status');
}

/** 部屋（ゲーム）のメッセージ処理 */
function onGameMessage(msg) {
  const { event, sender, data } = msg;
  if (!sender || sender === N.me) return;

  if (event === 'gmode') {
    // モード情報の受信（ゲスト側）
    if (data && data.mode) {
      N.mode = data.mode;
      // ゲスト側では side を設定（ホストは既に設定済み）
      if (N.mode === 'duel' && !N.host) {
        N.side = 'R';
      }
      // coop モードでは side は使用しない（両方とも同じフィールド）
    }
    emit('lobby'); // モード変更をUIに通知
  } else if (event === 'gjoin') {
    // ホスト側: 相手が来たら開始
    if (N.host && !N.started) {
      N.started = true;
      send(N.conn, 'gstart', N.me, { size: N.sizeMode });
      emit('gameStart', 'L', N.sizeMode);
    }
  } else if (event === 'gstart') {
    // ゲスト側: ホストの開始合図で開始（画面サイズも合わせる）
    if (!N.host && !N.started) {
      N.started = true;
      emit('gameStart', 'R', (data && data.size) || 'normal');
    }
  } else if (event === 'gpos') {
    if (N.mode === 'duel') {
      // 従来の1v1対戦モード
      N.peer = {
        name: (data && data.name) || sender,
        x: data ? data.x : null,
        y: data ? data.y : null,
        lives: data ? data.lives : null,
        score: data ? data.score : null,
        weapon: data ? data.weapon : null,
        last: Date.now(),
      };
    } else if (N.mode === 'coop') {
      // 協力モード: 2人目の位置情報を保存
      const peerData = {
        name: (data && data.name) || sender,
        x: data ? data.x : null,
        y: data ? data.y : null,
        lives: data ? data.lives : null,
        score: data ? data.score : null,
        weapon: data ? data.weapon : null,
        last: Date.now(),
        side: data.side || null, // 'L' or 'R'
      };
      
      // ホストとゲストを区別して保存
      if (N.host) {
        // ホストの場合: 自身が L、相手が R
        if (data.side === 'R') {
          N.peer2 = peerData;
        } else {
          // 自分自身のデータは別途管理（main.js 側で）
          if (!N.peer2 || N.peer2.name !== peerData.name) {
            N.peer2 = peerData;
          }
        }
      } else {
        // ゲストの場合: 自身が R、相手が L
        if (data.side === 'L') {
          N.peer2 = peerData;
        } else {
          if (!N.peer2 || N.peer2.name !== peerData.name) {
            N.peer2 = peerData;
          }
        }
      }
    }
  } else if (event === 'gbye') {
    if (N.started) emit('gameDrop', '対戦相手が退出しました');
  }
}

/** 自機の位置・状態を送信（main の tick から毎回呼んでよい） */
function sendPos(x, y, lives, score, weapon) {
  if (N.status !== 'game' || !N.started) return;
  N.posCounter = (N.posCounter || 0) + 1;
  if (N.posCounter % POS_EVERY !== 0) return;
  
  const posData = { name: N.me, x, y, lives, score, weapon };
  if (N.mode === 'coop') {
    // 協力モードでは side 情報を追加
    posData.side = N.host ? 'L' : 'R';
  }
  send(N.conn, 'gpos', N.me, posData);
}

/** 対戦相手がタイムアウトしていないか（main の tick で判定） */
function peerAlive() {
  if (!N.started) return true;
  
  if (N.mode === 'duel') {
    // 従来の1v1対戦モード
    return !N.peer || Date.now() - N.peer.last < PEER_TIMEOUT;
  } else if (N.mode === 'coop') {
    // 協力モード: 両方のピアが生きている必要はなく、少なくとも片方が生きていればOK
    // ただし、自分自身は常に生きていると仮定
    const peer1Alive = !N.peer || Date.now() - N.peer.last < PEER_TIMEOUT;
    const peer2Alive = !N.peer2 || Date.now() - N.peer2.last < PEER_TIMEOUT;
    return peer1Alive || peer2Alive; // 少なくとも片方が生きていれば続行
  }
  return true;
}

/** 対戦終了（退出）→ ロビーへ戻る */
function leaveGame() {
  if (N.conn && N.status === 'game') {
    // 協力モードでも従来のメッセージで問題なし
    send(N.conn, 'gbye', N.me, {});
  }
  connectLobby();
}

/** 1秒ごとのメンテナンス（ロビー情報の TTL 管理） */
function prune() {
  if (N.status !== 'lobby') return;
  // 部屋告知の期限切れを削除
  for (const [id, r] of N.lobby.rooms) {
    if (--r.t <= 0) N.lobby.rooms.delete(id);
  }
  // ハートビート（自分の存在を再告知）
  send(N.conn, 'hello', N.me, { name: N.me });
  emit('lobby');
}

/** 初期化（main から1回呼ぶ） */
function init(cb) {
  N.cb = cb || {};
  N.hbTimer = setInterval(prune, 5000);
  applyConfig();
}

module.exports = {
  N,
  init,
  applyConfig,
  connectLobby,
  createRoom,
  joinRoom,
  leaveGame,
  sendPos,
  peerAlive,
  shutdown,
  makeRoomId,
};
