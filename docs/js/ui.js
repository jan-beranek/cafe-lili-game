import { el } from './utils.js';
import { applyReward, applyPenalty, toPreparing, finalizeItem, pickSize, tapPot, trashItem, finishPayment, startShift } from './game.js';
import { CONFIG } from './config.js';
import { logEvent } from './utils.js';
import { newOrderWeighted } from './game.js';
import { render, buildKeypad, toggleDev, flashPhase } from './render.js';
import { State } from './state.js';
import { hideReport } from './report.js';

export function bind() {
  el('btnGreeting').onclick = () => {
    if (State.active) {
      const isNewOrder = !State.active.order;
      if (isNewOrder) {
        State.active.order = newOrderWeighted();
        logEvent('Zadána objednávka zákazníka');
      }
      const d = applyReward(CONFIG.satisfaction.base.goodGreeting);
      logEvent('Replika: greeting', 0, d);
      render();
    }
  };

  el('btnConfirm').onclick = () => {
    if (State.active) {
      if (!State.active.order) { flashPhase('Nejprve přijmi objednávku.'); return; }
      const d = applyReward(CONFIG.satisfaction.base.goodGreeting);
      logEvent('Replika: confirm', 0, d);
      render();
      toPreparing();
    }
  };

  el('btnBad').onclick = () => {
    if (State.active) {
      const d = applyPenalty(CONFIG.satisfaction.base.badReply);
      logEvent('Replika: nevhodná', 0, d);
      render();
    }
  };

  el('btnSizeS').onclick = () => pickSize('S');
  el('btnSizeM').onclick = () => pickSize('M');
  el('btnSizeL').onclick = () => pickSize('L');
  el('btnPot').onclick = () => tapPot();
  el('btnFinalize').onclick = () => finalizeItem();
  el('btnTrash').onclick = () => trashItem();

  el('btnPayConfirmInline').onclick = () => {
    const v = parseInt(el('payInputInline').value || '0', 10);
    finishPayment(isFinite(v) ? v : 0);
  };

  el('btnToggleDev').onclick = toggleDev;
  document.addEventListener('keydown', (e) => { if (e.key === 'd' || e.key === 'D') toggleDev(); });
  el('btnRestart').onclick = () => { hideReport(); startShift(); render(); };

  buildKeypad();
}

