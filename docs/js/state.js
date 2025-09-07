// Runtime state of the game (mutable single source of truth)
import { CONFIG } from './config.js';

export const State = {
  tickHandle: null,
  decayHandle: null,
  spawnTimer: null,
  shiftRemaining: CONFIG.spawn.shiftDurationSec,
  bank: CONFIG.economy.bankStartCZK,
  bankStart: CONFIG.economy.bankStartCZK,
  customersServed: 0,
  reputationSum: 0,
  totalSpent: 0,
  totalRevenue: 0,
  queue: [],
  active: null,
  phase: 'Idle',
  preparedForThisOrder: [],
  currentItem: null,
  eventLog: [],
  gameOver: false,
};

export function resetState() {
  State.shiftRemaining = CONFIG.spawn.shiftDurationSec;
  State.bank = CONFIG.economy.bankStartCZK;
  State.bankStart = CONFIG.economy.bankStartCZK;
  State.customersServed = 0;
  State.reputationSum = 0;
  State.totalSpent = 0;
  State.totalRevenue = 0;
  State.gameOver = false;
  State.eventLog = [];
  State.queue = [];
  State.active = null;
  State.phase = 'Idle';
  State.preparedForThisOrder = [];
  State.currentItem = null;
}

