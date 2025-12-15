export const css = `
/* Unified UI System Styles */

.ui-container {
    display: flex;
    height: 100%;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #333;
    overflow-x: auto;
    background-color: #fff;
}

/* Columns */
.ui-column {
    flex: 0 0 320px;
    min-width: 320px;
    border-right: 1px solid #e1e4e8;
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #fcfcfc;
    transition: all 0.2s ease;
}

.ui-column:last-child {
    border-right: none;
    flex: 1;
    background-color: #fff;
}

/* Headers */
.ui-header {
    padding: 12px 16px;
    border-bottom: 1px solid #e1e4e8;
    background-color: #f6f8fa;
    font-weight: 600;
    font-size: 13px;
    color: #24292e;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 48px;
    box-sizing: border-box;
}

.ui-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.ui-close-btn {
    background: none;
    border: none;
    color: #6a737d;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    line-height: 1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ui-close-btn:hover {
    background-color: #e1e4e8;
    color: #24292e;
}

/* Content Area */
.ui-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
    position: relative;
}

.ui-content.padded {
    padding: 20px;
}

/* List Items */
.ui-list-item {
    padding: 12px 16px;
    border-bottom: 1px solid #eaecef;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background-color 0.15s ease;
    position: relative;
}

.ui-list-item:hover {
    background-color: #f6f8fa;
}

.ui-list-item.selected {
    background-color: #0366d6;
    color: white;
    border-bottom-color: #0366d6;
}

.ui-list-item.selected .ui-subtitle {
    color: rgba(255, 255, 255, 0.8);
}

.ui-list-item.selected .ui-badge {
    border-color: rgba(255,255,255,0.4);
    color: white;
}

.ui-title {
    font-weight: 500;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.ui-subtitle {
    font-size: 12px;
    color: #586069;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Forms */
.ui-form-group {
    margin-bottom: 16px;
}

.ui-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #24292e;
}

.ui-input, .ui-select, .ui-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-color: #fff;
    color: #24292e;
}

.ui-input:focus, .ui-select:focus, .ui-textarea:focus {
    border-color: #0366d6;
    outline: none;
    box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.3);
}

.ui-textarea {
    min-height: 80px;
    resize: vertical;
}

/* Buttons */
.ui-btn {
    display: inline-block;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
    border: 1px solid;
    border-radius: 6px;
    appearance: none;
    text-align: center;
    width: 100%;
    margin-bottom: 8px;
    transition: all 0.2s;
}

.ui-btn.small {
    padding: 4px 8px;
    font-size: 12px;
    width: auto;
    margin-bottom: 0;
}

.ui-btn-primary {
    color: #fff;
    background-color: #2ea44f;
    border-color: rgba(27, 31, 35, 0.15);
    box-shadow: 0 1px 0 rgba(27, 31, 35, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.ui-btn-primary:hover {
    background-color: #2c974b;
}

.ui-btn-secondary {
    color: #24292e;
    background-color: #fafbfc;
    border-color: rgba(27, 31, 35, 0.15);
    box-shadow: 0 1px 0 rgba(27, 31, 35, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.ui-btn-secondary:hover {
    background-color: #f3f4f6;
}

.ui-btn-danger {
    color: #cb2431;
    background-color: #fff;
    border-color: rgba(27, 31, 35, 0.15);
}

.ui-btn-danger:hover {
    background-color: #cb2431;
    color: #fff;
}

/* Badges */
.ui-badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    border-radius: 10px;
    border: 1px solid #e1e4e8;
    color: #586069;
}

.ui-badge.success {
    background-color: #dafbe1;
    color: #1a7f37;
    border-color: #dafbe1;
}

.ui-badge.warning {
    background-color: #fff8c5;
    color: #9a6700;
    border-color: #fff8c5;
}

.ui-badge.info {
    background-color: #dbedff;
    color: #0366d6;
    border-color: #dbedff;
}

/* Loading & Empty */
.ui-loading {
    padding: 20px;
    text-align: center;
    color: #586069;
    font-style: italic;
}

.ui-empty {
    padding: 40px 20px;
    text-align: center;
    color: #586069;
}

/* Tabs */
.ui-tabs {
    display: flex;
    border-bottom: 1px solid #e1e4e8;
    margin-bottom: 16px;
    background: #fff;
}

.ui-tab-btn {
    padding: 8px 16px;
    border: none;
    background: none;
    font-size: 13px;
    color: #586069;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    font-weight: 500;
}

.ui-tab-btn:hover {
    color: #0366d6;
    border-bottom-color: #e1e4e8;
}

.ui-tab-btn.active {
    color: #0366d6;
    border-bottom-color: #0366d6;
}

/* Code Block */
.ui-code-block {
    font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
    white-space: pre-wrap;
    overflow: auto;
    font-size: 12px;
    background: #f6f8fa;
    color: #24292e;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #e1e4e8;
}

/* Utilities */
.ui-mt-2 { margin-top: 8px; }
.ui-mb-2 { margin-bottom: 8px; }
.ui-text-small { font-size: 12px; color: #586069; }
.ui-flex-row { display: flex; gap: 10px; align-items: center; }
.ui-flex-between { display: flex; justify-content: space-between; align-items: center; }

/* Scrollbar */
.ui-content::-webkit-scrollbar {
    width: 8px;
}
.ui-content::-webkit-scrollbar-track {
    background: transparent;
}
.ui-content::-webkit-scrollbar-thumb {
    background-color: rgba(0,0,0,0.2);
    border-radius: 4px;
}
`;

export function injectStyles() {
    if (!document.getElementById('ui-plugin-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-plugin-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }
}
