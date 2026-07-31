'use strict';

/**
 * PieSocket 生WebSocket接続の薄いラッパー
 * 依存SDKなし。Node 18+ / 24 のグローバル WebSocket を使用。
 *
 * 接続URL: wss://{CLUSTER}.piesocket.com/v3/{ROOM}?api_key={KEY}&notify_self=1
 *  - notify_self=1: 自分が送ったメッセージも受信する（部屋の人数把握に必須）
 *  - メッセージは JSON で送受信する
 */

/** WebSocket が使えるか */
function supported() {
  return typeof WebSocket === 'function';
}

/**
 * PieSocket ルームへ接続する。
 * @param {object} opt
 * @param {string} opt.cluster  クラスターID (例: free.blr2)
 * @param {string} opt.apiKey   APIキー
 * @param {string} opt.roomId   ルームID (例: home / stone_12345)
 * @param {Function} opt.onOpen  接続成功時
 * @param {Function} opt.onMessage メッセージ受信時 (JSON)
 * @param {Function} opt.onClose  切断時 (code, reason)
 * @param {Function} opt.onError  エラー時
 * @returns {WebSocket|null}
 */
function connect({ cluster, apiKey, roomId, onOpen, onMessage, onClose, onError }) {
  if (!supported()) {
    if (onError) onError(new Error('この Node では WebSocket が使えません（Node 22+ 推奨）'));
    return null;
  }
  const url = `wss://${cluster}.piesocket.com/v3/${roomId}?api_key=${encodeURIComponent(apiKey)}&notify_self=1`;
  let ws;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    if (onError) onError(e);
    return null;
  }
  ws.onopen = () => onOpen && onOpen();
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(String(ev.data)); } catch { return; }
    if (onMessage) onMessage(msg);
  };
  ws.onclose = (ev) => onClose && onClose(ev.code, ev.reason);
  ws.onerror = () => { /* エラーは onclose に集約（Node の仕様） */ };
  return ws;
}

/** メッセージ送信 */
function send(ws, type, from, data) {
  if (!ws || ws.readyState !== 1) return false;
  try {
    ws.send(JSON.stringify({ event: type, sender: from, data: data || {} }));
    return true;
  } catch {
    return false;
  }
}

module.exports = { connect, send, supported };
