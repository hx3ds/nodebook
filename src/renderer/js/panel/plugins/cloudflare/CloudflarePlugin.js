import { ProfileTab } from './tabs/ProfileTab.js';
import { DnsTab } from './tabs/DnsTab.js';
import { TunnelTab } from './tabs/TunnelTab.js';

export class CloudflarePlugin {
    constructor() {
        this.name = 'Cloudflare';
        this.id = 'cloudflare';
        
        // State
        this.activeNavId = 'tunnels'; // Legacy/Default
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

    // New Interface for Multi-Tabs
    renderTab(tabId, container) {
        // Redirect if not connected (unless it's profile)
        if (tabId !== 'profile' && !this.apiToken) {
            // In a tabbed interface, we might want to show a "Please Connect" message 
            // instead of redirecting the whole tab content to Profile,
            // or just render Profile here.
            // Let's render a simple message linking to Profile.
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <h3>Authentication Required</h3>
                    <p>Please configure your API Token in the <b>Profile</b> tab first.</p>
                </div>
            `;
            return;
        }

        if (!this.tabs[tabId]) {
            this.initTabInstance(tabId);
        }

        // With multi-tabs, the container is exclusive to this tab.
        // We create the root column inside it.
        container.innerHTML = '';
        const col = this.createColumn(container);
        
        // Render the specific tab instance
        // Note: 'tunnels' vs 'tunnel' mismatch handling
        const instance = this.tabs[tabId] || (tabId === 'tunnels' ? this.tabs.tunnels : null);
        
        if (instance) {
            instance.render(col);
        } else {
            container.innerHTML = 'Tab not found';
        }
    }

    // Legacy render for backward compatibility if needed, or initial view
    render(container) {
        this.container = container;
        this.renderColumnView();
    }

    renderColumnView() {
        if (!this.container) return;
        this.container.innerHTML = '';

        // Determine which Tab to render as the first "Content" column
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
                this.tabs.tunnels = new TunnelTab(this.apiToken, this.apiEmail);
                // Map it if needed
                if (tabId === 'tunnels') this.tabs[tabId] = this.tabs.tunnels;
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
