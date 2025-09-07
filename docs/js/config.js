// Central configuration for the Coffee Stand game
export const CONFIG = {
  economy: {
    bankStartCZK: 200,
    allowNegativeBank: false,
    tip: { enabled: true, formula: 'linear60to8' },
  },
  pricesCZK: { coffee: { S: 39, M: 49, L: 59 } },
  costsCZK: { dose_coffee: 7, cup_S: 3, cup_M: 4, cup_L: 5 },
  recipes: {
    coffee: {
      S: { dose_coffee: 1, cup_S: 1 },
      M: { dose_coffee: 2, cup_M: 1 },
      L: { dose_coffee: 3, cup_L: 1 },
    },
  },
  products: [
    { id: 'coffee', name: 'Káva', sizes: ['S', 'M', 'L'], trainingVisible: true },
  ],
  sizes: ['S', 'M', 'L'],
  denominationsCZK: [1,2,5,10,20,50,100,200,500,1000,2000],
  personas: [
    { id: 'default', name: 'Běžný', startSatisfactionRange: [60, 80], decayPerSecond: 0.25 },
    { id: 'rush', name: 'Ve spěchu', startSatisfactionRange: [55, 70], decayPerSecond: 0.35 },
    { id: 'chill', name: 'V pohodě', startSatisfactionRange: [70, 90], decayPerSecond: 0.15 },
  ],
  spawn: { shiftDurationSec: 420, spawnIntervalSec: [8, 12], maxQueueVisual: 4 },
  orders: { itemCountWeights: { 1: 0.6, 2: 0.3, 3: 0.1 } },
  satisfaction: {
    clampMin: 0,
    clampMax: 100,
    penaltyScale: { base: 40, min: 0.5, max: 2.0 },
    rewardScale: { base: 50, min: 0.5, max: 1.8 },
    base: {
      goodGreeting: 3,
      badReply: -4,
      wrongItemsAtPayment: -10,
      fastService: 6,
      wrongTotalBeforeConfirm: -8,
    },
    fastThresholdSec: 15,
  },
  ui: { dialogChoicesPerPhase: 3, showMenuBoard: true, showRunningTotal: false, devConsole: { enabled: true } },
};

