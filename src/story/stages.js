'use strict';

/**
 * ストーリーモード ステージデータ
 * 全5ステージ。各ステージは複数ウェーブ + ボス戦で構成される。
 * 難度はステージが進むほど敵スピード・HP・攻撃頻度がスケーリングする。
 */
const STAGES = [
  {
    id: 1,
    code: 'SECTOR-01',
    title: '小惑星帯の哨戒',
    waves: [
      { enemies: [['scout', 6]], rate: 26, cap: 5 },
      { enemies: [['scout', 5], ['grunt', 3]], rate: 22, cap: 6 },
      { enemies: [['grunt', 6], ['tank', 2]], rate: 20, cap: 6 },
    ],
    boss: { name: '哨戒機 WATCHER', ch: '◎', hp: 12, sp: 0.5, fireEvery: 40, pattern: 'spread' },
    clearScore: 1000,
  },
  {
    id: 2,
    code: 'SECTOR-02',
    title: 'ネビュラの伏兵',
    waves: [
      { enemies: [['scout', 6], ['grunt', 3]], rate: 20, cap: 6 },
      { enemies: [['grunt', 6], ['tank', 3]], rate: 18, cap: 6 },
      { enemies: [['diver', 5], ['grunt', 4], ['tank', 2]], rate: 16, cap: 7 },
    ],
    boss: { name: '重戦艦 NEBULA', ch: '◈', hp: 18, sp: 0.45, fireEvery: 34, pattern: 'spread' },
    clearScore: 1500,
  },
  {
    id: 3,
    code: 'SECTOR-03',
    title: '衛星軌道防衛線',
    waves: [
      { enemies: [['diver', 6], ['grunt', 4]], rate: 16, cap: 7 },
      { enemies: [['grunt', 6], ['elite', 2], ['tank', 3]], rate: 16, cap: 7 },
      { enemies: [['diver', 6], ['elite', 3], ['grunt', 4]], rate: 14, cap: 8 },
    ],
    boss: { name: '装甲艦 IRONWALL', ch: '▣', hp: 26, sp: 0.4, fireEvery: 30, pattern: 'spread' },
    clearScore: 2000,
  },
  {
    id: 4,
    code: 'SECTOR-04',
    title: '重力圏の急襲',
    waves: [
      { enemies: [['grunt', 7], ['elite', 2]], rate: 14, cap: 8 },
      { enemies: [['diver', 7], ['elite', 3], ['grunt', 4]], rate: 13, cap: 8 },
      { enemies: [['elite', 4], ['tank', 4], ['diver', 5]], rate: 12, cap: 8 },
    ],
    boss: { name: '戦闘母艦 GRAVITY', ch: '★', hp: 34, sp: 0.5, fireEvery: 26, pattern: 'aim' },
    clearScore: 2500,
  },
  {
    id: 5,
    code: 'SECTOR-05',
    title: '母艦バルガン中枢',
    waves: [
      { enemies: [['elite', 4], ['diver', 6], ['grunt', 5]], rate: 12, cap: 8 },
      { enemies: [['elite', 5], ['tank', 5]], rate: 12, cap: 8 },
      { enemies: [['elite', 4], ['diver', 6], ['tank', 4]], rate: 10, cap: 8 },
    ],
    boss: { name: '大母艦 VULCAN', ch: '♛', hp: 45, sp: 0.55, fireEvery: 22, pattern: 'aim' },
    clearScore: 5000,
  },
  {
    id: 6,
    code: 'SECTOR-06',
    title: '帝国の防衛線',
    waves: [
      { enemies: [['grunt', 8], ['elite', 3]], rate: 12, cap: 8 },
      { enemies: [['diver', 7], ['elite', 4], ['grunt', 5]], rate: 11, cap: 9 },
      { enemies: [['elite', 5], ['tank', 4], ['diver', 6]], rate: 10, cap: 9 },
    ],
    boss: { name: '防衛指揮艦 COMMANDER', ch: '◇', hp: 55, sp: 0.5, fireEvery: 20, pattern: 'spread' },
    clearScore: 7000,
  },
  {
    id: 7,
    code: 'SECTOR-07',
    title: 'バルガン皇帝 最終決戦',
    waves: [
      { enemies: [['elite', 6], ['tank', 5], ['diver', 7]], rate: 10, cap: 8 },
      { enemies: [['elite', 7], ['tank', 6]], rate: 9, cap: 8 },
      { enemies: [['elite', 5], ['diver', 8], ['tank', 4]], rate: 8, cap: 8 },
    ],
    boss: { name: 'バルガン皇帝 FLAGSHIP', ch: '♚', hp: 80, sp: 0.6, fireEvery: 16, pattern: 'aim' },
    clearScore: 10000,
  },
];

/** 現在のステージデータを取得 */
function stageData(E) {
  return STAGES[E.stage - 1];
}

module.exports = { STAGES, stageData };
