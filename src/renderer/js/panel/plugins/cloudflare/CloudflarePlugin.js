import { ProfileTab } from './tabs/ProfileTab.js';
import { DnsTab } from './tabs/DnsTab.js';
import { TunnelTab } from './tabs/TunnelTab.js';

export class CloudflarePlugin {
    constructor() {
        this.name = 'Cloudflare';
        this.id = 'cloudflare';
        
        // State
        this.activeNavId = 'tunnels'; // Default to something useful
        this.apiToken = localStorage.getItem('cf_api_token') || '';
        this.apiEmail = localStorage.getItem('cf_api_email') || '';
        
        // Cache tab instances
        this.tabs = {
            profile: null,
            dns: null,
            tunnel: null
        };
    }

    // New: Expose navigation items to the sidebar
    getNavigationItems() {
        return [
            { id: 'profile', label: 'Profile' },
            { id: 'dns', label: 'DNS Zones' },
            { id: 'tunnels', label: 'Tunnels' }
        ];
    }

    setActiveNav(id) {
        this.activeNavId = id;
    }

    onActivate() {
        // Called when plugin becomes active
    }

    render(container) {
        this.container = container;
        this.renderColumnView();
    }

    renderColumnView() {
        if (!this.container) return;
        this.container.innerHTML = '';

        // Determine which Tab to render as the first "Content" column
        const tabId = this.activeNavId;
        
        if (tabId !== 'profile' && !this.apiToken) {
            // Show Profile if not connected
            this.activeNavId = 'profile';
            this.initTabInstance('profile');
            this.tabs.profile.render(this.createColumn(this.container));
            return;
        }

        if (!this.tabs[tabId]) {
            this.initTabInstance(tabId);
        }

        // Render the active tab into a new column
        const col = this.createColumn(this.container);
        this.tabs[tabId].render(col);
    }

    createColumn(parent) {
        const col = document.createElement('div');
        col.className = 'finder-column animate-in';
        parent.appendChild(col);
        return col;
    }

    initTabInstance(tabId) {
        switch (tabId) {
            case 'profile':
                this.tabs.profile = new ProfileTab({
                    onTokenUpdate: (token, email) => this.handleTokenUpdate(token, email),
                    initialToken: this.apiToken,
                    initialEmail: this.apiEmail
                });
                break;
            case 'dns':
                this.tabs.dns = new DnsTab(this.apiToken, this.apiEmail);
                break;
            case 'tunnels':
                // Note: ID mismatch fix, user uses 'tunnels' in nav but 'tunnel' in logic? 
                // Let's stick to 'tunnels' for nav ID and 'tunnel' for internal var if needed.
                this.tabs.tunnels = new TunnelTab(this.apiToken, this.apiEmail);
                // Map the instance correctly if needed, but I'll use the ID 'tunnels' here on out
                this.tabs[tabId] = this.tabs.tunnels; 
                break;
        }
    }

    handleTokenUpdate(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        
        if (token) {
            localStorage.setItem('cf_api_token', token);
            if (email) localStorage.setItem('cf_api_email', email);
            else localStorage.removeItem('cf_api_email');
        } else {
            localStorage.removeItem('cf_api_token');
            localStorage.removeItem('cf_api_email');
        }

        // Update other tabs
        if (this.tabs.dns) this.tabs.dns.updateCredentials(token, email);
        if (this.tabs.tunnels) this.tabs.tunnels.updateCredentials(token, email);
    }
}
