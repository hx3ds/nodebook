import { TelegramMethods } from './TelegramDefinitions.js';
import { UI } from '../../../ui/index.js';

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
            paramValues: {},
            response: null,
            consoleLoading: false,
            consoleError: null
        };

        this.commonMethods = Object.keys(TelegramMethods);
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
        UI.Layout.clearSiblings(listColumn);

        if (this.state.isAdding) {
            const addColumn = UI.Layout.createColumn(listColumn.parentElement);
            this.renderAddColumn(addColumn);
        } else if (this.activeBotToken) {
            const consoleColumn = UI.Layout.createColumn(listColumn.parentElement);
            this.renderConsoleColumn(consoleColumn);
        }
        
        this.updateColumnVisibility();
    }

    updateColumnVisibility() {
        if (!this.container || !this.container.parentElement) return;
        UI.Layout.updateVisibility(this.container.parentElement);
    }

    renderListColumn(col) {
        const { loading, error } = this.state;
        
        col.innerHTML = `
            ${UI.Header({ 
                title: 'Telegram Bots',
                actions: loading ? '<span style="font-size:12px; color:#586069;">Loading...</span>' : ''
            })}
            <div class="ui-content">
                ${error ? UI.Error({ message: error }) : ''}
                
                ${this.bots.length === 0 ? `<div class="ui-empty" style="padding: 20px; color: #888; text-align: center;">No bots added</div>` : ''}

                ${this.bots.map(bot => {
                    const isActive = bot.token === this.activeBotToken;
                    const info = bot.info || {};
                    const name = info.first_name || 'Unknown Bot';
                    const username = info.username ? `@${info.username}` : 'No username';
                    
                    return UI.ListItem({
                        id: bot.token,
                        title: name,
                        subtitle: username,
                        selected: isActive
                    });
                }).join('')}
                
                <div style="padding: 20px;">
                   ${UI.Button({ id: 'add-bot-btn', label: '+ Add Bot', style: 'width: 100%' })}
                </div>
            </div>
        `;

        col.querySelectorAll('.ui-list-item').forEach(el => {
            el.addEventListener('click', () => {
                this.state.isAdding = false;
                this.onSelect(el.dataset.id);
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
            ${UI.Header({ 
                title: 'Add Bot',
                actions: UI.CloseButton({ id: 'close-add-btn' })
            })}
            <div class="ui-content padded">
                <div style="margin-bottom: 20px;">
                    ${UI.FormGroup({
                        label: 'Bot Token',
                        control: UI.Input({ 
                            id: 'tg-token-input',
                            value: this.state.addTokenInput,
                            placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'
                        })
                    })}
                    <div style="margin-top: 5px; font-size: 0.75em; color: #888;">
                        Obtain a token from <a href="#" onclick="window.open('https://t.me/BotFather', '_blank'); return false;">@BotFather</a>.
                    </div>
                </div>

                ${error ? UI.Error({ message: error }) : ''}

                <div style="margin-top: 20px;">
                    ${UI.Button({
                        id: 'do-add-bot-btn',
                        label: loading ? 'Verifying...' : 'Add Bot',
                        variant: 'primary',
                        style: 'width: 100%'
                    })}
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

        col.querySelector('#do-add-bot-btn').addEventListener('click', () => {
            if (!loading) this.handleAdd();
        });
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

        const { method, response, consoleLoading, consoleError, paramValues } = this.state;
        const name = activeBot.info.first_name || 'Unknown Bot';
        const methodDef = TelegramMethods[method];

        col.innerHTML = `
            ${UI.Header({
                title: name,
                actions: UI.Button({ id: 'delete-bot-btn', label: 'Delete', variant: 'danger', size: 'small', style: 'margin:0' })
            })}
            <div class="ui-content" style="display: flex; flex-direction: column;">
                
                <div style="padding: 15px; border-bottom: 1px solid #e1e4e8; background: #f6f8fa;">
                    ${UI.FormGroup({
                        label: 'Method',
                        control: `
                            <input type="text" id="tg-method-input" list="tg-methods-list" value="${method}" 
                                class="ui-input" style="font-family: monospace;">
                            <datalist id="tg-methods-list">
                                ${this.commonMethods.map(m => `<option value="${m}">`).join('')}
                            </datalist>
                        `
                    })}
                    ${methodDef ? `<div style="margin-top: 5px; font-size: 0.8em; color: #586069;">${methodDef.description || ''}</div>` : ''}
                </div>

                <div style="padding: 15px; flex: 1; overflow-y: auto; min-height: 0;">
                    ${this.renderParamsForm(methodDef, paramValues)}
                    
                    <div style="margin-top: 20px;">
                        ${UI.Button({
                            id: 'tg-exec-btn',
                            label: consoleLoading ? 'Executing...' : 'Execute Request',
                            variant: 'primary',
                            style: 'width: 100%'
                        })}
                    </div>
                    
                    ${consoleError ? UI.Error({ message: consoleError }) : ''}
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; border-top: 1px solid #e1e4e8; background: #fff; min-height: 200px;">
                    <div style="padding: 10px 15px; font-weight: 600; font-size: 0.9em; border-bottom: 1px solid #e1e4e8; background: #f6f8fa; color: #24292e; display: flex; justify-content: space-between;">
                        <span>Response</span>
                        ${response ? `<span style="font-weight: normal; font-size: 0.9em; color: ${response.ok ? '#28a745' : '#d73a49'};">${response.ok ? 'Success' : 'Error'}</span>` : ''}
                    </div>
                    ${UI.CodeBlock({
                        id: 'response-view',
                        content: response ? this.syntaxHighlight(response) : '<span style="color: #6a737d; font-style: italic;">Response will appear here...</span>',
                        style: 'flex: 1; border: none; border-radius: 0; margin: 0;'
                    })}
                </div>
            </div>
        `;

        const methodInput = col.querySelector('#tg-method-input');
        const execBtn = col.querySelector('#tg-exec-btn');
        const deleteBtn = col.querySelector('#delete-bot-btn');
        
        methodInput.addEventListener('change', (e) => {
            this.state.method = e.target.value;
            this.state.paramValues = {}; // Reset params on method change
            this.renderUI();
        });
        
        // Attach listeners to form inputs
        if (methodDef) {
            methodDef.params.forEach(param => {
                const input = col.querySelector(`#param-${param.name}`);
                if (input) {
                    input.addEventListener('input', (e) => {
                        const val = input.type === 'checkbox' ? input.checked : input.value;
                        this.state.paramValues[param.name] = val;
                    });
                }
            });
        }
        
        execBtn.addEventListener('click', () => {
             if (!consoleLoading) this.executeRequest();
        });

        deleteBtn.addEventListener('click', () => {
             if (confirm(`Are you sure you want to remove ${name}?`)) {
                this.onRemove(this.activeBotToken);
            }
        });
    }

    renderParamsForm(methodDef, values) {
        if (!methodDef) {
            return `<div style="color: #6a737d; font-style: italic;">Select a supported method to view parameters.</div>`;
        }

        if (methodDef.params.length === 0) {
            return `<div style="color: #6a737d; font-style: italic;">No parameters required.</div>`;
        }

        const sortedParams = [...methodDef.params].sort((a, b) => {
            if (a.required === b.required) return 0;
            return a.required ? -1 : 1;
        });

        return sortedParams.map(param => {
            const isRequired = param.required;
            const value = values[param.name] !== undefined ? values[param.name] : '';
            
            let control = '';
            if (param.type === 'boolean') {
                control = UI.Checkbox({ 
                    id: `param-${param.name}`, 
                    checked: !!value, 
                    label: param.description || '' 
                });
            } else if (param.type === 'select') {
                control = UI.Select({
                    id: `param-${param.name}`,
                    options: [{ value: '', label: '-- Select --' }, ...param.options.map(opt => ({ value: opt, label: opt }))],
                    selected: value
                });
            } else if (param.type === 'textarea' || param.type === 'json') {
                control = UI.Textarea({
                    id: `param-${param.name}`,
                    value: value,
                    placeholder: param.type === 'json' ? '{ ... }' : ''
                });
            } else {
                control = UI.Input({
                    id: `param-${param.name}`,
                    value: value,
                    type: param.type === 'number' ? 'number' : 'text'
                });
            }

            const label = `
                ${param.name}
                ${isRequired ? '<span style="color: #d73a49; margin-left: 4px;" title="Required">*</span>' : '<span style="color: #6a737d; font-weight: normal; font-size: 0.9em; margin-left: 4px;">(optional)</span>'}
            `;

            return `
                <div style="margin-bottom: 15px;">
                    ${param.type === 'boolean' ? control : UI.FormGroup({ label, control })}
                    ${param.type !== 'boolean' && param.description ? `<div style="margin-top: 4px; font-size: 0.75em; color: #586069;">${param.description}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    async executeRequest() {
        if (!this.activeBotToken) return;

        const method = this.state.method.trim();
        const methodDef = TelegramMethods[method];
        let params = {};

        if (methodDef) {
            // Build params from form values
            for (const param of methodDef.params) {
                const val = this.state.paramValues[param.name];
                if (val !== undefined && val !== '') {
                    if (param.type === 'json') {
                        try {
                            params[param.name] = typeof val === 'string' ? JSON.parse(val) : val;
                        } catch (e) {
                            this.state.consoleError = `Invalid JSON for parameter "${param.name}"`;
                            this.renderUI();
                            return;
                        }
                    } else if (param.type === 'number') {
                        params[param.name] = Number(val);
                    } else {
                        params[param.name] = val;
                    }
                } else if (param.required) {
                     this.state.consoleError = `Parameter "${param.name}" is required`;
                     this.renderUI();
                     return;
                }
            }
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
                    return '<span style="color: #d32f2f;">' + match.replace(/:$/, '') + '</span>:';
                } else {
                    cls = 'string';
                    return '<span style="color: #2e7d32;">' + match + '</span>';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
                return '<span style="color: #7b1fa2;">' + match + '</span>';
            } else if (/null/.test(match)) {
                cls = 'null';
                return '<span style="color: #757575;">' + match + '</span>';
            }
            return '<span style="color: #1565c0;">' + match + '</span>';
        });
    }
}
