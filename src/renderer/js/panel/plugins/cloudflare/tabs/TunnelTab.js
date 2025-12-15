import { cfFetch } from '../utils.js';
import { UI } from '../../../ui/index.js';

export class TunnelTab {
    constructor(creds) {
        this.token = creds.token;
        this.email = creds.email;
        
        this.state = {
            loading: false,
            accounts: [],
            selectedAccount: null,
            tunnels: [],
            selectedTunnel: null,
            connections: [],
            config: null,
            isCreating: false,
            isEditingConfig: false,
            error: null
        };
    }

    updateCredentials({ token, email }) {
        this.token = token;
        this.email = email;
        this.state = {
            loading: false,
            accounts: [],
            selectedAccount: null,
            tunnels: [],
            selectedTunnel: null,
            connections: [],
            config: null,
            isCreating: false,
            isEditingConfig: false,
            error: null
        };
        if (this.container) {
            this.fetchAccounts();
        }
    }

    render(container) {
        this.container = container;
        this.renderUI();
        if (this.state.accounts.length === 0 && !this.state.loading) {
            this.fetchAccounts();
        }
    }

    renderUI() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        this.renderAccountColumn(this.container);

        UI.Layout.clearSiblings(this.container);
        const parent = this.container.parentElement;
        if (!parent) return;

