import { CONFIG } from './config.js';
import { State, resetState } from './state.js';
import { logEvent, pickPersona, randInt } from './utils.js';
import { applyPenalty, applyReward, tipFromS } from './satisfaction.js';
import { spend, earn } from './economy.js';
import { newOrderWeighted, orderTotal } from './orders.js';
import { render, flashPhase, showPayErrorInline } from './render.js';
import { showReport } from './report.js';

export function createCustomer() {
  const persona = pickPersona(CONFIG.personas);
  const S0 = randInt(persona.startSatisfactionRange[0], persona.startSatisfactionRange[1]);
  const cust = {
    id: 'C' + Date.now(),
    personaId: persona.id,
    persona,
    S: S0,
    phase: 'Ordering',
    order: null,
    timers: { enteredAt: performance.now(), lastEventAt: performance.now(), preparedAt: null },
  };
  return cust;
}

export function promoteNext() {
  if (!State.active && State.queue.length > 0) {
    const next = State.queue.shift();
    State.active = next;
    State.preparedForThisOrder = [];
    State.currentItem = null;
    State.phase = 'Ordering';
    render();
  }
}

export function scheduleNextSpawn() {
  if (State.spawnTimer) clearTimeout(State.spawnTimer);
  const [minS, maxS] = CONFIG.spawn.spawnIntervalSec;
  const delay = randInt(minS * 1000, maxS * 1000);
  State.spawnTimer = setTimeout(() => {
    State.queue.push(createCustomer());
    logEvent('Nový člověk do fronty');
    promoteNext();
    render();
    scheduleNextSpawn();
  }, delay);
}

export function toPreparing() {
  if (!State.active) return;
  if (!State.active.order) {
    flashPhase('Nejprve přijmi objednávku.');
    return;
  }
  State.active.phase = 'Preparing';
  State.phase = 'Preparing';
  render();
}

export function toPayment() {
  if (!State.active) return;
  const wanted = State.active.order?.items.length || 0;
  const ready = State.active.order?.prepared.length || 0;
  if (ready !== wanted) {
    const d = applyPenalty(CONFIG.satisfaction.base.wrongItemsAtPayment);
    logEvent('Pokus o platbu se špatným počtem položek', 0, d);
    render();
    return;
  }
  State.active.phase = 'Payment';
  State.phase = 'Payment';
  render();
}

export function finalizeItem() {
  if (!State.active) return;
  const it = State.currentItem;
  if (!it) return;
  State.active.order.prepared.push({ productId: it.productId, size: it.size, actual: it.actual });
  State.currentItem = null;
  if (State.active.order.prepared.length === State.active.order.items.length) {
    State.active.timers.preparedAt = performance.now();
  }
  render();
}

export function pickSize(size) {
  if (!State.active) return;
  if (State.active.phase === 'Ordering') toPreparing();
  const cupId = size === 'S' ? 'cup_S' : size === 'M' ? 'cup_M' : 'cup_L';
  State.currentItem = { productId: 'coffee', size, actual: { [cupId]: 1 } };
  spend(CONFIG.costsCZK[cupId], `Kelímek ${size}`);
  if (!CONFIG.economy.allowNegativeBank && State.bank <= 0) {
    gameOver('Bankrot: došla hotovost.');
  }
  render();
}

export function tapPot() {
  if (!State.active) return;
  if (State.active.phase !== 'Preparing') { toPreparing(); }
  if (!State.currentItem) {
    spend(CONFIG.costsCZK.dose_coffee, 'Dávka kávy (vylito na pult)');
    logEvent('Chyba pořadí: káva bez kelímku → vylito na pult');
    flashPhase('Vylito na pult — nejdřív kelímek!');
    render();
    return;
  }
  const act = State.currentItem.actual;
  act.dose_coffee = (act.dose_coffee || 0) + 1;
  spend(CONFIG.costsCZK.dose_coffee, 'Dávka kávy');
  if (!CONFIG.economy.allowNegativeBank && State.bank <= 0) {
    gameOver('Bankrot: došla hotovost.');
  }
  render();
}

export function trashItem() {
  if (!State.currentItem) return;
  State.currentItem = null;
  logEvent('Koš: rozpracovaná položka zahozena');
  render();
}

export function finishPayment(entered) {
  if (!State.active) return false;
  if (!State.active.order) { showPayErrorInline(true); logEvent('Platba bez objednávky'); return false; }
  const wantedCnt = State.active.order.items.length;
  const readyCnt = State.active.order.prepared.length;
  if (wantedCnt !== readyCnt) { showPayErrorInline(true); logEvent('Platba zablokována: neshodují se seznamy'); return false; }
  const sum = orderTotal(State.active.order);
  if (entered !== sum) {
    const d = applyPenalty(CONFIG.satisfaction.base.wrongTotalBeforeConfirm);
    logEvent(`Špatná částka zadána: ${entered} ≠ ${sum}`, 0, d);
    showPayErrorInline(true);
    render();
    return false;
  }
  const S = State.active.S;
  const tip = tipFromS(S);
  earn(sum + tip, `Platba ${sum} + sprop. ${tip}`);
  State.customersServed += 1;
  State.reputationSum += S;
  logEvent(`Zákazník obsloužen (S=${S})`);
  State.active = null;
  promoteNext();
  render();
  return true;
}

export function startShift() {
  resetState();

  // initial queue
  State.queue.push(createCustomer());
  promoteNext();
  scheduleNextSpawn();

  if (State.tickHandle) cancelAnimationFrame(State.tickHandle);
  const tick = () => {
    if (State.gameOver) return;
    render();
    State.tickHandle = requestAnimationFrame(tick);
  };
  State.tickHandle = requestAnimationFrame(tick);

  if (State.decayHandle) clearInterval(State.decayHandle);
  State.decayHandle = setInterval(() => {
    if (State.gameOver) return;
    if (State.shiftRemaining > 0) {
      State.shiftRemaining -= 1;
      if (State.shiftRemaining <= 0) { endShift(); }
    }
    if (State.active) {
      State.active.S = Math.max(
        CONFIG.satisfaction.clampMin,
        Math.min(CONFIG.satisfaction.clampMax, State.active.S - State.active.persona.decayPerSecond),
      );
    }
    render();
  }, 1000);
}

export function endShift() {
  if (State.gameOver) return;
  State.gameOver = true;
  showReport('Směna skončila', false);
}

export function gameOver(reason) {
  if (State.gameOver) return;
  State.gameOver = true;
  logEvent(`Konec hry: ${reason}`);
  showReport(reason || 'Konec hry', true);
}

// Expose small helpers from this module used by UI
export { applyReward, applyPenalty, newOrderWeighted };

