import { RequestTab } from './tabs/RequestTab.js';
import { UI } from '../../ui/index.js';

export class HttpClientPlugin {
    constructor() {
        this.name = 'HTTP Client';
        this.id = 'http-client';
        
        // State
        this.activeNavId = 'request';
        
        // Cache tab instances
        this.tabs = {
            request: null
        };
    }

    getNavigationItems() {
        return [
            { id: 'request', label: 'Client' }
        ];
    }

    setActiveNav(id) {
        this.activeNavId = id;
    }

    onActivate() {
        // Called when plugin becomes active
    }

    renderTab(tabId, container) {
        if (!this.tabs[tabId]) {
            this.initTabInstance(tabId);
        }

        // Clear container
        container.innerHTML = '';
        const col = UI.Layout.createColumn(container);
        
        const instance = this.tabs[tabId];
        
        if (instance) {
            instance.render(col);
        } else {
            container.innerHTML = 'Tab not found';
        }
    }

    // Legacy render for backward compatibility or initial view
    render(container) {
        this.container = container;
        this.renderColumnView();
    }

    renderColumnView() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const tabId = this.activeNavId;
        this.renderTab(tabId, this.container);
    }

    initTabInstance(tabId) {
        switch (tabId) {
            case 'request':
                this.tabs.request = new RequestTab();
                break;
        }
    }
}
