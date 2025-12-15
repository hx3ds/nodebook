const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export const UI = {
    escapeHtml,

    Header: ({ title, actions = '' }) => `
        <div class="ui-header">
            <span>${title}</span>
            <div class="ui-header-actions">
                ${actions}
            </div>
        </div>
    `,

    Button: ({ id, label, variant = 'secondary', size = 'normal', onClick = '', style = '' }) => `
        <button id="${id}" class="ui-btn ui-btn-${variant} ${size === 'small' ? 'small' : ''}" style="${style}" ${onClick ? `onclick="${onClick}"` : ''}>
            ${label}
        </button>
    `,

    CloseButton: ({ id }) => `
        <button id="${id}" class="ui-close-btn">✕</button>
    `,

    Input: ({ id, value = '', placeholder = '', type = 'text' }) => `
        <input id="${id}" type="${type}" class="ui-input" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
    `,

    Textarea: ({ id, value = '', placeholder = '' }) => `
        <textarea id="${id}" class="ui-textarea" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
    `,

    Select: ({ id, options = [], selected = '' }) => `
        <select id="${id}" class="ui-select">
            ${options.map(opt => `<option value="${escapeHtml(opt.value)}" ${opt.value === selected ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
        </select>
    `,

    Checkbox: ({ id, checked, label }) => `
        <label class="ui-flex-row" style="cursor: pointer">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}> 
            <span>${label}</span>
        </label>
    `,

    Badge: ({ label, variant = 'default' }) => `
        <span class="ui-badge ${variant}">${label}</span>
    `,

    ListItem: ({ id, title, subtitle = '', badge = null, selected = false }) => `
        <div class="ui-list-item ${selected ? 'selected' : ''}" data-id="${id}">
            <div class="ui-title">
                <span>${title}</span>
                ${badge ? badge : ''}
            </div>
            ${subtitle ? `<div class="ui-subtitle">${subtitle}</div>` : ''}
        </div>
    `,

    List: ({ items, emptyMessage = 'No items found' }) => `
        <div class="ui-content">
            ${items.length === 0 ? `<div class="ui-empty">${emptyMessage}</div>` : items.join('')}
        </div>
    `,

    FormGroup: ({ label, control, visible = true }) => `
        <div class="ui-form-group" style="${visible ? '' : 'display:none'}">
            ${label ? `<label class="ui-label">${label}</label>` : ''}
            ${control}
        </div>
    `,

    Loading: ({ message = 'Loading...' }) => `
        <div class="ui-loading">${message}</div>
    `,

    Error: ({ message }) => `
        <div class="ui-badge warning" style="display:block; margin:10px;">${escapeHtml(message)}</div>
    `,

    Tabs: ({ id, tabs = [], activeTab = '' }) => `
        <div class="ui-tabs" id="${id}">
            ${tabs.map(t => `
                <button class="ui-tab-btn ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
                    ${t.label}
                </button>
            `).join('')}
        </div>
    `,

    CodeBlock: ({ id, content, language = '', style = '' }) => `
        <div id="${id}" class="ui-code-block" style="${style}">${escapeHtml(content)}</div>
    `
};
