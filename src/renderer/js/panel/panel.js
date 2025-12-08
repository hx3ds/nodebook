
import { ProfileManager } from './cloudflare/profile/ProfileManager.js';
import { DnsManager } from './cloudflare/dns/DnsManager.js';
import { tunnel } from './cloudflare/tunnel/TunnelManager.js';

export const panel = {
    element: null,
    uiVisible: false,
    
    // State
    currentView: 'profile', // 'profile', 'zones', 'tunnels'
    apiToken: '',
    apiEmail: '',
    connected: false,
    
    // Modules
    managers: {
        profile: null,
        dns: null,
        tunnels: null
    },

    init() {
        this.element = document.getElementById('panel-layer');
        this.apiToken = localStorage.getItem('cf_api_token') || '';
        this.apiEmail = localStorage.getItem('cf_api_email') || '';
        this.connected = !!this.apiToken;
        
        this.render();
        this.initManagers();
        
        // Apply initial visibility
        if (this.element) {
            this.element.style.display = this.uiVisible ? 'flex' : 'none';
        }
    },
    
    initManagers() {
        const contentContainer = this.element.querySelector('.panel-content');
        if (!contentContainer) return;
        
        // Create containers for each view to preserve state
        const profileContainer = document.createElement('div');
        profileContainer.id = 'view-profile';
        profileContainer.className = 'view-container';
        contentContainer.appendChild(profileContainer);
        
        const dnsContainer = document.createElement('div');
        dnsContainer.id = 'view-zones';
        dnsContainer.className = 'view-container';
        dnsContainer.style.display = 'none';
        contentContainer.appendChild(dnsContainer);
        
        const tunnelContainer = document.createElement('div');
        tunnelContainer.id = 'view-tunnels';
        tunnelContainer.className = 'view-container';
        tunnelContainer.style.display = 'none';
        contentContainer.appendChild(tunnelContainer);
        
        // Initialize Managers
        this.managers.profile = new ProfileManager(profileContainer, {
            onTokenUpdate: (token, email) => this.onTokenUpdate(token, email)
        });
        
        this.managers.dns = new DnsManager(dnsContainer, this.apiToken, this.apiEmail);
        this.managers.tunnels = tunnel;
        this.managers.tunnels.init(tunnelContainer, this.apiToken, this.apiEmail);
        
        // Set initial credentials for profile (others get it in constructor)
        this.managers.profile.setCredentials(this.apiToken, this.apiEmail);
    },
    
    onTokenUpdate(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        this.connected = !!token;
        
        if (token) {
            localStorage.setItem('cf_api_token', token);
            if (email) {
                localStorage.setItem('cf_api_email', email);
            } else {
                localStorage.removeItem('cf_api_email');
            }
        } else {
            localStorage.removeItem('cf_api_token');
            localStorage.removeItem('cf_api_email');
        }
        
        // Update other managers
        if (this.managers.dns) this.managers.dns.updateCredentials(token, email);
        if (this.managers.tunnels) this.managers.tunnels.updateCredentials(token, email);
        
        this.updateNavUI();
    },
    
    setView(view) {
        if (view !== 'profile' && !this.connected) return;
        
        this.currentView = view;
        
        // Update Nav
        this.updateNavUI();
        
        // Update View Visibility
        ['profile', 'zones', 'tunnels'].forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) el.style.display = v === view ? 'block' : 'none';
        });
        
        // Trigger specific view refreshes if needed (optional)
        if (view === 'zones' && this.managers.dns) {
            // maybe refresh?
        }
    },
    
    updateNavUI() {
        const navProfile = document.getElementById('nav-profile');
        const navZones = document.getElementById('nav-zones');
        const navTunnels = document.getElementById('nav-tunnels');
        
        if (navProfile) {
            navProfile.classList.toggle('active', this.currentView === 'profile');
        }
        
        if (navZones) {
            navZones.classList.toggle('active', this.currentView === 'zones');
            navZones.disabled = !this.connected;
            if (!this.connected) {
                navZones.style.opacity = '0.5';
                navZones.style.cursor = 'not-allowed';
            } else {
                navZones.style.opacity = '1';
                navZones.style.cursor = 'pointer';
            }
        }
        
        if (navTunnels) {
            navTunnels.classList.toggle('active', this.currentView === 'tunnels');
            navTunnels.disabled = !this.connected;
            if (!this.connected) {
                navTunnels.style.opacity = '0.5';
                navTunnels.style.cursor = 'not-allowed';
            } else {
                navTunnels.style.opacity = '1';
                navTunnels.style.cursor = 'pointer';
            }
        }
    },
    
    render() {
        this.element.innerHTML = `
            <div class="panel-container">
                <div class="panel-nav">
                    <button class="panel-nav-btn" id="nav-profile">
                        Profile & Auth
                    </button>
                    <button class="panel-nav-btn" id="nav-zones">
                        DNS Zones
                    </button>
                    <button class="panel-nav-btn" id="nav-tunnels">
                        Zero Trust Tunnels
                    </button>
                </div>
                
                <div class="panel-content custom-scrollbar">
                    <!-- Content injected by managers -->
                </div>
            </div>
        `;
        
        this.setupEvents();
        this.updateNavUI();
    },
    
    setupEvents() {
        document.getElementById('nav-profile').addEventListener('click', () => this.setView('profile'));
        document.getElementById('nav-zones').addEventListener('click', () => this.setView('zones'));
        document.getElementById('nav-tunnels').addEventListener('click', () => this.setView('tunnels'));
    }
};
