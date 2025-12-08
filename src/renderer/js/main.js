// Main entry point - ties all modules together
import { room } from './room/room.js';
import { explorer } from './explorer/explorer.js';
import { projection } from './projection/projection.js';
import { panel } from './panel/panel.js';
import { control } from './control/control.js';

window.room = room;
window.explorer = explorer;
window.projection = projection;
window.panel = panel;
window.control = control;

window.addEventListener('load', init);

function init() {
    room.init();
    explorer.init();
    control.init(); // Init controls before projection might use them
    projection.init();
    panel.init();
}
