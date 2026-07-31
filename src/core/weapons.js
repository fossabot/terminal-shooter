'use strict';

/**
 * 武器進化システム
 * ステージクリアごとに射撃パターンが進化する。
 *   Lv1 単発 → Lv2 二連 → Lv3 三方向 → Lv4 貫通二連 → Lv5 五方向 → Lv6 MAX
 */
const { MAX_WEAPON } = require('../config');

const WEAPONS = [
  { lv: 1, name: 'スパローショット',       desc: '単発ショット' },
  { lv: 2, name: 'ツインランサー',         desc: '二連直線ショット' },
  { lv: 3, name: 'トライスプレッダー',     desc: '三方向拡散' },
  { lv: 4, name: 'ピアッサー',             desc: '貫通 × 二連' },
  { lv: 5, name: 'ファイブウェイバースト', desc: '五方向拡散' },
  { lv: 6, name: 'ノヴァブリッツ',         desc: '五方向 × 高速連射' },
];

/**
 * パワーモード（10秒強化）中の最強弾
 * 七方向 + 貫通 + 高速。オーバードライブ中も同様。
 */
function firePower(E) {
  const spd = 1.6;
  const dirs = [
    [0, -1], [-0.4, -0.92], [0.4, -0.92],
    [-0.85, -0.55], [0.85, -0.55],
    [-1.2, -0.35], [1.2, -0.35],
  ];
  for (const [vx, vy] of dirs) {
    E.bullets.push({ x: E.px + vx, y: E.py - 1, vx: vx * spd, vy: vy * spd, pierce: 3 });
  }
}

/**
 * 現在の武器レベルで弾を発射する。
 * パワーモード中は最強弾に切り替わる。
 * @param {object} E ゲーム状態
 */
function fireWeapon(E) {
  if (E.power > 0 || E.overdrive > 0) return firePower(E);

  const lv = Math.min(MAX_WEAPON, Math.max(1, E.weapon));
  const sx = E.px;
  const sy = E.py - 1;
  // MAX レベルは弾速アップ
  const spd = lv >= 6 ? 1.3 : 1;
  const A = (vx, vy, pierce = 0) => ({
    x: sx + vx, y: sy, vx: vx * spd, vy: vy * spd, pierce,
  });

  switch (lv) {
    case 1: E.bullets.push(A(0, -1)); break;
    case 2: E.bullets.push(A(-0.5, -0.95), A(0.5, -0.95)); break;
    case 3: E.bullets.push(A(0, -1), A(-0.4, -0.92), A(0.4, -0.92)); break;
    case 4: E.bullets.push(A(-0.5, -0.95, 2), A(0.5, -0.95, 2)); break;
    case 5:
      E.bullets.push(
        A(0, -1),
        A(-0.4, -0.92), A(0.4, -0.92),
        A(-0.85, -0.55), A(0.85, -0.55)
      );
      break;
    default: // 6: MAX
      E.bullets.push(
        A(0, -1, 1),
        A(-0.4, -0.92, 1), A(0.4, -0.92, 1),
        A(-0.85, -0.55), A(0.85, -0.55)
      );
  }
}

module.exports = { WEAPONS, fireWeapon, firePower, MAX_WEAPON };
