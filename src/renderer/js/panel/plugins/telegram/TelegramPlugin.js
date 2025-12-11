import { BotsTab } from './tabs/BotsTab.js';

export class TelegramPlugin {
    constructor() {
        this.name = 'Telegram';
        this.id = 'telegram';
        
        // State
        this.activeNavId = 'bots';
        this.bots = JSON.parse(localStorage.getItem('telegram_bots') || '[]');
        this.activeBotToken = localStorage.getItem('telegram_active_bot') || (this.bots[0]?.token || '');

        // Cache tab instances
        this.tabs = {
            bots: null
        };
    }

    getNavigationItems() {
        return [
            { id: 'bots', label: 'Bots' }
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

        container.innerHTML = '';
        const col = this.createColumn(container);
        
        if (this.tabs[tabId]) {
            this.tabs[tabId].render(col);
        } else {
            container.innerHTML = 'Tab not found';
        }
    }

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

    createColumn(parent) {
        const col = document.createElement('div');
        col.className = 'finder-column animate-in';
        parent.appendChild(col);
        return col;
    }

    initTabInstance(tabId) {
        switch (tabId) {
            case 'bots':
                this.tabs.bots = new BotsTab({
                    bots: this.bots,
                    activeBotToken: this.activeBotToken,
                    onAdd: (token, info) => this.addBot(token, info),
                    onRemove: (token) => this.removeBot(token),
                    onSelect: (token) => this.setActiveBot(token)
                });
                break;
        }
    }

    saveBots() {
        localStorage.setItem('telegram_bots', JSON.stringify(this.bots));
    }

    addBot(token, info) {
        if (this.bots.find(b => b.token === token)) return;
        this.bots.push({ token, info });
        this.saveBots();
        
        // If it's the first bot, make it active
        if (this.bots.length === 1) {
            this.setActiveBot(token);
        }

        // Update tabs
        if (this.tabs.bots) this.tabs.bots.update(this.bots, this.activeBotToken);
    }

    removeBot(token) {
        this.bots = this.bots.filter(b => b.token !== token);
        this.saveBots();
        
        if (this.activeBotToken === token) {
            this.setActiveBot(this.bots[0]?.token || '');
        } else {
            // Just update tabs
             if (this.tabs.bots) this.tabs.bots.update(this.bots, this.activeBotToken);
        }
    }

    setActiveBot(token) {
        this.activeBotToken = token;
        localStorage.setItem('telegram_active_bot', token);
        
        if (this.tabs.bots) this.tabs.bots.update(this.bots, this.activeBotToken);
    }
}
