import * as api from './tunnelApiHandlers.js';

export const tunnel = {
    container: null,
    apiToken: null,
    apiEmail: null,
    
    // State
    accounts: [],
    selectedAccount: null,
    tunnels: [],
    loading: false,
    error: null,
    
    // Creation State
    showCreateTunnel: false,
    newTunnelName: '',
    creatingTunnel: false,
    
    // Edit State
    editingTunnelId: null,
    editTunnelName: '',
    savingEdit: false,
    
    // Extended State
    activeTunnelToken: null,
    activeTunnelConfig: null,
    activeTunnelConnections: [],
    loadingDetails: false,
    detailsTunnelId: null,

    init(container, apiToken, apiEmail) {
        this.container = container;
        this.apiToken = apiToken;
        this.apiEmail = apiEmail;
        
        if (this.apiToken) {
            this.fetchAccounts();
        } else {
            this.render();
        }
    },
    
    updateCredentials(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        this.accounts = [];
        this.selectedAccount = null;
        this.tunnels = [];
        this.error = null;
        
        if (token) {
            this.fetchAccounts();
        } else {
            this.render();
        }
    },

    async fetchAccounts() {
        this.loading = true;
        this.render();
        try {
            this.accounts = await api.fetchAccounts(this.apiToken, this.apiEmail);
            
            if (this.accounts.length > 0) {
                this.selectedAccount = this.accounts[0];
                await this.fetchTunnels();
            } else {
                this.error = "No accounts found. Ensure your API Token has 'Account:Read' permissions.";
            }
        } catch (e) {
            this.error = e.message;
        } finally {
            this.loading = false;
            this.render();
        }
    },

    async fetchTunnels(params = {}) {
        if (!this.selectedAccount) return;
        
        try {
            this.tunnels = await api.fetchTunnels(this.selectedAccount.id, this.apiToken, this.apiEmail, params);
        } catch (e) {
            console.error("Tunnel fetch error:", e);
        }
    },

    async createTunnel() {
        const nameInput = this.container.querySelector('#tunnel-name');
        if (!nameInput) return;
        
        this.newTunnelName = nameInput.value.trim();
        if (!this.selectedAccount || !this.newTunnelName) return;
        
        this.creatingTunnel = true;
        this.render();
        
        try {
            await api.createTunnel(this.selectedAccount.id, this.newTunnelName, this.apiToken, this.apiEmail);
            await this.fetchTunnels();
            this.showCreateTunnel = false;
            this.newTunnelName = '';
        } catch (e) {
            this.error = e.message;
        } finally {
            this.creatingTunnel = false;
            this.render();
        }
    },

    async updateTunnel() {
        if (!this.editingTunnelId || !this.selectedAccount) return;

        const nameInput = this.container.querySelector(`#edit-tunnel-name-${this.editingTunnelId}`);
        if (!nameInput) return;

        const newName = nameInput.value.trim();
        if (!newName) return;

        this.editTunnelName = newName;
        this.savingEdit = true;
        this.render();
        
        try {
            await api.updateTunnel(this.selectedAccount.id, this.editingTunnelId, newName, this.apiToken, this.apiEmail);
            await this.fetchTunnels();
            this.editingTunnelId = null;
            this.editTunnelName = '';
        } catch (e) {
            this.error = e.message;
        } finally {
            this.savingEdit = false;
            this.render();
        }
    },
    
    async deleteTunnel(tunnelId) {
        if (!confirm('Are you sure you want to delete this tunnel? This cannot be undone.')) return;
        
        try {
            await api.deleteTunnel(this.selectedAccount.id, tunnelId, this.apiToken, this.apiEmail);
            await this.fetchTunnels();
            this.render();
        } catch (e) {
            this.error = e.message;
            this.render();
        }
    },

    async showTunnelDetails(tunnelId) {
        if (this.detailsTunnelId === tunnelId) {
            this.detailsTunnelId = null;
            this.activeTunnelToken = null;
            this.activeTunnelConfig = null;
            this.activeTunnelConnections = [];
            this.render();
            return;
        }

        this.detailsTunnelId = tunnelId;
        this.loadingDetails = true;
        this.render();

        try {
            const [token, connections, config] = await Promise.all([
                api.getTunnelToken(this.selectedAccount.id, tunnelId, this.apiToken, this.apiEmail),
                api.getTunnelConnections(this.selectedAccount.id, tunnelId, this.apiToken, this.apiEmail),
                api.getTunnelConfiguration(this.selectedAccount.id, tunnelId, this.apiToken, this.apiEmail).catch(() => null)
            ]);

            this.activeTunnelToken = token;
            this.activeTunnelConnections = connections;
            this.activeTunnelConfig = config;
        } catch (e) {
            this.error = "Failed to load details: " + e.message;
        } finally {
            this.loadingDetails = false;
            this.render();
        }
    },

    toggleCreateTunnel() {
        this.showCreateTunnel = !this.showCreateTunnel;
        if (this.showCreateTunnel) {
            this.cancelEditing();
        }
        this.render();
    },

    startEditing(tunnelItem) {
        this.editingTunnelId = tunnelItem.id;
        this.editTunnelName = tunnelItem.name;
        this.showCreateTunnel = false;
        this.render();
    },

    cancelEditing() {
        this.editingTunnelId = null;
        this.editTunnelName = '';
        this.render();
    },

    render() {
        if (!this.container) return;
        
        if (!this.apiToken) {
            this.container.innerHTML = `<div class="auth-placeholder">Please configure authentication first</div>`;
            return;
        }

        let content = `
            <div class="tunnel-layout animate-in">
                <!-- Header / Account Info -->
                <div class="holo-card header-card box-glow">
                    <div class="card-header">
                        <h3 class="panel-section-title mb-0">Zero Trust Tunnels</h3>
                        <div class="account-badge">
                            Account: ${this.selectedAccount ? this.selectedAccount.name : 'Loading...'}
                        </div>
                    </div>
                </div>
                
                ${this.error ? `
                    <div class="error-message">
                        <strong>ERROR:</strong> ${this.error}
                    </div>
                ` : ''}

                <!-- Tunnel List -->
                <div class="holo-card tunnel-list-card">
                    <div class="card-header mb-6">
                        <h4 class="panel-section-title text-sm mb-0">Active Tunnels</h4>
                        <button id="toggle-create-tunnel-btn" class="holo-btn small">
                            ${this.showCreateTunnel ? 'Cancel' : '+ Create Tunnel'}
                        </button>
                    </div>

                    ${this.showCreateTunnel ? `
                        <div class="create-tunnel-form animate-in fade-in">
                            <div class="create-form-layout">
                                <div class="flex-1">
                                    <label class="panel-label">Tunnel Name</label>
                                    <input id="tunnel-name" type="text" class="holo-input w-full" placeholder="my-tunnel" value="${this.newTunnelName}">
                                </div>
                                <button id="save-tunnel-btn" class="holo-btn" ${this.creatingTunnel ? 'disabled' : ''}>
                                    ${this.creatingTunnel ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <div class="tunnel-grid">
                        ${this.tunnels.map(tunnel => {
                            const isEditing = this.editingTunnelId === tunnel.id;
                            
                            if (isEditing) {
                                return `
                                    <div class="tunnel-card edit-mode box-glow group clip-corner relative">
                                        <div class="edit-tunnel-form">
                                            <label class="edit-label">Edit Name</label>
                                            <input id="edit-tunnel-name-${tunnel.id}" type="text" class="holo-input w-full text-sm" value="${this.editTunnelName}" placeholder="Tunnel Name">
                                            
                                            <div class="edit-actions">
                                                <button class="cancel-edit-btn holo-btn-secondary small" data-tunnel-id="${tunnel.id}">
                                                    Cancel
                                                </button>
                                                <button class="save-edit-btn holo-btn small" data-tunnel-id="${tunnel.id}" ${this.savingEdit ? 'disabled' : ''}>
                                                    ${this.savingEdit ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }
                            
                            return `
                                <div class="tunnel-card group clip-corner relative">
                                    <div class="tunnel-header">
                                        <div class="tunnel-name">${tunnel.name}</div>
                                        <span class="status-dot ${tunnel.status === 'healthy' ? 'active' : 'suspended'}"></span>
                                    </div>
                                    <div class="tunnel-id" title="${tunnel.id}">
                                        ${tunnel.id}
                                    </div>
                                    
                                    ${this.detailsTunnelId === tunnel.id ? `
                                        <div class="tunnel-details-panel animate-in fade-in">
                                            ${this.loadingDetails ? 'Loading details...' : `
                                                <div class="detail-section">
                                                    <div class="detail-label">Tunnel Token:</div>
                                                    <div class="token-box">
                                                        ${this.activeTunnelToken || 'N/A'}
                                                    </div>
                                                </div>
                                                <div class="detail-section">
                                                     <div class="detail-label">Connections (${this.activeTunnelConnections.length}):</div>
                                                     ${this.activeTunnelConnections.length > 0 ? 
                                                         this.activeTunnelConnections.map(c => `
                                                             <div class="connection-row">
                                                                 <span>${c.colo_name || 'Unknown'}</span>
                                                                 <span>${c.origin_ip}</span>
                                                             </div>
                                                         `).join('') 
                                                         : '<div class="empty-text">No active connections</div>'}
                                                 </div>
                                                 
                                                 <div class="detail-section config-section">
                                                     <div class="config-header">
                                                         <div class="detail-label">Configuration (JSON):</div>
                                                         <button class="save-config-btn holo-btn extra-small" data-tunnel-id="${tunnel.id}">Save Config</button>
                                                     </div>
                                                     <textarea id="config-editor-${tunnel.id}" class="config-editor" spellcheck="false">${this.activeTunnelConfig ? JSON.stringify(this.activeTunnelConfig, null, 2) : '{\n  "ingress": [\n    {\n      "hostname": "example.com",\n      "service": "http://localhost:8080"\n    },\n    {\n      "service": "http_status:404"\n    }\n  ]\n}'}</textarea>
                                                 </div>
                                             `}
                                        </div>
                                    ` : ''}

                                    <div class="tunnel-footer">
                                        <span class="tunnel-status-text">${tunnel.status || 'Unknown'}</span>
                                        <div class="tunnel-actions">
                                            <button class="manage-tunnel-btn action-link" data-tunnel-id="${tunnel.id}">
                                                ${this.detailsTunnelId === tunnel.id ? 'Close' : 'Manage'}
                                            </button>
                                            <button class="edit-tunnel-btn action-link" data-tunnel-id="${tunnel.id}">
                                                Edit
                                            </button>
                                            <button class="delete-tunnel-btn action-link-danger" data-tunnel-id="${tunnel.id}">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${this.tunnels.length === 0 && !this.loading ? '<div class="empty-message col-span-full">No tunnels found</div>' : ''}
                        ${this.loading ? '<div class="loading-message col-span-full">Loading tunnels...</div>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = content;
        this.addEventListeners();
    },

    addEventListeners() {
        const toggleBtn = this.container.querySelector('#toggle-create-tunnel-btn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleCreateTunnel());
        
        const saveBtn = this.container.querySelector('#save-tunnel-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.createTunnel());
        
        // Delete buttons
        this.container.querySelectorAll('.delete-tunnel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tunnelId = e.currentTarget.dataset.tunnelId;
                this.deleteTunnel(tunnelId);
            });
        });
        
        // Edit buttons
        this.container.querySelectorAll('.edit-tunnel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tunnelId = e.currentTarget.dataset.tunnelId;
                const tunnelItem = this.tunnels.find(t => t.id === tunnelId);
                if (tunnelItem) this.startEditing(tunnelItem);
            });
        });

        // Cancel Edit buttons
        this.container.querySelectorAll('.cancel-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.cancelEditing());
        });

        // Save Edit buttons
        this.container.querySelectorAll('.save-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.updateTunnel());
        });

        // Manage buttons
        this.container.querySelectorAll('.manage-tunnel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tunnelId = e.currentTarget.dataset.tunnelId;
                this.showTunnelDetails(tunnelId);
            });
        });

        // Save Config buttons
        this.container.querySelectorAll('.save-config-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tunnelId = e.currentTarget.dataset.tunnelId;
                const textarea = this.container.querySelector(`#config-editor-${tunnelId}`);
                if (!textarea) return;

                try {
                    const config = JSON.parse(textarea.value);
                    btn.disabled = true;
                    btn.textContent = 'Saving...';
                    
                    await api.updateTunnelConfiguration(this.selectedAccount.id, tunnelId, config, this.apiToken, this.apiEmail);
                    
                    btn.textContent = 'Saved!';
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.textContent = 'Save Config';
                    }, 2000);
                } catch (err) {
                    alert('Invalid JSON or Update Failed: ' + err.message);
                    btn.disabled = false;
                    btn.textContent = 'Save Config';
                }
            });
        });
    }
};