        if (this.state.selectedAccount) {
            const tunnelCol = UI.Layout.createColumn(parent);
            this.renderTunnelListColumn(tunnelCol);

            if (this.state.isCreating) {
                const createCol = UI.Layout.createColumn(parent);
                this.renderCreateColumn(createCol);
            } else if (this.state.selectedTunnel) {
                const detailCol = UI.Layout.createColumn(parent);
                this.renderDetailColumn(detailCol);

                if (this.state.isEditingConfig) {
                    const editCol = UI.Layout.createColumn(parent);
                    this.renderEditConfigColumn(editCol);
                }
            }
        }
        UI.Layout.updateVisibility(parent);
    }

    renderAccountColumn(col) {
        const { accounts = [], selectedAccount, loading, error } = this.state;
        
        col.innerHTML = `
            ${UI.Header({ title: 'Accounts' })}
            <div class="ui-content">
                ${loading && !accounts.length ? UI.Loading({ message: 'Loading...' }) : ''}
                ${error ? UI.Error({ message: error }) : ''}
                ${(accounts || []).map(acc => UI.ListItem({
                    id: acc.id,
                    title: acc.name,
                    selected: selectedAccount === acc.id
                })).join('')}
            </div>
        `;

        col.querySelector('.ui-content').addEventListener('click', e => {
            const item = e.target.closest('.ui-list-item');
            if (item) this.selectAccount(item.dataset.id);
        });
    }

    renderTunnelListColumn(col) {
        const { tunnels = [], selectedTunnel, loading } = this.state;
        
        col.innerHTML = `
            ${UI.Header({ title: 'Tunnels' })}
            <div class="ui-content">
                ${loading ? UI.Loading({ message: 'Loading...' }) : ''}
                ${(tunnels || []).length === 0 && !loading ? '<div class="ui-empty">No tunnels found.</div>' : ''}
                ${(tunnels || []).map(t => UI.ListItem({
                    id: t.id,
                    title: t.name,
                    subtitle: `ID: ${t.id.split('-')[0]}...`,
                    badge: UI.Badge({ label: t.status, variant: t.status === 'healthy' ? 'success' : 'warning' }),
                    selected: selectedTunnel && selectedTunnel.id === t.id
                })).join('')}
            </div>
            <div style="padding: 10px; border-top: 1px solid #e1e4e8;">
               ${UI.Button({ id: 'create-tunnel-btn', label: '+ Create Tunnel' })}
            </div>
        `;

        col.querySelector('.ui-content').addEventListener('click', e => {
            const item = e.target.closest('.ui-list-item');
            if (item) this.selectTunnel(item.dataset.id);
        });
        
        col.querySelector('#create-tunnel-btn')?.addEventListener('click', () => {
            this.state.isCreating = true;
            this.state.selectedTunnel = null;
            this.renderUI();
        });
    }

    renderCreateColumn(col) {
        const { loading } = this.state;
        
        col.innerHTML = `
            ${UI.Header({ title: 'Create Tunnel', actions: UI.CloseButton({ id: 'close-create-btn' }) })}
            <div class="ui-content padded">
                ${UI.FormGroup({
                    label: 'Tunnel Name',
                    control: UI.Input({ id: 'new-tunnel-name', placeholder: 'e.g. my-home-server' }) + 
                             '<div class="ui-text-small ui-mt-2">A secure tunnel to your origin server.</div>'
                })}

                <div class="ui-mt-2">
                    ${UI.Button({ id: 'do-create-tunnel-btn', label: loading ? 'Creating...' : 'Create Tunnel', variant: 'primary' })}
                    ${UI.Button({ id: 'cancel-create-btn', label: 'Cancel' })}
                </div>
            </div>
        `;

        col.querySelector('#cancel-create-btn').addEventListener('click', () => {
            this.state.isCreating = false;
            this.renderUI();
        });

        col.querySelector('#close-create-btn').addEventListener('click', () => {
            this.state.isCreating = false;
            this.renderUI();
        });

        col.querySelector('#do-create-tunnel-btn').addEventListener('click', () => {
            const name = col.querySelector('#new-tunnel-name').value.trim();
            if (name) {
                this.createTunnel(name);
            } else {
                alert('Please enter a tunnel name');
            }
        });
    }

    renderDetailColumn(col) {
        const { selectedTunnel, connections, config } = this.state;
        if (!selectedTunnel) return;

        col.innerHTML = `
            ${UI.Header({
                title: selectedTunnel.name,
                actions: `
                    ${UI.Button({ id: 'edit-config-btn', label: 'Config', size: 'small', style: 'width:auto;margin:0' })}
                    ${UI.Button({ id: 'delete-tunnel-btn', label: 'Delete', size: 'small', variant: 'danger', style: 'width:auto;margin:0' })}
                    ${UI.CloseButton({ id: 'close-detail-btn' })}
                `
            })}
            <div class="ui-content padded">
                <div class="ui-mb-2">
                    <h2 class="ui-label" style="font-size:14px;margin-bottom:10px">Overview</h2>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 15px; font-size: 13px;">
                        <span style="color: #666;">Status:</span>
                        ${UI.Badge({ label: selectedTunnel.status, variant: selectedTunnel.status === 'healthy' ? 'success' : 'warning' })}
                        
                        <span style="color: #666;">ID:</span>
                        <span style="font-family: monospace;">${selectedTunnel.id}</span>
                        
                        <span style="color: #666;">Created:</span>
                        <span>${new Date(selectedTunnel.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div class="ui-mb-2">
                    <h3 class="ui-label" style="font-size:13px;margin-bottom:10px">Ingress Rules</h3>
                    <div style="border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; font-size: 12px;">
                        ${config && config.config && config.config.ingress ? `
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f6f8fa;">
                                    <tr>
                                        <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e1e4e8;">Hostname</th>
                                        <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e1e4e8;">Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${config.config.ingress.map(rule => `
                                        <tr style="border-bottom: 1px solid #eaecef;">
                                            <td style="padding: 8px 12px; color: #333;">${rule.hostname || '<em style="color:#888">*</em>'}</td>
                                            <td style="padding: 8px 12px; font-family: monospace; color: #555;">${rule.service}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<div class="ui-empty" style="padding:10px">No configuration loaded or local managed.</div>'}
                    </div>
                </div>

                <div class="ui-label" style="font-size:13px;margin-bottom:10px">Active Connections</div>
                <div style="background: #fff; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden;">
                    ${connections.length > 0 ? connections.map(c => `
                        <div style="padding: 10px; border-bottom: 1px solid #eaecef; font-size: 12px;">
                            <div class="ui-flex-between">
                                <strong>${c.colo_name}</strong>
                                <span style="color: #666;">${c.origin_ip}</span>
                            </div>
                            <div style="font-family: monospace; color: #888; margin-top: 2px;">${c.id}</div>
                        </div>
                    `).join('') : '<div class="ui-empty" style="padding:15px">No active connections</div>'}
                </div>
            </div>
        `;

        col.querySelector('#edit-config-btn').addEventListener('click', () => {
            this.state.isEditingConfig = !this.state.isEditingConfig;
            this.renderUI();
        });

        col.querySelector('#delete-tunnel-btn').addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete tunnel "${selectedTunnel.name}"?\nThis action cannot be undone.`)) {
                this.deleteTunnel(selectedTunnel.id);
            }
        });
        
        col.querySelector('#close-detail-btn').addEventListener('click', () => {
            this.state.selectedTunnel = null;
            this.state.isEditingConfig = false;
            this.renderUI();
        });
    }

    renderEditConfigColumn(col) {
        const { config } = this.state;
        
        col.innerHTML = `
            ${UI.Header({
                title: 'Edit Configuration',
                actions: `
                    ${UI.Button({ id: 'save-config-btn', label: 'Save', variant: 'primary', size: 'small', style: 'width:auto;margin:0' })}
                    ${UI.CloseButton({ id: 'close-edit-btn' })}
                `
            })}
            <div class="ui-content" style="padding: 0; display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 10px; background: #f6f8fa; border-bottom: 1px solid #e1e4e8; font-size: 12px; color: #586069;">
                    Edit the JSON configuration directly.
                </div>
                ${UI.Textarea({ id: 'config-editor', value: config ? JSON.stringify(config, null, 2) : '{}' })}
            </div>
        `;
        
        const textarea = col.querySelector('#config-editor');
        textarea.style.cssText = "flex: 1; border: none; border-radius: 0; padding: 10px; font-family: monospace;";

        col.querySelector('#save-config-btn').addEventListener('click', () => {
            const editor = col.querySelector('#config-editor');
            try {
                const newConfig = JSON.parse(editor.value);
                this.saveTunnelConfig(newConfig);
            } catch (e) {
                alert('Invalid JSON: ' + e.message);
            }
        });

        col.querySelector('#close-edit-btn').addEventListener('click', () => {
            this.state.isEditingConfig = false;
            this.renderUI();
        });
    }

    async fetchAccounts() {
        this.state.loading = true; this.state.error = null; this.renderUI();
        try {
            const res = await cfFetch(this.token, this.email, '/accounts');
            this.state.accounts = Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('Fetch accounts error:', e);
            this.state.error = e.message || 'Failed to fetch accounts';
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async selectAccount(accountId) {
        if (!accountId) {
            this.state.selectedAccount = null;
            this.state.tunnels = [];
            this.state.selectedTunnel = null;
            this.state.isEditingConfig = false;
            this.renderUI();
            return;
        }
        this.state.selectedAccount = accountId;
        this.state.selectedTunnel = null;
        this.state.isEditingConfig = false;
        
        this.state.loading = true; this.state.error = null; this.renderUI();
        try {
            const res = await cfFetch(this.token, this.email, `/accounts/${accountId}/cfd_tunnel?is_deleted=false`);
            this.state.tunnels = Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('Fetch tunnels error:', e);
            this.state.error = e.message || 'Failed to fetch tunnels';
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async selectTunnel(tunnelId) {
        if (this.state.selectedTunnel?.id === tunnelId) return;
        this.state.selectedTunnel = this.state.tunnels.find(t => t.id === tunnelId);
        this.state.isEditingConfig = false;
        this.state.config = null;
        this.renderUI();

        this.fetchTunnelConnections(this.state.selectedAccount, tunnelId);
        this.fetchTunnelConfig(this.state.selectedAccount, tunnelId);
    }

    async fetchTunnelConnections(accountId, tunnelId) {
        try {
            this.state.connections = await cfFetch(this.token, this.email, `/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`);
            this.renderUI();
        } catch (e) {
            this.state.connections = [];
        }
    }

    async fetchTunnelConfig(accountId, tunnelId) {
        this.state.loading = true; this.renderUI();
        try {
            this.state.config = await cfFetch(this.token, this.email, `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`);
        } catch (e) { this.state.config = null; }
        this.state.loading = false; this.renderUI();
    }

    async createTunnel(name) {
        const { selectedAccount } = this.state;
        if (!selectedAccount) return;
        
        this.state.loading = true; this.renderUI();
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const tunnelSecret = btoa(String.fromCharCode.apply(null, randomBytes));

        try {
            const newTunnel = await cfFetch(this.token, this.email, `/accounts/${selectedAccount}/cfd_tunnel`, {
                method: 'POST',
                body: JSON.stringify({ name, tunnel_secret: tunnelSecret })
            });
            this.state.tunnels.unshift(newTunnel);
            this.state.isCreating = false;
            this.selectTunnel(newTunnel.id);
            alert(`Tunnel created successfully! \n\nToken: ${newTunnel.token || 'Hidden'}\nSecret: ${tunnelSecret}`);
        } catch (e) { alert('Error: ' + e.message); }
        this.state.loading = false; this.renderUI();
    }

    async saveTunnelConfig(newConfig) {
        const { selectedAccount, selectedTunnel } = this.state;
        if (!selectedAccount || !selectedTunnel) return;

        this.state.loading = true; this.renderUI();
        try {
            this.state.config = await cfFetch(this.token, this.email, `/accounts/${selectedAccount}/cfd_tunnel/${selectedTunnel.id}/configurations`, {
                method: 'PUT',
                body: JSON.stringify(newConfig)
            });
            this.state.isEditingConfig = false;
            alert('Saved successfully!');
        } catch (e) { alert('Error: ' + e.message); }
        this.state.loading = false; this.renderUI();
    }

    async deleteTunnel(tunnelId) {
        const { selectedAccount } = this.state;
        if (!selectedAccount) return;

        this.state.loading = true; this.renderUI();
        try {
            await cfFetch(this.token, this.email, `/accounts/${selectedAccount}/cfd_tunnel/${tunnelId}`, { method: 'DELETE' });
            this.state.tunnels = this.state.tunnels.filter(t => t.id !== tunnelId);
            this.state.selectedTunnel = null;
            this.state.isEditingConfig = false;
            this.state.config = null;
            alert('Deleted successfully!');
        } catch (e) { alert('Error: ' + e.message); }
        this.state.loading = false; this.renderUI();
    }
}
