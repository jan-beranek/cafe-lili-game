import { CONFIG } from './config.js';
import { State } from './state.js';
import { clamp } from './utils.js';

export function applyPenalty(base) {
  const S = State.active?.S ?? 50;
  const sc = CONFIG.satisfaction.penaltyScale;
  const factor = clamp((100 - S) / sc.base, sc.min, sc.max);
  const delta = Math.round(base * factor);
  if (State.active) {
    State.active.S = clamp(
      State.active.S - delta,
      CONFIG.satisfaction.clampMin,
      CONFIG.satisfaction.clampMax,
    );
  }
  return -delta;
}

export function applyReward(base) {
  const S = State.active?.S ?? 50;
  const sc = CONFIG.satisfaction.rewardScale;
  const factor = clamp((100 - S) / sc.base + 0.5, sc.min, sc.max);
  const delta = Math.round(base * factor);
  if (State.active) {
    State.active.S = clamp(
      State.active.S + delta,
      CONFIG.satisfaction.clampMin,
      CONFIG.satisfaction.clampMax,
    );
  }
  return +delta;
}

export function tipFromS(S) {
  if (!CONFIG.economy.tip.enabled) return 0;
  // linear60to8: max 8 Kč, od S>60
  return Math.max(0, Math.floor((S / 100 - 0.6) * 20));
}

