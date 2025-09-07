import { CONFIG } from './config.js';
import { State } from './state.js';
import { logEvent } from './utils.js';
import { render } from './render.js';

export function spend(cost, label) {
  State.bank -= cost; State.totalSpent += cost;
  logEvent(`Spotřeba: ${label}`, -cost, 0);
  if (!CONFIG.economy.allowNegativeBank && State.bank <= 0) {
    // handled by caller via gameOver
  }
  render();
}

export function earn(amount, label) {
  State.bank += amount; State.totalRevenue += amount;
  logEvent(`Tržba: ${label}`, +amount, 0);
  render();
}

