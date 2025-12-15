import { UI } from '../../../ui/index.js';

export class RequestTab {
    constructor() {
        this.state = {
            loading: false,
            error: null,
            history: [],
            selectedRequestId: null,
            isEditing: false,
            requestData: {
                method: 'GET',
                url: 'https://',
                headers: [{ key: '', value: '' }],
                body: ''
            },
            response: null
        };
        
        this.loadHistory();
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('http_client_history');
            if (saved) {
                this.state.history = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load history', e);
        }
    }

    saveHistory() {
        try {
            const history = this.state.history.slice(0, 50);
            localStorage.setItem('http_client_history', JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save history', e);
        }
    }

    render(container) {
        this.container = container;
        this.renderUI();
    }

    renderUI() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.renderHistoryColumn(this.container);

        UI.Layout.clearSiblings(this.container);
        const parent = this.container.parentElement;
        if (!parent) return;

        if (this.state.isEditing) {
            const requestColumn = UI.Layout.createColumn(parent);
            this.renderRequestColumn(requestColumn);

            if (this.state.response || this.state.loading) {
                const responseColumn = UI.Layout.createColumn(parent);
                this.renderResponseColumn(responseColumn);
            }
        }
        UI.Layout.updateVisibility(parent);
    }

    renderHistoryColumn(col) {
        const { history, selectedRequestId } = this.state;

        col.innerHTML = `
            ${UI.Header({ 
                title: 'Requests', 
                actions: UI.Button({ id: 'new-req-btn', label: '+ New', variant: 'primary', size: 'small', style: 'margin:0' }) 
            })}
            <div class="ui-content">
                ${history.length === 0 ? '<div class="ui-empty">No history.</div>' : ''}
                ${history.map(req => {
                    const methodColor = this.getMethodColor(req.method);
                    return UI.ListItem({
                        id: req.id,
                        title: `<span style="color:${methodColor};font-weight:600;width:40px;display:inline-block">${req.method}</span> ${UI.escapeHtml(req.url)}`,
                        subtitle: new Date(req.timestamp).toLocaleTimeString(),
                        selected: selectedRequestId === req.id
                    });
                }).join('')}
            </div>
        `;

        col.querySelector('#new-req-btn').addEventListener('click', () => {
            this.state.selectedRequestId = null;
            this.state.isEditing = true;
            this.state.requestData = {
                method: 'GET',
                url: 'https://',
                headers: [{ key: '', value: '' }],
                body: ''
            };
            this.state.response = null;
            this.renderUI();
        });

        col.querySelector('.ui-content').addEventListener('click', (e) => {
            const item = e.target.closest('.ui-list-item');
            if (item) {
                const req = history.find(h => h.id === item.dataset.id);
                if (req) {
                    this.state.selectedRequestId = req.id;
                    this.state.isEditing = true;
                    this.state.requestData = { ...req };
                    this.state.response = req.response || null;
                    this.renderUI();
                }
            }
        });
    }

    renderRequestColumn(col) {
        const { requestData, loading, selectedRequestId } = this.state;
        const isNew = !selectedRequestId;

        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => ({ value: m, label: m }));

