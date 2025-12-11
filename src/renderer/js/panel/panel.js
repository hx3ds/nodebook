import { PanelManager } from './PanelManager.js';
import { CloudflarePlugin } from './plugins/cloudflare/CloudflarePlugin.js';
import { TelegramPlugin } from './plugins/telegram/TelegramPlugin.js';

const manager = new PanelManager('panel-layer');

export const panel = {
    // Expose manager for debugging/advanced usage
    manager: manager,

    // Proxy properties for compatibility with existing code (e.g. controlEventHandler.js)
    get uiVisible() {
        return manager.isVisible;
    },
    
    set uiVisible(value) {
        manager.toggleVisibility(!!value);
    },
    
    get element() {
        return manager.element;
    },

    init() {
        // Initialize the Panel Manager with the main container ID
        manager.init();

        // Register Plugins
        manager.registerPlugin(new CloudflarePlugin());
        manager.registerPlugin(new TelegramPlugin());
        
        // If we want to expose the manager globally for debugging
        window.panelManager = manager;
        
        // Ensure the panel is visible if it was before
        const el = document.getElementById('panel-layer');
        // We don't force display flex here, let the manager state handle it or initial CSS
        // But if manager.isVisible is false (default), it stays hidden.
    }
};
