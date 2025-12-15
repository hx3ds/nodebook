import { ProfileTab } from './tabs/ProfileTab.js';
import { DownloadTab } from './tabs/DownloadTab.js';
import { UI } from '../../ui/index.js';

export class YtDlpPlugin {
    constructor() {
        this.name = 'yt-dlp GUI';
        this.id = 'yt-dlp';
        
        // State
        this.activeNavId = 'download';
        
        // Settings
        this.binaryPath = localStorage.getItem('ytdlp_binary_path') || 'yt-dlp';
        
        // Cache tab instances
        this.tabs = {
            profile: null,
            download: null
        };
    }

    getNavigationItems() {
        return [
            { id: 'download', label: 'Downloads' },
            { id: 'profile', label: 'Settings' }
        ];
    }

    setActiveNav(id) {
        this.activeNavId = id;
    }

    onActivate() {
        // Called when plugin becomes active
    }

    renderTab(tabId, container) {
        if (!this.tabs[tabId]) {
            this.initTabInstance(tabId);
        }

        // Clear container
        container.innerHTML = '';
        
        const instance = this.tabs[tabId];
        
        if (instance) {
            if (tabId === 'download') {
                // DownloadTab manages its own columns
                instance.render(container);
            } else {
                // Other tabs (like Profile) need a wrapper column
                const col = UI.Layout.createColumn(container);
                instance.render(col);
            }
        } else {
            container.innerHTML = 'Tab not found';
        }
    }

    // Legacy render for backward compatibility or initial view
    render(container) {
        this.container = container;
        this.renderColumnView();
    }

    renderColumnView() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const tabId = this.activeNavId;
        this.renderTab(tabId, this.container);
    }

    initTabInstance(tabId) {
        switch (tabId) {
            case 'profile':
                this.tabs.profile = new ProfileTab({
                    initialBinaryPath: this.binaryPath,
                    onUpdate: (path) => this.updateSettings(path)
                });
                break;
            case 'download':
                this.tabs.download = new DownloadTab({
                    binaryPath: this.binaryPath
                });
                break;
        }
    }

    updateSettings(binaryPath) {
        this.binaryPath = binaryPath;
        localStorage.setItem('ytdlp_binary_path', binaryPath);
        
        // Update instances if they exist
        if (this.tabs.download) {
            this.tabs.download.updateBinaryPath(binaryPath);
        }
    }
}
