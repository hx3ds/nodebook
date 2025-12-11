export class PanelManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.element = null;
        this.plugins = [];
        this.expandedPlugins = new Set();
        this.isVisible = false;
        this.isSidebarCollapsed = false;
        
        // Multi-tab state
        this.openTabs = []; // { id, pluginId, navId, label, container }
        this.activeTabId = null;
    }

    init() {
        this.element = document.getElementById(this.containerId);
        if (!this.element) return;
        this.renderLayout();
    }

    registerPlugin(plugin) {
        this.plugins.push(plugin);
        // Expand first plugin by default if it's the first one
        if (this.plugins.length === 1) {
            this.expandedPlugins.add(plugin.id);
        }
        this.renderSidebar();
    }

    togglePluginExpansion(plugin) {
        if (this.expandedPlugins.has(plugin.id)) {
            this.expandedPlugins.delete(plugin.id);
        } else {
            this.expandedPlugins.add(plugin.id);
        }
        this.renderSidebar();
    }

    toggleVisibility(show) {
        this.isVisible = show;
        if (this.element) {
            this.element.style.display = show ? 'flex' : 'none';
        }
    }

    renderLayout() {
        this.element.innerHTML = `
            <div class="panel-window">
                <div class="panel-sidebar">
                    <div class="sidebar-content" style="flex: 1; overflow-y: auto;">
                        <!-- Plugin Items -->
                    </div>
                </div>
                <div class="panel-right-side" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div class="panel-tabs-bar" style="
                        height: 35px; background: #f0f0f0; border-bottom: 1px solid #ddd; 
                        display: flex; align-items: flex-end; padding-left: 10px; gap: 5px;
                    ">
                        <!-- Tabs -->
                    </div>
                    <div class="panel-main" id="panel-main-content" style="flex: 1; position: relative; overflow: hidden;">
                        <!-- Tab Containers Rendered Here -->
                    </div>
                </div>
            </div>
        `;
        
        Object.assign(this.element.style, {
            display: this.isVisible ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'transparent'
        });

        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.toggleVisibility(false);
            }
        });

        this.renderSidebar();
        this.renderTabs();
    }

    renderSidebar() {
        const container = this.element.querySelector('.sidebar-content');
        if (!container) return;
        container.innerHTML = '';

        this.plugins.forEach(plugin => {
            const isExpanded = this.expandedPlugins.has(plugin.id);
            
            // Plugin Header
            const pluginItem = document.createElement('div');
            pluginItem.className = `sidebar-item ${isExpanded ? 'expanded' : ''}`;
            pluginItem.style.fontWeight = 'bold';
            pluginItem.style.cursor = 'pointer';
            pluginItem.style.display = 'flex';
            pluginItem.style.justifyContent = 'space-between';
            pluginItem.innerHTML = `
                <span>${plugin.name}</span>
                <span style="font-size: 0.8em;">${isExpanded ? '▼' : '▶'}</span>
            `;
            
            pluginItem.addEventListener('click', () => {
                this.togglePluginExpansion(plugin);
            });
            container.appendChild(pluginItem);

            // Sub-items
            if (isExpanded && plugin.getNavigationItems) {
                const navItems = plugin.getNavigationItems();
                if (navItems.length > 0) {
                    const navContainer = document.createElement('div');
                    navContainer.className = 'sidebar-nav-group';
                    
                    navItems.forEach(nav => {
                        const tabId = `${plugin.id}:${nav.id}`;
                        const isActive = this.activeTabId === tabId;
                        
                        const item = document.createElement('div');
                        item.className = `sidebar-item ${isActive ? 'active' : ''}`;
                        item.style.paddingLeft = '30px';
                        item.style.fontSize = '0.95em';
                        item.textContent = nav.label;
                        
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.openTab(plugin, nav);
                        });
                        navContainer.appendChild(item);
                    });
                    container.appendChild(navContainer);
                }
            }
        });
    }

    openTab(plugin, navItem) {
        const tabId = `${plugin.id}:${navItem.id}`;
        
        // Check if exists
        const existing = this.openTabs.find(t => t.id === tabId);
        if (existing) {
            this.activateTab(tabId);
            return;
        }

        // Create new tab
        const newTab = {
            id: tabId,
            pluginId: plugin.id,
            navId: navItem.id,
            label: navItem.label,
            plugin: plugin,
            container: null // Will be created in renderContent
        };
        
        this.openTabs.push(newTab);
        this.activateTab(tabId);
    }

    activateTab(tabId) {
        this.activeTabId = tabId;
        this.renderTabs();
        this.renderSidebar(); // To update active state in sidebar
        this.renderContent();
    }

    closeTab(tabId) {
        const index = this.openTabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        const tab = this.openTabs[index];
        
        // Remove from array
        this.openTabs.splice(index, 1);

        // If closed active tab, switch to another
        if (this.activeTabId === tabId) {
            if (this.openTabs.length > 0) {
                // Try to go to previous one, or the one at same index
                const newIndex = Math.max(0, index - 1);
                this.activateTab(this.openTabs[newIndex].id);
            } else {
                this.activeTabId = null;
                this.renderTabs();
                this.renderSidebar();
                this.renderContent();
            }
        } else {
            // Just re-render tabs to remove it
            this.renderTabs();
        }
        
        // Cleanup DOM
        if (tab.container) {
            tab.container.remove();
        }
    }

    renderTabs() {
        const container = this.element.querySelector('.panel-tabs-bar');
        if (!container) return;
        container.innerHTML = '';

        this.openTabs.forEach(tab => {
            const isActive = this.activeTabId === tab.id;
            const tabEl = document.createElement('div');
            tabEl.className = `panel-tab ${isActive ? 'active' : ''}`;
            // Inline styles for now, move to CSS later if needed
            Object.assign(tabEl.style, {
                padding: '6px 12px',
                background: isActive ? 'white' : '#e0e0e0',
                border: '1px solid #ddd',
                borderBottom: isActive ? '1px solid white' : '1px solid #ddd',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9em',
                userSelect: 'none',
                marginBottom: '-1px', // overlap border
                minWidth: '100px',
                maxWidth: '200px'
            });

            tabEl.innerHTML = `
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tab.label}</span>
                <span class="close-tab" style="
                    font-size: 10px; width: 14px; height: 14px; display: flex; 
                    align-items: center; justify-content: center; border-radius: 50%;
                    color: #666;
                ">✕</span>
            `;

            tabEl.addEventListener('click', () => this.activateTab(tab.id));
            
            const closeBtn = tabEl.querySelector('.close-tab');
            closeBtn.addEventListener('mouseover', () => { closeBtn.style.background = '#ccc'; closeBtn.style.color = 'black'; });
            closeBtn.addEventListener('mouseout', () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#666'; });
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            });

            container.appendChild(tabEl);
        });
    }

    renderContent() {
        const mainContainer = this.element.querySelector('#panel-main-content');
        if (!mainContainer) return;

        // Hide all existing tab containers
        Array.from(mainContainer.children).forEach(child => {
            child.style.display = 'none';
        });

        if (!this.activeTabId) return;

        const activeTab = this.openTabs.find(t => t.id === this.activeTabId);
        if (!activeTab) return;

        // Check if container already exists
        if (!activeTab.container) {
            activeTab.container = document.createElement('div');
            activeTab.container.className = 'tab-content-container';
            activeTab.container.style.width = '100%';
            activeTab.container.style.height = '100%';
            activeTab.container.style.display = 'flex'; // Miller columns usually need flex
            activeTab.container.style.overflowX = 'auto'; // Horizontal scroll for columns
            mainContainer.appendChild(activeTab.container);

            // Render content into it
            if (activeTab.plugin && activeTab.plugin.renderTab) {
                activeTab.plugin.renderTab(activeTab.navId, activeTab.container);
            } else if (activeTab.plugin && activeTab.plugin.render) {
                // Fallback for plugins not yet updated (though we should update them)
                // This might be tricky as legacy render() clears container
                // We'll set the activeNavId for backward compatibility and hope for best
                if (activeTab.plugin.setActiveNav) activeTab.plugin.setActiveNav(activeTab.navId);
                activeTab.plugin.render(activeTab.container);
            }
        }

        // Show active container
        activeTab.container.style.display = 'flex';
    }
}