        col.innerHTML = `
            ${UI.Header({ 
                title: 'Request', 
                actions: `
                    ${!isNew ? UI.Button({ id: 'delete-req-btn', label: 'Delete', variant: 'danger', size: 'small', style: 'width:auto;margin:0' }) : ''}
                    ${UI.CloseButton({ id: 'close-req-btn' })}
                `
            })}
            <div class="ui-content padded">
                <div class="ui-flex-row ui-mb-2">
                    <div style="width: 100px">
                        ${UI.Select({ id: 'req-method', options: methods, selected: requestData.method })}
                    </div>
                    <div style="flex: 1">
                        ${UI.Input({ id: 'req-url', value: requestData.url, placeholder: 'https://api.example.com' })}
                    </div>
                </div>

                ${UI.Tabs({ 
                    id: 'req-tabs', 
                    tabs: [{ id: 'headers', label: 'Headers' }, { id: 'body', label: 'Body' }], 
                    activeTab: 'headers' 
                })}

                <div id="tab-headers" class="tab-pane">
                    <div id="headers-container">
                        ${requestData.headers.map((h, i) => `
                            <div class="ui-flex-row ui-mb-2 header-row" data-index="${i}">
                                <input class="ui-input header-key" value="${UI.escapeHtml(h.key)}" placeholder="Key" style="flex:1">
                                <input class="ui-input header-val" value="${UI.escapeHtml(h.value)}" placeholder="Value" style="flex:1">
                                <button class="ui-close-btn remove-header">✕</button>
                            </div>
                        `).join('')}
                    </div>
                    ${UI.Button({ id: 'add-header-btn', label: '+ Add Header', size: 'small' })}
                </div>

                <div id="tab-body" class="tab-pane" style="display: none;">
                    ${UI.Textarea({ id: 'req-body', value: requestData.body, placeholder: '{ "key": "value" }' })}
                </div>

                <div class="ui-mt-2">
                    ${UI.Button({ id: 'send-btn', label: loading ? 'Sending...' : 'SEND REQUEST', variant: 'primary' })}
                </div>
            </div>
        `;
        
        const textarea = col.querySelector('#req-body');
        if(textarea) textarea.style.height = '200px';

        // Bind Close
        col.querySelector('#close-req-btn').addEventListener('click', () => {
            this.state.isEditing = false;
            this.state.selectedRequestId = null;
            this.state.response = null;
            this.renderUI();
        });

        // Bind Delete
        if (!isNew) {
            col.querySelector('#delete-req-btn').addEventListener('click', () => {
                if (confirm('Delete this request?')) {
                    this.state.history = this.state.history.filter(h => h.id !== selectedRequestId);
                    this.saveHistory();
                    this.state.selectedRequestId = null;
                    this.state.isEditing = false;
                    this.renderUI();
                }
            });
        }

        // Bind Method/URL
        col.querySelector('#req-method').addEventListener('change', (e) => this.state.requestData.method = e.target.value);
        col.querySelector('#req-url').addEventListener('input', (e) => this.state.requestData.url = e.target.value);
        col.querySelector('#req-body').addEventListener('input', (e) => this.state.requestData.body = e.target.value);

        // Bind Send
        col.querySelector('#send-btn').addEventListener('click', () => this.executeRequest());

