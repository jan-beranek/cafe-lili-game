import { el, clamp } from './utils.js';
import { CONFIG } from './config.js';
import { State } from './state.js';
import { finishPayment } from './game.js';

export function runTests() {
  const tests = [];
  const assert = (name, cond) => tests.push({ name, pass: !!cond });

  // DOM existence tests
  ['time','bank','served','reputation','sbar','queueHeads','queueCount','bubble','orderLabel','phase','orderedList','preparedList','paymentPanel','payInputInline','keypadInline','btnPayConfirmInline','payErrorInline','reportOverlay','btnRestart']
    .forEach(id => assert(`#${id} exists`, !!el(id)));

  // payment blocking tests
  const keepActive = State.active, keepServed = State.customersServed;
  State.active = { S:70, order:{ items:[{productId:'coffee', size:'S'}], prepared: [] } };
  assert('finishPayment blocked when not prepared', finishPayment(CONFIG.pricesCZK.coffee.S) === false);
  State.active = keepActive; State.customersServed = keepServed;

  // clamp tests
  assert('clamp below', clamp(-5,0,10)===0);
  assert('clamp inside', clamp(7,0,10)===7);
  assert('clamp above', clamp(15,0,10)===10);

  const failed = tests.filter(t => !t.pass);
  if (failed.length) {
    console.warn('Self-tests failed:', failed.map(f => f.name));
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;bottom:8px;background:#fff3f3;border:1px solid #ffcccc;color:#a00;padding:8px 10px;border-radius:8px;z-index:9999;font:12px/1.3 system-ui';
    box.textContent = `Self-testy neprošly: ${failed.length}. Zkontroluj konzoli.`;
    document.body.appendChild(box);
  } else {
    console.log('Self-tests OK');
  }
}

