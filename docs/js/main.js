// Entry point: wires tests, events, and starts the shift
import { bind } from './ui.js';
import { runTests } from './tests.js';
import { startShift } from './game.js';
import { render } from './render.js';

// Initialize
runTests();
bind();
startShift();
render();

