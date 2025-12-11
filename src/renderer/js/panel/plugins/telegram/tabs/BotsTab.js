export class BotsTab {
    constructor({ bots, activeBotToken, onAdd, onRemove, onSelect }) {
        this.bots = bots;
        this.activeBotToken = activeBotToken;
        this.onAdd = onAdd;
        this.onRemove = onRemove;
        this.onSelect = onSelect;
        
        this.state = {
            loading: false,
            error: null,
            addTokenInput: '',
            isAdding: false,
            
            // Console state
            method: 'getMe',
            params: '{}',
            response: null,
            consoleLoading: false,
            consoleError: null
        };

        this.commonMethods = [
            'getMe', 'getUpdates', 'setWebhook', 'deleteWebhook', 'getWebhookInfo',
            'sendMessage', 'forwardMessage', 'sendPhoto', 'sendAudio', 'sendDocument',
            'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote', 'sendMediaGroup',
            'sendLocation', 'editMessageText', 'editMessageCaption', 'deleteMessage'
        ];
    }

    render(container) {
        this.container = container;
        this.renderUI();
    }

    update(bots, activeBotToken) {
        this.bots = bots;
        this.activeBotToken = activeBotToken;
        if (this.container) {
            this.renderUI();
        }
    }

    renderUI() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const listColumn = this.container;
        this.renderListColumn(listColumn);

        // Manage dynamic columns
        // Cleanup existing next columns
        let next = listColumn.nextElementSibling;
        while(next) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
        }

        if (this.state.isAdding) {
            const addColumn = this.createColumn(listColumn.parentElement);
            this.renderAddColumn(addColumn);
        } else if (this.activeBotToken) {
            const consoleColumn = this.createColumn(listColumn.parentElement);
            this.renderConsoleColumn(consoleColumn);
        }
        
        this.updateColumnVisibility();
    }

    updateColumnVisibility() {
        if (!this.container || !this.container.parentElement) return;
        
        const container = this.container.parentElement;
        if (!container.children) return;

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
        const { loading, error } = this.state;
        
        col.innerHTML = `
            <div class="column-header">
                <span>Telegram Bots</span>
                ${loading ? '<span style="font-size:0.8em; color:#888;">Loading...</span>' : ''}
            </div>
            <div class="column-content">
                ${error ? `<div style="padding: 10px; color: #c62828;">${error}</div>` : ''}
                
                <div class="bot-list">
                    ${this.bots.map(bot => {
                        const isActive = bot.token === this.activeBotToken;
                        const info = bot.info || {};
                        const name = info.first_name || 'Unknown Bot';
                        const username = info.username ? `@${info.username}` : 'No username';
                        
                        return `
                            <div class="list-item ${isActive ? 'active' : ''}" data-token="${bot.token}">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 500;">${name}</span>
                                    ${isActive ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #0088cc;"></div>' : ''}
                                </div>
                                <div style="font-size: 0.8em; opacity: 0.7; margin-top: 2px;">${username}</div>
                            </div>
                        `;
                    }).join('')}
                    
                    ${this.bots.length === 0 ? '<div style="padding: 15px; color: #888; font-style: italic;">No bots added.</div>' : ''}
                    
                    <div style="padding: 10px;">
                       <button id="add-bot-btn" style="width: 100%; padding: 6px; cursor: pointer;">+ Add Bot</button>
                    </div>
                </div>
            </div>
        `;

        col.querySelectorAll('.list-item').forEach(el => {
            el.addEventListener('click', () => {
                this.state.isAdding = false;
                this.onSelect(el.dataset.token);
                // onSelect updates the plugin state which calls update() on this tab
            });
        });
        
        const addBtn = col.querySelector('#add-bot-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.state.isAdding = true;
                this.renderUI();
            });
        }
    }

    renderAddColumn(col) {
        const { loading, error } = this.state;
        
        col.innerHTML = `
            <div class="column-header">
                <span>Add Bot</span>
                <button id="close-add-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #ddd; border-radius: 3px;">✕</button>
            </div>
            <div class="column-content" style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #666;">Bot Token</label>
                    <input type="text" id="tg-token-input" 
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        value="${this.state.addTokenInput}"
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <div style="margin-top: 5px; font-size: 0.75em; color: #888;">
                        Obtain a token from <a href="#" onclick="window.open('https://t.me/BotFather', '_blank'); return false;">@BotFather</a>.
                    </div>
                </div>

                ${error ? `<div style="color: #c62828; font-size: 0.9em; margin-bottom: 10px;">${error}</div>` : ''}

                <div style="margin-top: 20px;">
                    <button id="do-add-bot-btn" 
                        style="width: 100%; padding: 8px; background: #0088cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;"
                        ${loading ? 'disabled' : ''}>
                        ${loading ? 'Verifying...' : 'Add Bot'}
                    </button>
                </div>
            </div>
        `;

        col.querySelector('#close-add-btn').addEventListener('click', () => {
            this.state.isAdding = false;
            this.renderUI();
        });

        const input = col.querySelector('#tg-token-input');
        input.addEventListener('input', (e) => {
            this.state.addTokenInput = e.target.value;
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAdd();
        });

        col.querySelector('#do-add-bot-btn').addEventListener('click', () => this.handleAdd());
    }

    async handleAdd() {
        const token = this.state.addTokenInput.trim();
        if (!token) {
            this.state.error = 'Please enter a token';
            this.renderUI();
            return;
        }

        if (this.bots.find(b => b.token === token)) {
            this.state.error = 'This bot is already added';
            this.renderUI();
            return;
        }

        this.state.loading = true;
        this.state.error = null;
        this.renderUI();

        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
            const data = await response.json();

            if (data.ok) {
                this.state.addTokenInput = '';
                this.state.loading = false;
                this.state.isAdding = false;
                this.onAdd(token, data.result);
                // onAdd will trigger update() which renders UI
            } else {
                throw new Error(data.description || 'Invalid token');
            }
        } catch (err) {
            this.state.loading = false;
            this.state.error = err.message || 'Failed to verify token';
            this.renderUI();
        }
    }

    renderConsoleColumn(col) {
        const activeBot = this.bots.find(b => b.token === this.activeBotToken);
        if (!activeBot) return;

        const { method, params, response, consoleLoading, consoleError } = this.state;
        const name = activeBot.info.first_name || 'Unknown Bot';

        col.innerHTML = `
            <div class="column-header">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span>${name}</span>
                    <button id="delete-bot-btn" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #d32f2f; color: #d32f2f; border-radius: 3px;">Delete</button>
                </div>
            </div>
            <div class="column-content" style="padding: 0; display: flex; flex-direction: column; height: 100%;">
                
                <div style="padding: 15px; border-bottom: 1px solid #eee;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">Method</label>
                    <input type="text" id="tg-method-input" list="tg-methods-list" value="${method}" 
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; box-sizing: border-box;">
                    <datalist id="tg-methods-list">
                        ${this.commonMethods.map(m => `<option value="${m}">`).join('')}
                    </datalist>
                </div>

                <div style="padding: 15px; flex: 1; display: flex; flex-direction: column; min-height: 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">Parameters (JSON)</label>
                    <textarea id="tg-params-input" 
                        style="width: 100%; flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; resize: none; box-sizing: border-box;"
                    >${params}</textarea>
                    
                    <button id="tg-exec-btn" style="
                        margin-top: 10px;
                        background: #0088cc; color: white; border: none; padding: 10px; 
                        border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;
                    " ${consoleLoading ? 'disabled' : ''}>
                        ${consoleLoading ? 'Executing...' : 'Execute'}
                    </button>
                    
                    ${consoleError ? `<div style="margin-top: 10px; color: #c62828; font-size: 0.9em;">${consoleError}</div>` : ''}
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; border-top: 1px solid #eee; background: #f9f9f9; min-height: 200px;">
                    <div style="padding: 10px; font-weight: bold; font-size: 0.9em; border-bottom: 1px solid #eee;">Response</div>
                    <div style="
                        flex: 1; padding: 10px; 
                        font-family: monospace; white-space: pre-wrap; 
                        overflow: auto; font-size: 0.85em;
                        background: #2b2b2b; color: #f8f8f2;
                    ">${response ? this.syntaxHighlight(response) : '<span style="color: #888;">// Response will appear here</span>'}</div>
                </div>
            </div>
        `;

        const methodInput = col.querySelector('#tg-method-input');
        const paramsInput = col.querySelector('#tg-params-input');
        const execBtn = col.querySelector('#tg-exec-btn');
        const deleteBtn = col.querySelector('#delete-bot-btn');
        
        methodInput.addEventListener('change', (e) => {
            this.state.method = e.target.value;
        });
        
        paramsInput.addEventListener('input', (e) => {
            this.state.params = e.target.value;
        });
        
        execBtn.addEventListener('click', () => this.executeRequest());

        deleteBtn.addEventListener('click', () => {
             if (confirm(`Are you sure you want to remove ${name}?`)) {
                this.onRemove(this.activeBotToken);
            }
        });
    }

    async executeRequest() {
        if (!this.activeBotToken) return;

        const method = this.state.method.trim();
        let params = {};
        
        try {
            const paramsStr = this.state.params.trim();
            if (paramsStr) {
                params = JSON.parse(paramsStr);
            }
        } catch (e) {
            this.state.consoleError = 'Invalid JSON in parameters';
            this.renderUI();
            return;
        }

        this.state.consoleLoading = true;
        this.state.consoleError = null;
        this.state.response = null;
        this.renderUI();

        try {
            const response = await fetch(`https://api.telegram.org/bot${this.activeBotToken}/${method}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            this.state.response = data;
            this.state.consoleLoading = false;
            this.renderUI();
            
        } catch (err) {
            this.state.consoleLoading = false;
            this.state.consoleError = err.message || 'Network error';
            this.renderUI();
        }
    }

    syntaxHighlight(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                    return '<span style="color: #ff79c6;">' + match.replace(/:$/, '') + '</span>:';
                } else {
                    cls = 'string';
                    return '<span style="color: #f1fa8c;">' + match + '</span>';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
                return '<span style="color: #bd93f9;">' + match + '</span>';
            } else if (/null/.test(match)) {
                cls = 'null';
                return '<span style="color: #6272a4;">' + match + '</span>';
            }
            return '<span style="color: #bd93f9;">' + match + '</span>';
        });
    }
}
