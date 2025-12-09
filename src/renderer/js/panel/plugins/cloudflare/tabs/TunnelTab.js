export class TunnelTab {
    constructor(apiToken, apiEmail) {
        this.apiToken = apiToken;
        this.apiEmail = apiEmail;
        this.apiUrl = 'https://api.cloudflare.com/client/v4';
        
        this.state = {
            loading: false,
            error: null,
            accounts: [],
            selectedAccount: null,
            tunnels: [],
            selectedTunnel: null,
            connections: [],
            config: null, // Stores the full config object
            isEditingConfig: false,
            isCreating: false
        };
    }

    updateCredentials(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        this.state = { ...this.state, accounts: [], tunnels: [], selectedTunnel: null, error: null, isCreating: false };
        if (this.container) this.renderUI();
        if (token) this.fetchAccounts();
    }

    render(container) {
        this.container = container; 
        if (this.apiToken && this.state.accounts.length === 0) {
            this.fetchAccounts();
        }
        this.renderUI();
    }

    renderUI() {
        if (!this.container) return;
        this.container.innerHTML = ''; 

        const listColumn = this.container;
        this.renderListColumn(listColumn);

        // Manage dynamic columns
        // 1. Detail Column (if tunnel selected)
        // 2. Edit Config Column (if editing)
        // 3. Create Tunnel Column (if creating)
        
        // Cleanup existing next columns
        let next = listColumn.nextElementSibling;
        while(next) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
        }

        if (this.state.isCreating) {
            const createColumn = this.createColumn(listColumn.parentElement);
            this.renderCreateColumn(createColumn);
        } else if (this.state.selectedTunnel) {
            const detailColumn = this.createColumn(listColumn.parentElement);
            this.renderDetailColumn(detailColumn);

            if (this.state.isEditingConfig) {
                const editColumn = this.createColumn(listColumn.parentElement);
                this.renderEditConfigColumn(editColumn);
            }
        }
        
        this.updateColumnVisibility();
    }

    updateColumnVisibility() {
        const container = this.container.parentElement;
        const columns = Array.from(container.children).filter(c => c.classList.contains('finder-column'));
        
        // Reset all to visible first
        columns.forEach(c => c.style.display = '');

        if (columns.length > 2) {
            // Hide the first one (List)
            columns[0].style.display = 'none';
        }
    }

    createColumn(parent) {
        const col = document.createElement('div');
        col.className = 'finder-column animate-in';
        parent.appendChild(col);
        return col;
    }

    renderListColumn(col) {
        const { loading, error, accounts, selectedAccount, tunnels, selectedTunnel } = this.state;
        
        col.innerHTML = `
            <div class="column-header">
                <span>Tunnels</span>
                ${loading ? '<span style="font-size:0.8em; color:#888;">Loading...</span>' : ''}
            </div>
            <div class="column-content">
                ${error ? `<div style="padding: 10px; color: #c62828;">${error}</div>` : ''}
                
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                    <select id="account-select" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Select Account</option>
                        ${accounts.map(acc => `
                            <option value="${acc.id}" ${selectedAccount === acc.id ? 'selected' : ''}>${acc.name}</option>
                        `).join('')}
                    </select>
                </div>

                ${selectedAccount ? `
                    <div class="tunnel-list">
                        ${tunnels.map(t => `
                            <div class="list-item ${selectedTunnel && selectedTunnel.id === t.id ? 'active' : ''}" data-id="${t.id}">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 500;">${t.name}</span>
                                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${t.status === 'healthy' ? '#4caf50' : '#f44336'};"></div>
                                </div>
                                <div style="font-size: 0.8em; opacity: 0.7; margin-top: 2px;">${t.id.substring(0, 8)}...</div>
                            </div>
                        `).join('')}
                        ${tunnels.length === 0 && !loading ? '<div style="padding: 15px; color: #888; font-style: italic;">No tunnels found.</div>' : ''}
                        
                        <div style="padding: 10px;">
                           <button id="create-tunnel-btn" style="width: 100%; padding: 6px; cursor: pointer;">+ Create Tunnel</button>
                        </div>
                    </div>
                ` : '<div style="padding: 20px; color: #888; text-align: center;">Please select an account.</div>'}
            </div>
        `;

        const select = col.querySelector('#account-select');
        if (select) {
            select.addEventListener('change', (e) => this.selectAccount(e.target.value));
        }

        col.querySelectorAll('.list-item').forEach(el => {
            el.addEventListener('click', () => this.selectTunnel(el.dataset.id));
        });
        
        const createBtn = col.querySelector('#create-tunnel-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.state.isCreating = true;
                this.state.selectedTunnel = null;
                this.renderUI();
            });
        }
    }

    renderCreateColumn(col) {
        const { loading } = this.state;
        
        col.innerHTML = `
            <div class="column-header">
                <span>Create Tunnel</span>
                <button id="close-create-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #ddd; border-radius: 3px;">✕</button>
            </div>
            <div class="column-content" style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #666;">Tunnel Name</label>
                    <input type="text" id="new-tunnel-name" placeholder="e.g. my-home-server" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <div style="margin-top: 5px; font-size: 0.75em; color: #888;">
                        A secure tunnel to your origin server.
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <button id="do-create-tunnel-btn" 
                        style="width: 100%; padding: 8px; background: #007aff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        ${loading ? 'Creating...' : 'Create Tunnel'}
                    </button>
                    <button id="cancel-create-btn" 
                        style="width: 100%; padding: 8px; margin-top: 10px; background: none; color: #666; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                        Cancel
                    </button>
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
        const { selectedTunnel, connections, config, loading } = this.state;
        if (!selectedTunnel) return;

        col.innerHTML = `
            <div class="column-header">
                <span>${selectedTunnel.name}</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button id="edit-config-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer;">Config</button>
                    <button id="delete-tunnel-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; color: #c62828; border: 1px solid #ffcdd2; background: #ffebee;">Delete</button>
                    <button id="close-detail-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #ddd; border-radius: 3px; margin-left: 5px;">✕</button>
                </div>
            </div>
            <div class="column-content" style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 1.2em;">Overview</h2>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 15px; font-size: 0.9em;">
                        <span style="color: #666;">Status:</span>
                        <span style="font-weight: 500; color: ${selectedTunnel.status === 'healthy' ? '#2e7d32' : '#c62828'};">${selectedTunnel.status}</span>
                        
                        <span style="color: #666;">ID:</span>
                        <span style="font-family: monospace;">${selectedTunnel.id}</span>
                        
                        <span style="color: #666;">Created:</span>
                        <span>${new Date(selectedTunnel.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <!-- Config Visualization -->
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 1em;">Ingress Rules</h3>
                    <div style="border: 1px solid #eee; border-radius: 6px; overflow: hidden; font-size: 0.85em;">
                        ${config && config.config && config.config.ingress ? `
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f5f5f5;">
                                    <tr>
                                        <th style="text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee;">Hostname</th>
                                        <th style="text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee;">Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${config.config.ingress.map(rule => `
                                        <tr style="border-bottom: 1px solid #f9f9f9;">
                                            <td style="padding: 6px 10px; color: #333;">${rule.hostname || '<em style="color:#888">* (Catch-all)</em>'}</td>
                                            <td style="padding: 6px 10px; font-family: monospace; color: #555;">${rule.service}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<div style="padding: 10px; color: #888;">No configuration loaded or local managed.</div>'}
                    </div>
                </div>

                <div style="margin-bottom: 10px; font-weight: 600; color: #444;">Active Connections</div>
                <div style="background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
                    ${connections.length > 0 ? connections.map(c => `
                        <div style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.85em;">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>${c.colo_name}</strong>
                                <span style="color: #666;">${c.origin_ip}</span>
                            </div>
                            <div style="font-family: monospace; color: #888; margin-top: 2px;">${c.id}</div>
                        </div>
                    `).join('') : '<div style="padding: 15px; color: #888; text-align: center;">No active connections</div>'}
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
    }

    renderEditConfigColumn(col) {
        const { config, loading } = this.state;
        
        col.innerHTML = `
            <div class="column-header">
                <span>Edit Configuration</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button id="save-config-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: #007aff; color: white; border: none; border-radius: 3px;">Save</button>
                    <button id="close-edit-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #ddd; border-radius: 3px; margin-left: 5px;">✕</button>
                </div>
            </div>
            <div class="column-content" style="padding: 0; display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 10px; background: #f5f5f5; border-bottom: 1px solid #ddd; font-size: 0.85em; color: #666;">
                    Edit the JSON configuration directly.
                </div>
                <textarea id="config-editor" style="
                    flex: 1; 
                    width: 100%; 
                    resize: none; 
                    border: none; 
                    padding: 10px; 
                    font-family: monospace; 
                    font-size: 12px; 
                    line-height: 1.5;
                    outline: none;
                ">${config ? JSON.stringify(config, null, 2) : '{}'}</textarea>
            </div>
        `;

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

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiEmail) {
            headers['X-Auth-Email'] = this.apiEmail;
            headers['X-Auth-Key'] = this.apiToken;
        } else {
            headers['Authorization'] = `Bearer ${this.apiToken}`;
        }
        return headers;
    }

    async fetchAccounts() {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/accounts`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.success) {
                this.state.accounts = data.result;
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            this.state.error = e.message;
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
        this.fetchTunnels(accountId);
    }

    async fetchTunnels(accountId) {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/accounts/${accountId}/cfd_tunnel?is_deleted=false`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.success) {
                this.state.tunnels = data.result;
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            this.state.error = e.message;
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async selectTunnel(tunnelId) {
        if (this.state.selectedTunnel && this.state.selectedTunnel.id === tunnelId) return;

        this.state.selectedTunnel = this.state.tunnels.find(t => t.id === tunnelId);
        this.state.isEditingConfig = false;
        this.state.config = null; // Reset config
        this.renderUI(); 
        
        // Fetch details in parallel
        this.fetchTunnelConnections(this.state.selectedAccount, tunnelId);
        this.fetchTunnelConfig(this.state.selectedAccount, tunnelId);
    }

    async fetchTunnelConnections(accountId, tunnelId) {
        // Silent update
        try {
            const res = await fetch(`${this.apiUrl}/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.success) {
                this.state.connections = data.result;
                this.renderUI(); // Re-render to show connections
            }
        } catch (e) {
            this.state.connections = [];
        }
    }

    async fetchTunnelConfig(accountId, tunnelId) {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.success) {
                this.state.config = data.result;
            } else {
                // If 404 or empty, it might be locally managed or have no config
                this.state.config = null;
            }
        } catch (e) {
            console.error('Failed to fetch config', e);
            this.state.config = null;
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async createTunnel(name) {
        const { selectedAccount } = this.state;
        if (!selectedAccount) return;

        this.state.loading = true;
        this.renderUI();

        // Generate 32-byte random secret, base64 encoded
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const tunnelSecret = btoa(String.fromCharCode.apply(null, randomBytes));

        try {
            const res = await fetch(`${this.apiUrl}/accounts/${selectedAccount}/cfd_tunnel`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    name: name,
                    tunnel_secret: tunnelSecret
                })
            });
            const data = await res.json();
            if (data.success) {
                const newTunnel = data.result;
                this.state.tunnels.unshift(newTunnel);
                this.state.isCreating = false;
                this.selectTunnel(newTunnel.id);
                alert(`Tunnel created successfully! \n\nToken: ${data.result.token || 'Hidden (check docs)'}\nSecret: ${tunnelSecret}`);
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            alert('Error creating tunnel: ' + e.message);
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async saveTunnelConfig(newConfig) {
        const { selectedAccount, selectedTunnel } = this.state;
        if (!selectedAccount || !selectedTunnel) return;

        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/accounts/${selectedAccount}/cfd_tunnel/${selectedTunnel.id}/configurations`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            if (data.success) {
                this.state.config = data.result;
                this.state.isEditingConfig = false; // Close editor on success
                alert('Configuration saved successfully!');
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            alert('Error saving config: ' + e.message);
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async deleteTunnel(tunnelId) {
        const { selectedAccount } = this.state;
        if (!selectedAccount) return;

        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/accounts/${selectedAccount}/cfd_tunnel/${tunnelId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const data = await res.json();
            if (data.success) {
                this.state.tunnels = this.state.tunnels.filter(t => t.id !== tunnelId);
                this.state.selectedTunnel = null;
                this.state.isEditingConfig = false;
                this.state.config = null;
                alert('Tunnel deleted successfully!');
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            alert('Error deleting tunnel: ' + e.message);
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }
}
