export class DnsTab {
    constructor(apiToken, apiEmail) {
        this.apiToken = apiToken;
        this.apiEmail = apiEmail;
        this.apiUrl = 'https://api.cloudflare.com/client/v4';
        
        this.state = {
            loading: false,
            error: null,
            zones: [],
            selectedZone: null,
            records: [],
            selectedRecord: null, // If null but isEditing=true, implies "New Record"
            isEditing: false,
            search: ''
        };
    }

    updateCredentials(token, email) {
        this.apiToken = token;
        this.apiEmail = email;
        this.state = { ...this.state, zones: [], selectedZone: null, records: [], selectedRecord: null, error: null };
        if (this.container) this.renderUI();
        if (token) this.fetchZones();
    }

    render(container) {
        this.container = container;
        if (this.apiToken && this.state.zones.length === 0) {
            this.fetchZones();
        }
        this.renderUI();
    }

    renderUI() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const listColumn = this.container;
        this.renderZoneListColumn(listColumn);

        // Cleanup existing next columns
        let next = listColumn.nextElementSibling;
        while(next) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
        }

        if (this.state.selectedZone) {
            const recordsColumn = this.createColumn(listColumn.parentElement);
            this.renderRecordsColumn(recordsColumn);

            if (this.state.isEditing || this.state.selectedRecord) {
                const editColumn = this.createColumn(listColumn.parentElement);
                this.renderEditRecordColumn(editColumn);
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

    renderZoneListColumn(col) {
        const { loading, error, zones, selectedZone, search } = this.state;
        
        const filteredZones = zones.filter(z => z.name.toLowerCase().includes(search.toLowerCase()));

        col.innerHTML = `
            <div class="column-header">
                <span>DNS Zones</span>
                ${loading ? '<span style="font-size:0.8em; color:#888;">Loading...</span>' : ''}
            </div>
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <input type="text" id="zone-search" placeholder="Search..." value="${search}" 
                    style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
            </div>
            <div class="column-content">
                ${error ? `<div style="padding: 10px; color: #c62828;">${error}</div>` : ''}
                
                <div class="zone-list">
                    ${filteredZones.map(z => `
                        <div class="list-item ${selectedZone && selectedZone.id === z.id ? 'active' : ''}" data-id="${z.id}">
                            <div style="font-weight: 500;">${z.name}</div>
                            <div style="font-size: 0.8em; opacity: 0.7;">${z.status}</div>
                        </div>
                    `).join('')}
                    ${zones.length === 0 && !loading ? '<div style="padding: 15px; color: #888;">No zones found.</div>' : ''}
                </div>
            </div>
        `;

        const searchInput = col.querySelector('#zone-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.search = e.target.value;
                this.renderUI();
                // Refocus
                const newInp = this.container.querySelector('#zone-search');
                newInp.focus();
                newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
            });
        }

        col.querySelectorAll('.list-item').forEach(el => {
            el.addEventListener('click', () => this.selectZone(el.dataset.id));
        });
    }

    renderRecordsColumn(col) {
        const { selectedZone, records, selectedRecord, loading } = this.state;
        
        col.innerHTML = `
            <div class="column-header">
                <span>Records: ${selectedZone.name}</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button id="add-record-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer;">+ New</button>
                    <button id="close-records-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #ddd; border-radius: 3px; margin-left: 5px;">✕</button>
                </div>
            </div>
            <div class="column-content">
                ${loading ? '<div style="padding: 10px; color: #0066cc;">Loading records...</div>' : ''}
                
                ${records.map(r => `
                    <div class="list-item ${selectedRecord && selectedRecord.id === r.id ? 'active' : ''}" data-id="${r.id}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600; font-size: 0.9em; min-width: 40px;">${r.type}</span>
                            <span style="flex: 1; margin: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.name}</span>
                            ${r.proxied ? '<span style="font-size: 0.8em; color: #f6821f;">☁</span>' : '<span style="font-size: 0.8em; color: #888;">☁</span>'}
                        </div>
                        <div style="font-size: 0.8em; opacity: 0.7; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${r.content}
                        </div>
                    </div>
                `).join('')}
                
                ${records.length === 0 && !loading ? '<div style="padding: 20px; color: #888; text-align: center;">No records found.</div>' : ''}
            </div>
        `;

        col.querySelector('#add-record-btn').addEventListener('click', () => {
            this.state.selectedRecord = null;
            this.state.isEditing = true;
            this.renderUI();
        });

        col.querySelector('#close-records-btn').addEventListener('click', () => {
            this.state.selectedZone = null;
            this.state.records = [];
            this.state.selectedRecord = null;
            this.state.isEditing = false;
            this.renderUI();
        });

        col.querySelectorAll('.list-item').forEach(el => {
            el.addEventListener('click', () => {
                const r = records.find(rec => rec.id === el.dataset.id);
                this.state.selectedRecord = r;
                this.state.isEditing = true; // Viewing implies ability to edit
                this.renderUI();
            });
        });
    }

    renderEditRecordColumn(col) {
        const { selectedRecord, selectedZone, loading } = this.state;
        const isNew = !selectedRecord;
        
        // Defaults
        const data = selectedRecord || {
            type: 'A',
            name: '',
            content: '',
            ttl: 1, // Auto
            proxied: true,
            priority: 10
        };

        // If editing existing record, name might be full domain "sub.domain.com", 
        // we might want to show just "sub" or full? Cloudflare API accepts full or relative usually, 
        // but displaying full is safer.

        col.innerHTML = `
            <div class="column-header">
                <span>${isNew ? 'New Record' : 'Edit Record'}</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                    ${!isNew ? `<button id="delete-record-btn" style="color: #c62828; background: none; border: none; cursor: pointer; font-size: 11px;">Delete</button>` : ''}
                    <button id="close-edit-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #ddd; border-radius: 3px; margin-left: 5px;">✕</button>
                </div>
            </div>
            <div class="column-content" style="padding: 20px;">
                <form id="record-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #666;">Type</label>
                        <select id="rec-type" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                            ${['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV'].map(t => 
                                `<option value="${t}" ${data.type === t ? 'selected' : ''}>${t}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #666;">Name (e.g. example.com)</label>
                        <input type="text" id="rec-name" value="${data.name}" 
                            style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #666;">Content (IPv4, target, etc.)</label>
                        <textarea id="rec-content" rows="3"
                            style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; box-sizing: border-box;">${data.content}</textarea>
                    </div>

                    <div id="priority-container" style="margin-bottom: 15px; display: ${data.type === 'MX' || data.type === 'SRV' ? 'block' : 'none'};">
                        <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #666;">Priority</label>
                        <input type="number" id="rec-priority" value="${data.priority || 10}" 
                            style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="rec-proxied" ${data.proxied ? 'checked' : ''} style="margin-right: 8px;">
                            <span>Proxied (CDN)</span>
                        </label>
                    </div>

                    <div style="margin-top: 20px;">
                        <button type="button" id="save-record-btn" 
                            style="width: 100%; padding: 8px; background: #007aff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            ${loading ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        const typeSelect = col.querySelector('#rec-type');
        const priorityContainer = col.querySelector('#priority-container');
        
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'MX' || e.target.value === 'SRV') {
                priorityContainer.style.display = 'block';
            } else {
                priorityContainer.style.display = 'none';
            }
        });

        col.querySelector('#close-edit-btn').addEventListener('click', () => {
            this.state.isEditing = false;
            this.state.selectedRecord = null;
            this.renderUI();
        });

        // Bind Save
        col.querySelector('#save-record-btn').addEventListener('click', async () => {
            const type = col.querySelector('#rec-type').value;
            const newData = {
                type: type,
                name: col.querySelector('#rec-name').value,
                content: col.querySelector('#rec-content').value,
                proxied: col.querySelector('#rec-proxied').checked,
                ttl: 1 // Keep auto for simplicity
            };

            if (type === 'MX' || type === 'SRV') {
                newData.priority = parseInt(col.querySelector('#rec-priority').value, 10) || 10;
            }
            
            if (isNew) {
                await this.createRecord(selectedZone.id, newData);
            } else {
                await this.updateRecord(selectedZone.id, selectedRecord.id, newData);
            }
        });

        // Bind Delete
        if (!isNew) {
            col.querySelector('#delete-record-btn').addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this record?')) {
                    await this.deleteRecord(selectedZone.id, selectedRecord.id);
                }
            });
        }
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

    async fetchZones() {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/zones?per_page=50`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.success) {
                this.state.zones = data.result;
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

    async selectZone(zoneId) {
        if (this.state.selectedZone && this.state.selectedZone.id === zoneId) return;
        this.state.selectedZone = this.state.zones.find(z => z.id === zoneId);
        this.state.records = [];
        this.state.selectedRecord = null;
        this.state.isEditing = false;
        this.renderUI();
        this.fetchRecords(zoneId);
    }

    async fetchRecords(zoneId) {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/zones/${zoneId}/dns_records?per_page=100`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.success) {
                this.state.records = data.result;
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

    async createRecord(zoneId, recordData) {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/zones/${zoneId}/dns_records`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(recordData)
            });
            const data = await res.json();
            if (data.success) {
                this.state.records.unshift(data.result);
                this.state.selectedRecord = data.result;
                this.state.isEditing = true; // Keep editing the new record
                alert('Record created successfully');
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            alert('Error creating record: ' + e.message);
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async updateRecord(zoneId, recordId, recordData) {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/zones/${zoneId}/dns_records/${recordId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(recordData)
            });
            const data = await res.json();
            if (data.success) {
                // Update local state
                const idx = this.state.records.findIndex(r => r.id === recordId);
                if (idx !== -1) this.state.records[idx] = data.result;
                this.state.selectedRecord = data.result;
                alert('Record updated successfully');
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            alert('Error updating record: ' + e.message);
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async deleteRecord(zoneId, recordId) {
        this.state.loading = true;
        this.renderUI();
        try {
            const res = await fetch(`${this.apiUrl}/zones/${zoneId}/dns_records/${recordId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const data = await res.json();
            if (data.success) {
                this.state.records = this.state.records.filter(r => r.id !== recordId);
                this.state.selectedRecord = null;
                this.state.isEditing = false;
                alert('Record deleted successfully');
            } else {
                throw new Error(data.errors[0]?.message);
            }
        } catch (e) {
            alert('Error deleting record: ' + e.message);
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }
}
