import { cfFetch } from '../utils.js';
import { UI } from '../../../ui/index.js';

export class DnsTab {
    constructor({ token, email }) {
        this.token = token;
        this.email = email;
        this.state = {
            loading: false, error: null, zones: [], selectedZone: null,
            records: [], selectedRecord: null, isEditing: false, search: ''
        };
    }

    updateCredentials({ token, email }) {
        this.token = token; this.email = email;
        this.state = { ...this.state, zones: [], selectedZone: null, records: [], selectedRecord: null, error: null };
        if (this.container) this.render();
    }

    render(container) {
        this.container = container;
        if (this.token && !this.state.zones.length) this.fetchZones();
        this.renderUI();
    }

    renderUI() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.renderZoneList(this.container);
        
        UI.Layout.clearSiblings(this.container);
        const parent = this.container.parentElement;
        if (!parent) return;

        if (this.state.selectedZone) {
            const recordsCol = UI.Layout.createColumn(parent);
            this.renderRecords(recordsCol);
            
            if (this.state.isEditing || this.state.selectedRecord) {
                const editCol = UI.Layout.createColumn(parent);
                this.renderEditRecord(editCol);
            }
        }
        UI.Layout.updateVisibility(parent);
    }

    renderZoneList(col) {
        const { zones = [], search, loading, error, selectedZone } = this.state;
        const filtered = (zones || []).filter(z => z.name.toLowerCase().includes(search.toLowerCase()));

        col.innerHTML = `
            ${UI.Header({ 
                title: 'DNS Zones', 
                actions: loading ? UI.Loading({ message: '' }) : '' 
            })}
            <div style="padding:10px;border-bottom:1px solid #e1e4e8">
                ${UI.Input({ id: 'z-search', value: search, placeholder: 'Search zones...' })}
            </div>
            ${UI.List({
                items: filtered.map(z => UI.ListItem({
                    id: z.id,
                    title: z.name,
                    subtitle: UI.Badge({ label: z.status, variant: z.status === 'active' ? 'success' : 'default' }),
                    selected: selectedZone?.id === z.id
                })),
                emptyMessage: loading ? 'Loading...' : 'No zones found'
            })}
            ${error ? UI.Error({ message: error }) : ''}
        `;

        col.querySelector('#z-search').addEventListener('input', e => {
            this.state.search = e.target.value;
            this.renderUI();
            this.container.querySelector('#z-search').focus();
        });

        col.querySelector('.ui-content').addEventListener('click', e => {
            const item = e.target.closest('.ui-list-item');
            if (item) {
                this.selectZone(item.dataset.id);
            }
        });
    }

    renderRecords(col) {
        const { selectedZone, records = [], selectedRecord, loading, error } = this.state;
        
        col.innerHTML = `
            ${UI.Header({
                title: selectedZone.name,
                actions: `
                    ${UI.Button({ id: 'add-rec', label: '+ New', size: 'small' })}
                    ${UI.CloseButton({ id: 'close-rec' })}
                `
            })}
            <div class="ui-content">
                ${loading ? UI.Loading({ message: 'Loading records...' }) : ''}
                ${error ? UI.Error({ message: error }) : ''}
                ${(records || []).map(r => UI.ListItem({
                    id: r.id,
                    title: r.name,
                    subtitle: r.content,
                    badge: UI.Badge({ label: r.type, variant: r.proxied ? 'warning' : 'default' }),
                    selected: selectedRecord?.id === r.id
                })).join('')}
            </div>`;

        col.querySelector('#add-rec').addEventListener('click', () => {
            this.state.selectedRecord = null; this.state.isEditing = true; this.renderUI();
        });
        col.querySelector('#close-rec').addEventListener('click', () => {
            this.state.selectedZone = null; this.state.records = []; this.renderUI();
        });
        col.querySelector('.ui-content').addEventListener('click', e => {
            const item = e.target.closest('.ui-list-item');
            if (item) {
                this.state.selectedRecord = records.find(r => String(r.id) === String(item.dataset.id));
                this.state.isEditing = true; 
                this.renderUI();
            }
        });
    }

    renderEditRecord(col) {
        const r = this.state.selectedRecord || { type: 'A', name: '', content: '', proxied: true, priority: 10 };
        const isNew = !this.state.selectedRecord;
        
        col.innerHTML = `
            ${UI.Header({
                title: isNew ? 'New Record' : 'Edit Record',
                actions: UI.CloseButton({ id: 'close-edit' })
            })}
            <div class="ui-content padded">
                ${UI.FormGroup({
                    label: 'Type',
                    control: UI.Select({
                        id: 'r-type',
                        options: ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV'].map(t => ({ value: t, label: t })),
                        selected: r.type
                    })
                })}
                ${UI.FormGroup({
                    label: 'Name',
                    control: UI.Input({ id: 'r-name', value: r.name, placeholder: '@ for root' })
                })}
                ${UI.FormGroup({
                    label: 'Content',
                    control: UI.Textarea({ id: 'r-content', value: r.content, placeholder: 'IP address or domain name' })
                })}
                ${UI.FormGroup({
                    label: 'Priority',
                    control: UI.Input({ id: 'r-prio', value: r.priority || 10, type: 'number' }),
                    visible: ['MX', 'SRV'].includes(r.type)
                })}
                ${UI.FormGroup({
                    control: UI.Checkbox({ id: 'r-proxy', checked: r.proxied, label: 'Proxy status (Proxied)' })
                })}
                
                ${UI.Button({ id: 'save-btn', label: this.state.loading ? 'Saving...' : 'Save Record', variant: 'primary' })}
                ${!isNew ? UI.Button({ id: 'del-btn', label: 'Delete Record', variant: 'danger' }) : ''}
            </div>`;

        col.querySelector('#r-type').addEventListener('change', e => {
            const prioGroup = col.querySelector('#r-prio').closest('.ui-form-group');
            if (prioGroup) prioGroup.style.display = ['MX', 'SRV'].includes(e.target.value) ? 'block' : 'none';
        });
        col.querySelector('#close-edit').addEventListener('click', () => {
            this.state.isEditing = false; this.state.selectedRecord = null; this.renderUI();
        });
        col.querySelector('#save-btn').addEventListener('click', () => this.saveRecord(col, isNew));
        if (!isNew) col.querySelector('#del-btn').addEventListener('click', () => this.deleteRecord());
    }

    async fetchZones() {
        if (this.state.loading) return; // Prevent concurrent fetches
        this.state.loading = true; this.state.error = null; this.renderUI();
        try {
            const res = await cfFetch(this.token, this.email, '/zones?per_page=50');
            this.state.zones = Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('Fetch zones error:', e);
            this.state.error = e.message || 'Failed to fetch zones';
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async selectZone(id) {
        if (this.state.selectedZone?.id === id) return;
        this.state.selectedZone = this.state.zones.find(z => String(z.id) === String(id));
        
        this.state.records = []; this.state.selectedRecord = null; this.state.isEditing = false;
        this.state.error = null;
        this.renderUI();

        if (!this.state.selectedZone) {
            console.error('Zone not found for id:', id);
            return;
        }

        this.state.loading = true; this.renderUI();
        try {
            const res = await cfFetch(this.token, this.email, `/zones/${id}/dns_records?per_page=100`);
            this.state.records = Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('Fetch records error:', e);
            this.state.error = e.message || 'Failed to load records';
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    async saveRecord(col, isNew) {
        const data = {
            type: col.querySelector('#r-type').value,
            name: col.querySelector('#r-name').value,
            content: col.querySelector('#r-content').value,
            proxied: col.querySelector('#r-proxy').checked,
            ttl: 1
        };
        if (['MX', 'SRV'].includes(data.type)) data.priority = parseInt(col.querySelector('#r-prio').value) || 10;

        this.state.loading = true; this.renderUI();
        try {
            const endpoint = `/zones/${this.state.selectedZone.id}/dns_records${isNew ? '' : '/' + this.state.selectedRecord.id}`;
            const res = await cfFetch(this.token, this.email, endpoint, {
                method: isNew ? 'POST' : 'PUT',
                body: JSON.stringify(data)
            });
            if (isNew) {
                this.state.records.unshift(res);
                this.state.selectedRecord = res;
            } else {
                Object.assign(this.state.selectedRecord, res);
            }
        } catch (e) { alert(e.message); }
        this.state.loading = false; this.renderUI();
    }

    async deleteRecord() {
        if (!confirm('Delete record?')) return;
        this.state.loading = true; this.renderUI();
        try {
            await cfFetch(this.token, this.email, `/zones/${this.state.selectedZone.id}/dns_records/${this.state.selectedRecord.id}`, { method: 'DELETE' });
            this.state.records = this.state.records.filter(r => r.id !== this.state.selectedRecord.id);
            this.state.selectedRecord = null; this.state.isEditing = false;
        } catch (e) { alert(e.message); }
        this.state.loading = false; this.renderUI();
    }
}
