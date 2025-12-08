
export class DnsManager {
    constructor(container, apiToken, apiEmail) {
        this.container = container;
        this.apiToken = apiToken;
        this.apiEmail = apiEmail;
        this.apiUrl = 'https://api.cloudflare.com/client/v4';
        
        // State
        this.zones = [];
        this.selectedZone = null;
        this.dnsRecords = [];
        this.loading = false;
        this.error = null;
        this.purging = false;
        
        // Add Record State
        this.showAddRecord = false;
        this.newRecord = { type: 'A', name: '', content: '', ttl: 1, proxied: true };
        this.addingRecord = false;
        
        this.init();
    }

    init() {
        if (this.apiToken) {
            this.fetchZones();
        } else {
            this.render();
        }
    }
    
    updateCredentials(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        this.zones = [];
        this.selectedZone = null;
        this.dnsRecords = [];
        this.error = null;
        
        if (token) {
            this.fetchZones();
        } else {
            this.render();
        }
    }

    getHeaders() {
        if (this.apiEmail) {
            return {
                'X-Auth-Email': this.apiEmail,
                'X-Auth-Key': this.apiToken,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        };
    }

    async fetchZones() {
        this.loading = true;
        this.render();
        try {
            const response = await fetch(`${this.apiUrl}/zones`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch zones');
            const data = await response.json();
            this.zones = data.result || [];
        } catch (e) {
            this.error = e.message;
        } finally {
            this.loading = false;
            this.render();
        }
    }

    async selectZone(zoneId) {
        this.selectedZone = this.zones.find(z => z.id === zoneId);
        this.dnsRecords = [];
        this.loading = true;
        this.error = null;
        this.render();
        
        try {
            await this.fetchDnsRecords(zoneId);
        } catch (e) {
            this.error = e.message;
        } finally {
            this.loading = false;
            this.render();
        }
    }

    async fetchDnsRecords(zoneId) {
        const response = await fetch(`${this.apiUrl}/zones/${zoneId}/dns_records`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch DNS records');
        const data = await response.json();
        this.dnsRecords = data.result || [];
    }

    async addRecord() {
        if (!this.selectedZone) return;
        
        // Get values from inputs
        const typeSelect = this.container.querySelector('#record-type');
        const nameInput = this.container.querySelector('#record-name');
        const contentInput = this.container.querySelector('#record-content');
        const proxiedCheck = this.container.querySelector('#record-proxied');
        
        if (!typeSelect || !nameInput || !contentInput) return;
        
        this.newRecord = {
            type: typeSelect.value,
            name: nameInput.value,
            content: contentInput.value,
            ttl: 1, // Auto
            proxied: proxiedCheck ? proxiedCheck.checked : true
        };
        
        this.addingRecord = true;
        this.render(); // Show loading state on button
        
        try {
            const response = await fetch(`${this.apiUrl}/zones/${this.selectedZone.id}/dns_records`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(this.newRecord)
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.errors?.[0]?.message || 'Failed to create record');
            }
            
            // Refresh records
            await this.fetchDnsRecords(this.selectedZone.id);
            this.showAddRecord = false;
            // Reset form
            this.newRecord = { type: 'A', name: '', content: '', ttl: 1, proxied: true };
            
        } catch (e) {
            this.error = e.message;
        } finally {
            this.addingRecord = false;
            this.render();
        }
    }
    
    async deleteRecord(recordId) {
        if (!confirm('Are you sure you want to delete this record?')) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/zones/${this.selectedZone.id}/dns_records/${recordId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Failed to delete record');
            
            // Refresh records
            await this.fetchDnsRecords(this.selectedZone.id);
            this.render();
            
        } catch (e) {
            this.error = e.message;
            this.render();
        }
    }

    async purgeCache() {
        if (!this.selectedZone || this.purging) return;
        if (!confirm('Are you sure you want to purge EVERYTHING? This may affect performance temporarily.')) return;
        
        this.purging = true;
        this.render();
        
        try {
            const response = await fetch(`${this.apiUrl}/zones/${this.selectedZone.id}/purge_cache`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ purge_everything: true })
            });
            if (!response.ok) throw new Error('Failed to purge cache');
            alert('Cache Purged Successfully');
        } catch (e) {
            this.error = e.message;
        } finally {
            this.purging = false;
            this.render();
        }
    }

    toggleAddRecord() {
        this.showAddRecord = !this.showAddRecord;
        this.render();
    }

    render() {
        if (!this.container) return;
        
        if (!this.apiToken) {
            this.container.innerHTML = `<div class="auth-placeholder">Please configure authentication first</div>`;
            return;
        }

        let content = `
            <div class="dns-layout animate-in">
                <!-- Zone Selection -->
                <div class="holo-card zone-selection-card">
                    <h3 class="panel-section-title">Select Zone</h3>
                    ${this.loading && !this.selectedZone ? '<div class="loading-spinner">Loading Zones...</div>' : ''}
                    
                    <div class="zone-grid">
                        ${this.zones.map(zone => `
                            <button 
                                class="zone-card ${this.selectedZone?.id === zone.id ? 'active' : ''} group"
                                data-zone-id="${zone.id}"
                            >
                                <div class="zone-name">${zone.name}</div>
                                <div class="zone-plan">${zone.plan.name}</div>
                                <div class="zone-status">${zone.status}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                ${this.error ? `
                    <div class="error-message">
                        <strong>ERROR:</strong> ${this.error}
                    </div>
                ` : ''}

                <!-- Selected Zone Details -->
                ${this.selectedZone ? `
                    <div class="holo-card zone-details-card box-glow">
                        <div class="zone-header">
                            <div>
                                <h3 class="zone-title">${this.selectedZone.name}</h3>
                                <div class="zone-id">ID: ${this.selectedZone.id}</div>
                            </div>
                            <div class="header-actions">
                                <button id="purge-cache-btn" class="holo-btn-danger small" ${this.purging ? 'disabled' : ''}>
                                    ${this.purging ? 'Purging...' : 'Purge Cache'}
                                </button>
                                <button id="refresh-records-btn" class="holo-btn small">
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <!-- DNS Records -->
                        <div class="dns-records-section">
                            <div class="records-header">
                                <h4 class="panel-section-title">DNS Records</h4>
                                <button id="toggle-add-record-btn" class="holo-btn small">
                                    ${this.showAddRecord ? 'Cancel' : '+ Add Record'}
                                </button>
                            </div>

                            ${this.showAddRecord ? `
                                <div class="add-record-form animate-in fade-in">
                                    <div class="record-form-grid">
                                        <div class="field-type">
                                            <label class="panel-label">Type</label>
                                            <select id="record-type" class="holo-input w-full">
                                                <option value="A" ${this.newRecord.type === 'A' ? 'selected' : ''}>A</option>
                                                <option value="CNAME" ${this.newRecord.type === 'CNAME' ? 'selected' : ''}>CNAME</option>
                                                <option value="TXT" ${this.newRecord.type === 'TXT' ? 'selected' : ''}>TXT</option>
                                                <option value="AAAA" ${this.newRecord.type === 'AAAA' ? 'selected' : ''}>AAAA</option>
                                                <option value="MX" ${this.newRecord.type === 'MX' ? 'selected' : ''}>MX</option>
                                            </select>
                                        </div>
                                        <div class="field-name">
                                            <label class="panel-label">Name</label>
                                            <input id="record-name" type="text" class="holo-input w-full" placeholder="@ or subdomain" value="${this.newRecord.name}">
                                        </div>
                                        <div class="field-content">
                                            <label class="panel-label">Content</label>
                                            <input id="record-content" type="text" class="holo-input w-full" placeholder="1.2.3.4" value="${this.newRecord.content}">
                                        </div>
                                        <div class="field-proxy">
                                            <label class="proxy-checkbox-label">
                                                <input id="record-proxied" type="checkbox" class="accent-secondary" ${this.newRecord.proxied ? 'checked' : ''}>
                                                <span class="proxy-text">Proxy</span>
                                            </label>
                                        </div>
                                        <div class="field-action">
                                            <button id="save-record-btn" class="holo-btn w-full" ${this.addingRecord ? 'disabled' : ''}>
                                                ${this.addingRecord ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <div class="records-table-container">
                                <table class="records-table">
                                    <thead class="records-thead">
                                        <tr>
                                            <th class="p-3">Type</th>
                                            <th class="p-3">Name</th>
                                            <th class="p-3">Content</th>
                                            <th class="p-3">Proxy</th>
                                            <th class="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="records-tbody">
                                        ${this.dnsRecords.map(record => `
                                            <tr class="record-row">
                                                <td class="record-cell type-cell">${record.type}</td>
                                                <td class="record-cell name-cell">${record.name}</td>
                                                <td class="record-cell content-cell" title="${record.content}">${record.content}</td>
                                                <td class="record-cell proxy-cell">
                                                    ${record.proxied 
                                                        ? '<span class="text-orange">Proxied</span>' 
                                                        : '<span class="text-gray">DNS Only</span>'}
                                                </td>
                                                <td class="record-cell actions-cell">
                                                    <button class="delete-record-btn" data-record-id="${record.id}">Delete</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                        ${this.dnsRecords.length === 0 ? '<tr><td colspan="5" class="empty-message">No records found</td></tr>' : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.container.innerHTML = content;
        this.addEventListeners();
    }

    addEventListeners() {
        // Zone selection
        this.container.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const zoneId = e.currentTarget.dataset.zoneId;
                this.selectZone(zoneId);
            });
        });
        
        // Add Record Toggle
        const toggleBtn = this.container.querySelector('#toggle-add-record-btn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleAddRecord());
        
        // Save Record
        const saveBtn = this.container.querySelector('#save-record-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.addRecord());
        
        // Delete Record
        this.container.querySelectorAll('.delete-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.recordId;
                this.deleteRecord(recordId);
            });
        });
        
        // Purge Cache
        const purgeBtn = this.container.querySelector('#purge-cache-btn');
        if (purgeBtn) purgeBtn.addEventListener('click', () => this.purgeCache());
        
        // Refresh
        const refreshBtn = this.container.querySelector('#refresh-records-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => {
             if (this.selectedZone) this.selectZone(this.selectedZone.id);
        });
    }
}
