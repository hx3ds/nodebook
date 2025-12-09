export class PanelManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.element = null;
        this.plugins = [];
        this.activePlugin = null;
        this.isVisible = false;
        this.isSidebarCollapsed = false;
    }

    init() {
        this.element = document.getElementById(this.containerId);
        if (!this.element) return;
        this.renderLayout();
    }

    registerPlugin(plugin) {
        this.plugins.push(plugin);
        // Default to first plugin
        if (!this.activePlugin) {
            this.activatePlugin(plugin);
        }
    }

    activatePlugin(plugin) {
        this.activePlugin = plugin;
        this.renderSidebar();
        // Render content logic is delegated to the plugin now, 
        // but we might need to initialize its default view
        if (plugin.onActivate) plugin.onActivate();
        this.renderContent();
    }

    toggleVisibility(show) {
        this.isVisible = show;
        if (this.element) {
            this.element.style.display = show ? 'flex' : 'none';
        }
    }

    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        const sidebar = this.element.querySelector('.panel-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed', this.isSidebarCollapsed);
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
                <div class="panel-main" id="panel-main-content">
                    <!-- Miller Columns Rendered Here -->
                </div>
            </div>
        `;
        
        // Ensure container styles
        Object.assign(this.element.style, {
            display: this.isVisible ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'transparent'
        });

        // Event Listeners
        // this.element.querySelector('#sidebar-toggle').addEventListener('click', () => this.toggleSidebar());

        // Close on outside click
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.toggleVisibility(false);
            }
        });

        this.renderSidebar();
        if (this.activePlugin) {
            this.renderContent();
        }
    }

    renderSidebar() {
        const container = this.element.querySelector('.sidebar-content');
        if (!container) return;
        container.innerHTML = '';

        // If we have multiple plugins, we might list them as "Favorites"
        // But if we have one, we just show its navigation items
        
        if (this.plugins.length > 1) {
            const groupTitle = document.createElement('div');
            groupTitle.className = 'sidebar-group-title';
            groupTitle.textContent = 'Plugins';
            container.appendChild(groupTitle);

            this.plugins.forEach(plugin => {
                const item = document.createElement('div');
                item.className = `sidebar-item ${this.activePlugin === plugin ? 'active' : ''}`;
                item.textContent = plugin.name;
                item.addEventListener('click', () => this.activatePlugin(plugin));
                container.appendChild(item);
            });
        }

        // Render Active Plugin's Navigation Items
        if (this.activePlugin && this.activePlugin.getNavigationItems) {
            const navItems = this.activePlugin.getNavigationItems();
            
            if (navItems.length > 0) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'sidebar-group-title';
                groupTitle.textContent = this.activePlugin.name; // e.g. "Cloudflare"
                container.appendChild(groupTitle);

                navItems.forEach(nav => {
                    const item = document.createElement('div');
                    item.className = `sidebar-item ${this.activePlugin.activeNavId === nav.id ? 'active' : ''}`;
                    item.textContent = nav.label;
                    item.addEventListener('click', () => {
                        this.activePlugin.setActiveNav(nav.id);
                        this.renderSidebar(); // Update active state
                        this.renderContent();
                    });
                    container.appendChild(item);
                });
            }
        }
    }

    renderContent() {
        const container = this.element.querySelector('#panel-main-content');
        if (!container || !this.activePlugin) return;

        // The plugin is responsible for rendering the columns into this container
        this.activePlugin.render(container);
    }
}
