import { ProfileTab } from './tabs/ProfileTab.js';
import { DnsTab } from './tabs/DnsTab.js';
import { TunnelTab } from './tabs/TunnelTab.js';
import { UI, injectStyles } from '../../ui/index.js';

export class CloudflarePlugin {
    constructor() {
        this.name = 'Cloudflare';
        this.id = 'cloudflare';
        this.activeNavId = 'tunnels';
        this.apiToken = localStorage.getItem('cf_api_token') || '';
        this.apiEmail = localStorage.getItem('cf_api_email') || '';
        this.tabs = {};
        injectStyles();
    }


    getNavigationItems() {
        return [
            { id: 'profile', label: 'Profile' },
            { id: 'dns', label: 'DNS Zones' },
            { id: 'tunnels', label: 'Tunnels' }
        ];
    }

    renderTab(tabId, container) {
        if (tabId !== 'profile' && !this.apiToken) {
            container.innerHTML = `<div class="ui-empty">
                <h3>Authentication Required</h3><p>Please configure your API Token in the <b>Profile</b> tab.</p>
            </div>`;
            return;
        }

        if (!this.tabs[tabId]) this.initTabInstance(tabId);
        
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-container';
        container.appendChild(wrapper);

        const col = UI.Layout.createColumn(wrapper);
        const instance = this.tabs[tabId];
        
        if (instance) instance.render(col);
        else container.innerHTML = 'Tab not found';
    }

    render(container) {
        this.renderTab(this.activeNavId, container);
    }

    initTabInstance(tabId) {
        const creds = { token: this.apiToken, email: this.apiEmail };
        switch (tabId) {
            case 'profile':
                this.tabs.profile = new ProfileTab({
                    ...creds,
                    onUpdate: (t, e) => this.handleTokenUpdate(t, e)
                });
                break;
            case 'dns':
                this.tabs.dns = new DnsTab(creds);
                break;
            case 'tunnels':
                this.tabs.tunnels = new TunnelTab(creds);
                break;
        }
    }

    handleTokenUpdate(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        
        if (token) {
            localStorage.setItem('cf_api_token', token);
            email ? localStorage.setItem('cf_api_email', email) : localStorage.removeItem('cf_api_email');
        } else {
            localStorage.removeItem('cf_api_token');
            localStorage.removeItem('cf_api_email');
        }

        const creds = { token, email };
        Object.values(this.tabs).forEach(t => t.updateCredentials?.(creds));
    }
}