        // Bind Tabs
        const tabBtns = col.querySelectorAll('.ui-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                col.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
                col.querySelector(`#tab-${btn.dataset.tab}`).style.display = 'block';
            });
        });

        // Bind Headers
        col.querySelectorAll('.header-row').forEach(row => {
            const index = parseInt(row.dataset.index);
            row.querySelector('.header-key').addEventListener('input', (e) => this.state.requestData.headers[index].key = e.target.value);
            row.querySelector('.header-val').addEventListener('input', (e) => this.state.requestData.headers[index].value = e.target.value);
            row.querySelector('.remove-header').addEventListener('click', () => {
                this.state.requestData.headers.splice(index, 1);
                this.renderRequestColumn(col); // Re-render needed to remove row
            });
        });

        col.querySelector('#add-header-btn').addEventListener('click', () => {
            this.state.requestData.headers.push({ key: '', value: '' });
            this.renderRequestColumn(col);
        });
    }

    renderResponseColumn(col) {
        const { response, loading, error } = this.state;

        if (loading) {
            col.innerHTML = `
                ${UI.Header({ title: 'Response' })}
                <div class="ui-content" style="display: flex; align-items: center; justify-content: center;">
                    <div style="color: #666;">Sending Request...</div>
                </div>
            `;
            return;
        }

        if (error) {
            col.innerHTML = `
                ${UI.Header({ title: 'Error' })}
                <div class="ui-content padded">
                    ${UI.Error({ message: error })}
                </div>
            `;
            return;
        }

        if (!response) return;

        const statusVariant = response.status >= 200 && response.status < 300 ? 'success' : 
                              response.status >= 300 && response.status < 400 ? 'warning' : 'danger'; // Assuming red for danger in styles? No danger badge yet.
        // Wait, styles.js has success, warning, info. I'll use warning for 300-400 and default for others, or just use inline style for now if needed. 
        // Or I can add 'danger' to badge styles later. For now let's stick to existing variants.
        // I'll use 'warning' for errors/400/500 and 'success' for 200.

        const badgeVariant = response.status >= 200 && response.status < 300 ? 'success' : 'warning';

        col.innerHTML = `
            ${UI.Header({ 
                title: 'Response', 
                actions: UI.Badge({ label: `${response.status} ${response.statusText}`, variant: badgeVariant }) 
            })}
            <div class="ui-content" style="padding: 0; display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 10px; background: #f9f9f9; border-bottom: 1px solid #eee; font-size: 13px; display: flex; gap: 15px; color: #666;">
                    <span>Time: <strong>${response.time}ms</strong></span>
                    <span>Size: <strong>${this.formatSize(response.size)}</strong></span>
                </div>

                <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
                     ${UI.Tabs({ 
                        id: 'res-tabs', 
                        tabs: [{ id: 'res-body', label: 'Body' }, { id: 'res-headers', label: 'Headers' }], 
                        activeTab: 'res-body' 
                    })}

                    <div id="tab-res-body" class="res-tab-pane" style="flex: 1; overflow: auto; display: flex; flex-direction: column;">
                        ${UI.CodeBlock({ 
                            id: 'res-body-code', 
                            content: this.formatBody(response.body, response.contentType),
                            style: 'flex: 1; border: none; border-radius: 0; margin: 0;'
                        })}
                    </div>

                    <div id="tab-res-headers" class="res-tab-pane" style="display: none; padding: 10px; overflow: auto;">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 5px 15px; font-size: 13px;">
                            ${Object.entries(response.headers).map(([k, v]) => `
                                <strong style="color: #444;">${UI.escapeHtml(k)}:</strong>
                                <span style="font-family: monospace; color: #666;">${UI.escapeHtml(v)}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind Tabs
        const tabBtns = col.querySelectorAll('.ui-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                col.querySelectorAll('.res-tab-pane').forEach(p => p.style.display = 'none');
                col.querySelector(`#tab-${btn.dataset.tab}`).style.display = 'block';
                if (btn.dataset.tab === 'res-body') {
                     col.querySelector(`#tab-${btn.dataset.tab}`).style.display = 'block'; 
                }
            });
        });
    }

    async executeRequest() {
        this.state.loading = true;
        this.state.error = null;
        this.state.response = null;
        this.renderUI();

        const startTime = Date.now();
        const { method, url, headers, body } = this.state.requestData;

        try {
            const fetchHeaders = {};
            headers.forEach(h => {
                if (h.key) fetchHeaders[h.key] = h.value;
            });

            const options = {
                method,
                headers: fetchHeaders
            };

            if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
                options.body = body;
            }

            const res = await fetch(url, options);
            const endTime = Date.now();
            
            const blob = await res.blob();
            const text = await blob.text();
            
            const resHeaders = {};
            res.headers.forEach((val, key) => resHeaders[key] = val);

            this.state.response = {
                status: res.status,
                statusText: res.statusText,
                headers: resHeaders,
                body: text,
                contentType: resHeaders['content-type'],
                time: endTime - startTime,
                size: blob.size
            };

            const newItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                method,
                url,
                headers: headers.filter(h => h.key),
                body,
                response: this.state.response
            };

            this.state.history.unshift(newItem);
            this.state.selectedRequestId = newItem.id;
            this.saveHistory();

        } catch (e) {
            this.state.error = e.message;
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }

    getMethodColor(method) {
        switch (method) {
            case 'GET': return '#2e7d32';
            case 'POST': return '#f57c00';
            case 'DELETE': return '#c62828';
            case 'PUT': return '#1976d2';
            default: return '#666';
        }
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    formatBody(body, contentType) {
        if (!body) return '';
        if (contentType && contentType.includes('application/json')) {
            try {
                return JSON.stringify(JSON.parse(body), null, 2);
            } catch (e) {
                return body;
            }
        }
        return body;
    }
}
