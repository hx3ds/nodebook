// File Explorer Module
import { dialog } from './dialog.js';
import { mesh } from './mesh.js';

const ICONS = {
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>',
    arrowDown: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>',
    folder: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>', 
    folderOpen: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h4.5c.625 0 1.25.196 1.768.558l.864.654c.518.362 1.142.558 1.768.558H19.5A2.25 2.25 0 0121.75 6v3.776" /></svg>',
    file: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>',
    json: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>',
    globe: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.546-3.1 1.487-4.305" /></svg>'
};

export const explorer = {
    rootPath: null,
    currentFilePath: null,
    expandedFolders: new Set(),
    saveDebounceTimer: null,
    isCreatingSnapshot: false,
    snapshotModalListenersAttached: false,
    hideDotItems: true,
    
    async init() {
        const openFolderBtn = document.getElementById('openFolderBtn');
        const snapshotBtn = document.getElementById('snapshotBtn');
        const snapshotHistoryBtn = document.getElementById('snapshotHistoryBtn');
        const newFileBtn = document.getElementById('newFileBtn');
        const newFolderBtn = document.getElementById('newFolderBtn');
        const fileMenuOpen = document.getElementById('fileMenuOpen');
        const fileMenuRename = document.getElementById('fileMenuRename');
        const fileMenuDelete = document.getElementById('fileMenuDelete');
        const fileTree = document.getElementById('fileTree');
            
        if (openFolderBtn) {
            openFolderBtn.addEventListener('click', () => {
                this.openFolder();
            });
        }
        if (snapshotBtn) {
            snapshotBtn.addEventListener('click', () => {
                this.createSnapshot();
            });
        }
        if (snapshotHistoryBtn) {
            snapshotHistoryBtn.addEventListener('click', () => {
                this.openSnapshotHistory();
            });
        }
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => {
                this.createNewFile();
            });
        }
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                this.createNewFolder();
            });
        }
        
        // Initialize file tree drag-and-drop
        if (fileTree) {
            fileTree.addEventListener('dragover', (e) => this.handleContainerDragOver(e));
            fileTree.addEventListener('dragleave', (e) => this.handleContainerDragLeave(e));
            fileTree.addEventListener('drop', (e) => this.handleContainerDrop(e));
        }
        
        // Initialize global click listener to close context menu
        document.addEventListener('click', (e) => {
            const fileMenu = document.getElementById('fileContextMenu');
            if (fileMenu && !fileMenu.contains(e.target)) {
                if (fileMenu.style.display !== 'none') {
                    fileMenu.style.display = 'none';
                    // Clear selection when menu is closed
                    document.querySelectorAll('.tree-item-header.selected').forEach(el => {
                        el.classList.remove('selected');
                    });
                    this.selectedItem = null;
                }
            }
        });
        
        // Initialize sidebar context menu
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.addEventListener('contextmenu', (e) => {
                // Check if we clicked on a tree item header or its children
                const treeItem = e.target.closest('.tree-item-header');
                if (!treeItem) {
                    e.preventDefault();
                    this.handleSidebarContextMenu(e);
                }
            });
        }
        
        if (fileMenuOpen) {
            fileMenuOpen.addEventListener('click', () => this.openSelectedFile());
        }
        if (fileMenuRename) {
            fileMenuRename.addEventListener('click', () => this.renameSelectedFile());
        }
        if (fileMenuDelete) {
            fileMenuDelete.addEventListener('click', () => this.deleteSelectedFile());
        }
        
        const fileMenuNewFile = document.getElementById('fileMenuNewFile');
        if (fileMenuNewFile) {
            fileMenuNewFile.addEventListener('click', () => {
                this.createNewFile();
                document.getElementById('fileContextMenu').style.display = 'none';
            });
        }

        const fileMenuNewFolder = document.getElementById('fileMenuNewFolder');
        if (fileMenuNewFolder) {
            fileMenuNewFolder.addEventListener('click', () => {
                this.createNewFolder();
                document.getElementById('fileContextMenu').style.display = 'none';
            });
        }
        
        const fileMenuHideSidebar = document.getElementById('fileMenuHideSidebar');
        if (fileMenuHideSidebar) {
            fileMenuHideSidebar.addEventListener('click', () => {
                if (explorer.room && explorer.room.toggleSidebar) {
                    explorer.room.toggleSidebar();
                }
                document.getElementById('fileContextMenu').style.display = 'none';
                // Clear selection
                document.querySelectorAll('.tree-item-header.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                this.selectedItem = null;
            });
        }
        
        // Initialize sidebar resize handler
        this.setupSidebarResizer();
        this.setupSnapshotHistoryModal();
        
        // Restore sidebar collapsed state
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            const sidebarContainer = document.getElementById('sidebarContainer');
            if (sidebarContainer) {
                sidebarContainer.classList.add('collapsed');
            }
        }
        
        // Restore last opened folder and file
        const lastFolder = localStorage.getItem('lastOpenedFolder');
        if (lastFolder && window.electronAPI) {
            const exists = await window.electronAPI.pathExists(lastFolder);
            if (exists) {
                this.rootPath = lastFolder;
                await this.refreshFileTree();
                
                // Load last opened file
                const lastFile = localStorage.getItem('lastOpenedFile');
                if (lastFile) {
                    // Check if mesh file or local file
                    if (mesh.isMeshPath(lastFile)) {
                         await this.openFile(lastFile);
                    } else {
                        const fileExists = await window.electronAPI.pathExists(lastFile);
                        if (fileExists) {
                            await this.openFile(lastFile);
                        }
                    }
                }
            }
        }

        explorer.room.onStateChanged = (immediate) => {
            if (explorer.currentFilePath) {
                explorer.saveCurrentFile(immediate);
            }
        };
    },

    setupSnapshotHistoryModal() {
        if (this.snapshotModalListenersAttached) return;

        const dialogEl = document.getElementById('snapshotHistoryDialog');
        const overlayEl = document.getElementById('snapshotHistoryDialogOverlay');
        const closeBtn = document.getElementById('snapshotHistoryDialogClose');
        const applyBtn = document.getElementById('snapshotMaxApplyBtn');

        if (!dialogEl || !overlayEl || !closeBtn) return;

        const hide = () => {
            dialogEl.style.display = 'none';
        };

        closeBtn.addEventListener('click', hide);
        overlayEl.addEventListener('click', hide);
        document.addEventListener('keydown', (e) => {
            if (dialogEl.style.display !== 'flex') return;
            if (e.key === 'Escape') hide();
        });

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySnapshotMaxSetting());
        }

        this.snapshotModalListenersAttached = true;
    },

    async createSnapshot() {
        if (!window.electronAPI || !window.electronAPI.createSnapshot) {
            alert('Snapshots are only available in the desktop application');
            return;
        }

        if (!this.rootPath || mesh.isMeshPath(this.rootPath)) {
            alert('Please open a local folder first');
            return;
        }

        if (this.isCreatingSnapshot) return;

        const label = await dialog.prompt('Snapshot name:', '', 'Create Snapshot');
        if (label === null) return;

        this.isCreatingSnapshot = true;
        const snapshotBtn = document.getElementById('snapshotBtn');
        if (snapshotBtn) {
            snapshotBtn.disabled = true;
            snapshotBtn.style.opacity = '0.6';
        }

        try {
            const snapshot = await window.electronAPI.createSnapshot(this.rootPath);
            if (snapshot && snapshot.id && window.electronAPI.updateSnapshot) {
                const trimmed = (label || '').trim();
                if (trimmed) {
                    await window.electronAPI.updateSnapshot(this.rootPath, snapshot.id, { label: trimmed });
                }
            }
            alert('Snapshot created');
        } catch (error) {
            console.error('Error creating snapshot:', error);
            alert('Failed to create snapshot: ' + (error && error.message ? error.message : 'Unknown error'));
        } finally {
            this.isCreatingSnapshot = false;
            if (snapshotBtn) {
                snapshotBtn.disabled = false;
                snapshotBtn.style.opacity = '';
            }
        }
    },

    async openSnapshotHistory() {
        if (!window.electronAPI || !window.electronAPI.listSnapshots) {
            alert('Snapshots are only available in the desktop application');
            return;
        }

        if (!this.rootPath || mesh.isMeshPath(this.rootPath)) {
            alert('Please open a local folder first');
            return;
        }

        const dialogEl = document.getElementById('snapshotHistoryDialog');
        const metaEl = document.getElementById('snapshotHistoryMeta');
        if (!dialogEl) return;

        if (metaEl) metaEl.textContent = this.rootPath;
        dialogEl.style.display = 'flex';

        await this.loadSnapshotMaxSetting();
        await this.refreshSnapshotHistoryList();
    },

    async loadSnapshotMaxSetting() {
        const input = document.getElementById('snapshotMaxInput');
        if (!input) return;

        if (!window.electronAPI || !window.electronAPI.getSnapshotConfig) return;

        try {
            const config = await window.electronAPI.getSnapshotConfig(this.rootPath);
            if (config && Number.isFinite(config.maxSnapshots)) {
                input.value = String(config.maxSnapshots);
            }
        } catch (e) {
            console.error('Error loading snapshot config:', e);
        }
    },

    async applySnapshotMaxSetting() {
        const input = document.getElementById('snapshotMaxInput');
        const applyBtn = document.getElementById('snapshotMaxApplyBtn');
        if (!input) return;

        const parsed = parseInt(input.value, 10);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
            alert('Max snapshots must be between 1 and 500');
            return;
        }

        if (!window.electronAPI || !window.electronAPI.setSnapshotConfig) return;

        if (applyBtn) {
            applyBtn.disabled = true;
            applyBtn.style.opacity = '0.7';
        }

        try {
            await window.electronAPI.setSnapshotConfig(this.rootPath, { maxSnapshots: parsed });
            await this.refreshSnapshotHistoryList();
        } catch (e) {
            console.error('Error saving snapshot config:', e);
            alert('Failed to save max snapshots: ' + (e && e.message ? e.message : 'Unknown error'));
        } finally {
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.style.opacity = '';
            }
        }
    },

    formatSnapshotTime(ts) {
        const d = new Date(ts);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString();
    },

    async refreshSnapshotHistoryList() {
        const listEl = document.getElementById('snapshotHistoryList');
        if (!listEl) return;

        listEl.innerHTML = '';

        let snapshots = [];
        try {
            snapshots = await window.electronAPI.listSnapshots(this.rootPath);
        } catch (e) {
            console.error('Error listing snapshots:', e);
            const row = document.createElement('div');
            row.className = 'snapshot-row';
            row.textContent = 'Failed to load snapshots';
            listEl.appendChild(row);
            return;
        }

        if (!snapshots || snapshots.length === 0) {
            const row = document.createElement('div');
            row.className = 'snapshot-row';
            row.textContent = 'No snapshots yet';
            listEl.appendChild(row);
            return;
        }

        for (const snap of snapshots) {
            const row = document.createElement('div');
            row.className = 'snapshot-row';

            const left = document.createElement('div');
            left.className = 'snapshot-row-left';

            const title = document.createElement('div');
            title.className = 'snapshot-row-title';
            title.textContent = snap.label && snap.label.trim() ? snap.label : (snap.folderName ? snap.folderName : 'Snapshot');

            const subtitle = document.createElement('div');
            subtitle.className = 'snapshot-row-subtitle';
            subtitle.textContent = this.formatSnapshotTime(snap.createdAt);

            left.appendChild(title);
            left.appendChild(subtitle);

            const actions = document.createElement('div');
            actions.className = 'snapshot-row-actions';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'snapshot-action-btn';
            renameBtn.textContent = 'Rename';
            renameBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const next = await dialog.prompt('Snapshot name:', snap.label || '', 'Rename Snapshot');
                if (next === null) return;
                const trimmed = (next || '').trim();
                try {
                    await window.electronAPI.updateSnapshot(this.rootPath, snap.id, { label: trimmed });
                    await this.refreshSnapshotHistoryList();
                } catch (err) {
                    console.error('Rename snapshot failed:', err);
                    alert('Failed to rename snapshot: ' + (err && err.message ? err.message : 'Unknown error'));
                }
            });

            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'snapshot-action-btn';
            restoreBtn.textContent = 'Restore';
            restoreBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = await dialog.confirm('Restore this snapshot into a new folder next to the current folder?', 'Restore Snapshot');
                if (!ok) return;
                try {
                    const result = await window.electronAPI.restoreSnapshot(this.rootPath, snap.id);
                    if (result && result.restoredPath) {
                        alert('Restored to: ' + result.restoredPath);
                    } else {
                        alert('Snapshot restored');
                    }
                } catch (err) {
                    console.error('Restore snapshot failed:', err);
                    alert('Failed to restore snapshot: ' + (err && err.message ? err.message : 'Unknown error'));
                }
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'snapshot-action-btn snapshot-action-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = await dialog.confirm('Delete this snapshot? This cannot be undone.', 'Delete Snapshot');
                if (!ok) return;
                try {
                    await window.electronAPI.deleteSnapshot(this.rootPath, snap.id);
                    await this.refreshSnapshotHistoryList();
                } catch (err) {
                    console.error('Delete snapshot failed:', err);
                    alert('Failed to delete snapshot: ' + (err && err.message ? err.message : 'Unknown error'));
                }
            });

            actions.appendChild(renameBtn);
            actions.appendChild(restoreBtn);
            actions.appendChild(deleteBtn);

            row.appendChild(left);
            row.appendChild(actions);
            listEl.appendChild(row);
        }
    },
    
    setupSidebarResizer() {
        const sidebarContainer = document.getElementById('sidebarContainer');
        const handle = document.getElementById('sidebarResizer');
        
        if (!sidebarContainer || !handle) return;
        
        // Restore width
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
        }
        
        let isResizing = false;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            let newWidth = e.clientX;
            
            // Constraints
            if (newWidth < 200) newWidth = 200;
            if (newWidth > 500) newWidth = 500;
            
            document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                const width = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
                localStorage.setItem('sidebarWidth', parseInt(width));
            }
        });
    },

    async openFolder() {
        if (!window.electronAPI) {
            alert('File system access is only available in Electron');
            return;
        }
        
        try {
            const result = await window.electronAPI.showOpenDialog({
                properties: ['openDirectory']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                this.rootPath = result.filePaths[0];
                localStorage.setItem('lastOpenedFolder', this.rootPath);
                await this.refreshFileTree();
            }
        } catch (error) {
            console.error('Error opening folder:', error);
            alert('Failed to open folder');
        }
    },
    
    async refreshFileTree() {
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';
        
        // Render local file system root
        if (this.rootPath) {
            document.getElementById('currentFolderPath').textContent = this.rootPath;
            
            // Expand root by default
            this.expandedFolders.add(this.rootPath);
            
            // Extract folder name from path
            const separator = this.rootPath.includes('\\') ? '\\' : '/';
            let folderName = this.rootPath.split(separator).pop();
            if (!folderName) folderName = this.rootPath; 

            const rootItem = {
                name: folderName,
                path: this.rootPath,
                isDirectory: true
            };

            try {
                const rootEl = this.createTreeItem(rootItem, 0);
                const header = rootEl.querySelector('.tree-item-header');
                if (header) {
                    header.draggable = false;
                    header.classList.add('root-folder');
                }
                fileTree.appendChild(rootEl);
            } catch (error) {
                console.error('Error refreshing file tree:', error);
            }
        }
        
        // Render Mesh network root
        this.renderMeshRoot(fileTree);
    },
    
    renderMeshRoot(container) {
        const meshRoot = {
            name: 'Mesh Network',
            path: 'mesh://',
            isDirectory: true
        };
        const el = this.createTreeItem(meshRoot, 0);
        // Set custom globe icon for Mesh root
        const icon = el.querySelector('.tree-item-icon');
        if(icon) icon.innerHTML = ICONS.globe;
        
        container.appendChild(el);
    },

    shouldHideItem(item) {
        if (!this.hideDotItems) return false;
        const name = item && typeof item.name === 'string' ? item.name : '';
        return name.startsWith('.');
    },

    async renderDirectory(dirPath, container, level) {
        if (mesh.isMeshPath(dirPath)) {
            return this.renderMeshDirectory(dirPath, container, level);
        }

        if (!window.electronAPI) return;
        
        try {
            const items = await window.electronAPI.readDirectory(dirPath);
            
            // Sort items: directories first, then files
            items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            
            for (const item of items) {
                if (this.shouldHideItem(item)) continue;
                const itemEl = this.createTreeItem(item, level);
                container.appendChild(itemEl);
            }
        } catch (error) {
            console.error('Error rendering directory:', error);
        }
    },
    
    async renderMeshDirectory(path, container, level) {
        try {
            const items = await mesh.readDirectory(path) || [];
            
            items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            
            for (const item of items) {
                if (this.shouldHideItem(item)) continue;
                const itemEl = this.createTreeItem(item, level);
                container.appendChild(itemEl);
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div style="padding-left:${level*12+10}px; color:red; font-size: 0.9em;">Error loading mesh</div>`;
        }
    },
    
    // Create DOM element for tree item
    createTreeItem(item, level) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';

        // Header (visible row)
        const headerDiv = document.createElement('div');
        headerDiv.className = 'tree-item-header';
        headerDiv.style.paddingLeft = (level * 12 + 10) + 'px';
        headerDiv.dataset.path = item.path;
        headerDiv.dataset.type = item.isDirectory ? 'folder' : 'file';
        headerDiv.draggable = true;
        
        headerDiv.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
        headerDiv.addEventListener('dragover', (e) => this.handleDragOver(e, item, headerDiv));
        headerDiv.addEventListener('dragleave', (e) => this.handleDragLeave(e, headerDiv));
        headerDiv.addEventListener('drop', (e) => this.handleDrop(e, item));
        
        // Expand/Collapse arrow
        const expandSpan = document.createElement('span');
        expandSpan.className = 'tree-item-expand';
        if (item.isDirectory) {
            const isExpanded = this.expandedFolders.has(item.path);
            expandSpan.innerHTML = isExpanded ? ICONS.arrowDown : ICONS.arrowRight;
            if (isExpanded) expandSpan.classList.add('expanded');
        } else {
            expandSpan.classList.add('no-children');
        }
        
        // File/Folder Icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'tree-item-icon';
        if (item.isDirectory) {
            const isExpanded = this.expandedFolders.has(item.path);
            iconSpan.innerHTML = isExpanded ? ICONS.folderOpen : ICONS.folder;
        } else if (item.name.endsWith('.json')) {
            iconSpan.innerHTML = ICONS.json;
        } else {
            iconSpan.innerHTML = ICONS.file;
        }
        
        // Label
        const labelSpan = document.createElement('span');
        labelSpan.className = 'tree-item-label';
        labelSpan.textContent = item.name;
        
        headerDiv.appendChild(expandSpan);
        headerDiv.appendChild(iconSpan);
        headerDiv.appendChild(labelSpan);
        
        headerDiv.addEventListener('click', (e) => this.handleItemClick(item, nodeDiv, level, e));
        headerDiv.addEventListener('dblclick', (e) => this.handleItemDoubleClick(item, e));
        headerDiv.addEventListener('contextmenu', (e) => this.handleItemContextMenu(item, headerDiv, e));
        
        nodeDiv.appendChild(headerDiv);

        // Render children if expanded
        if (item.isDirectory && this.expandedFolders.has(item.path)) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-item-children';
            nodeDiv.appendChild(childrenDiv);
            this.renderDirectory(item.path, childrenDiv, level + 1);
        }
        
        if (this.currentFilePath === item.path) {
            headerDiv.classList.add('active-file');
        }
        
        return nodeDiv;
    },
    
    async handleItemClick(item, nodeDiv, level, e) {
        if (item.isDirectory) {
            const expandSpan = nodeDiv.querySelector('.tree-item-expand');
            const iconSpan = nodeDiv.querySelector('.tree-item-icon');
            const isExpanded = this.expandedFolders.has(item.path);
            
            if (isExpanded) {
                this.expandedFolders.delete(item.path);
                expandSpan.innerHTML = ICONS.arrowRight;
                expandSpan.classList.remove('expanded');
                iconSpan.innerHTML = ICONS.folder;
                
                // Reset to generic folder icon unless it's mesh root (which has custom icon handled in createTreeItem, but here we override)
                if (item.path === 'mesh://') iconSpan.innerHTML = ICONS.globe;

                const childrenDiv = nodeDiv.querySelector('.tree-item-children');
                if (childrenDiv) {
                    childrenDiv.remove();
                }
            } else {
                this.expandedFolders.add(item.path);
                expandSpan.innerHTML = ICONS.arrowDown;
                expandSpan.classList.add('expanded');
                iconSpan.innerHTML = ICONS.folderOpen;
                
                if (item.path === 'mesh://') iconSpan.innerHTML = ICONS.globe;

                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-item-children';
                nodeDiv.appendChild(childrenDiv);
                await this.renderDirectory(item.path, childrenDiv, level + 1);
            }
        }
    },
    
    async handleItemDoubleClick(item, e) {
        e.stopPropagation();
        
        if (!item.isDirectory) {
            await this.openFile(item.path);
        }
    },
    
    handleItemContextMenu(item, headerDiv, e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Deselect previously selected items
        document.querySelectorAll('.tree-item-header.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        headerDiv.classList.add('selected');
        this.selectedItem = item;
        
        const menu = document.getElementById('fileContextMenu');
        
        // Show file context menu options
        document.getElementById('fileMenuOpen').style.display = 'flex';
        
        // Configure menu for directory vs file
        if (item.isDirectory) {
            // Mesh root is read-only for file creation
            if (item.path === 'mesh://') {
                document.getElementById('fileMenuNewFile').style.display = 'none';
                document.getElementById('fileMenuNewFolder').style.display = 'none';
            } else {
                document.getElementById('fileMenuNewFile').style.display = 'flex';
                document.getElementById('fileMenuNewFolder').style.display = 'flex';
            }
        } else {
            document.getElementById('fileMenuNewFile').style.display = 'none';
            document.getElementById('fileMenuNewFolder').style.display = 'none';
        }

        // Determine edit permissions
        let allowEdit = true;

        // Restrict editing for roots
        if (this.rootPath && item.path === this.rootPath) {
            allowEdit = false;
        }

        if (mesh.isMeshPath(item.path)) {
            const parts = mesh.getSubPath(item.path).split('/').filter(p => p);
            // parts=[] (mesh root) or parts=['user'] (user root)
            if (parts.length < 2) {
                allowEdit = false;
            }
        }

        if (allowEdit) {
            document.getElementById('fileMenuRename').style.display = 'flex';
            document.getElementById('fileMenuDelete').style.display = 'flex';
        } else {
            document.getElementById('fileMenuRename').style.display = 'none';
            document.getElementById('fileMenuDelete').style.display = 'none';
        }

        this.updateFileContextMenuDividers(menu);
        
        if (explorer.room && explorer.room.adjustMenuPosition) {
            explorer.room.adjustMenuPosition(menu, e.clientX, e.clientY);
        } else {
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        }
    },
    
    handleSidebarContextMenu(e) {
        // Deselect any selected items
        document.querySelectorAll('.tree-item-header.selected').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedItem = null;
        
        const menu = document.getElementById('fileContextMenu');
        
        // Hide file-specific buttons
        document.getElementById('fileMenuNewFile').style.display = 'none';
        document.getElementById('fileMenuNewFolder').style.display = 'none';
        document.getElementById('fileMenuOpen').style.display = 'none';
        document.getElementById('fileMenuRename').style.display = 'none';
        document.getElementById('fileMenuDelete').style.display = 'none';
        this.updateFileContextMenuDividers(menu);
        
        if (explorer.room && explorer.room.adjustMenuPosition) {
            explorer.room.adjustMenuPosition(menu, e.clientX, e.clientY);
        } else {
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        }
    },

    isContextMenuItemVisible(el) {
        if (!el) return false;
        return getComputedStyle(el).display !== 'none';
    },

    updateFileContextMenuDividers(menu) {
        if (!menu) return;

        const children = Array.from(menu.children);

        const isActionable = (el) => {
            if (!el) return false;
            if (el.tagName === 'BUTTON') return true;
            return el.classList.contains('menu-item-with-submenu');
        };

        for (const el of children) {
            if (!el.classList.contains('menu-divider')) continue;

            let hasPrev = false;
            for (let i = children.indexOf(el) - 1; i >= 0; i--) {
                const prev = children[i];
                if (!isActionable(prev)) continue;
                if (this.isContextMenuItemVisible(prev)) {
                    hasPrev = true;
                    break;
                }
            }

            let hasNext = false;
            for (let i = children.indexOf(el) + 1; i < children.length; i++) {
                const next = children[i];
                if (!isActionable(next)) continue;
                if (this.isContextMenuItemVisible(next)) {
                    hasNext = true;
                    break;
                }
            }

            el.style.display = (hasPrev && hasNext) ? 'block' : 'none';
        }
    },
    
    async openFile(filePath) {
        // Save current file if modified before opening new one
        if (this.currentFilePath && explorer.room.isDirty) {
             await this.saveCurrentFile(true);
        }

        if (this.currentFilePath && this.currentFilePath !== filePath && mesh.isMeshPath(this.currentFilePath)) {
            await explorer.room.releaseAllLocksForPath(this.currentFilePath);
        }

        // Load file from Mesh network
        if (mesh.isMeshPath(filePath)) {
            try {
                const content = await mesh.readFile(filePath);
                
                let data;
                try {
                    data = JSON.parse(content);
                } catch (e) {
                    if (!content.trim()) {
                        data = { boxes: [], arrows: [] };
                    } else {
                        console.error('JSON parse error', e);
                        throw new Error('Invalid file format');
                    }
                }
                
                this.currentFilePath = filePath;
                localStorage.setItem('lastOpenedFile', filePath);
                
                this.expandParentFolders(filePath);
                await this.refreshFileTree();
                
                const treeItem = document.querySelector(`[data-path="${filePath}"]`);
                if (treeItem) {
                    treeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                
                explorer.room.loadState(data);
                explorer.room.markClean();
                explorer.room.drawAll(); 
                explorer.room.ensureWebSocketForCurrentFile();
                await explorer.room.fetchInitialLocks();
            } catch(e) {
                alert(e.message);
            }
            return;
        }

        if (!window.electronAPI) return;
        
        try {
            const content = await window.electronAPI.readFile(filePath);
            
            let data;
            try {
                data = JSON.parse(content);
            } catch (e) {
                if (!content.trim()) {
                    data = { boxes: [], arrows: [] };
                } else {
                    // Handle empty or invalid JSON
                    console.error('JSON parse error, attempting to load as empty/raw', e);
                    throw new Error('Invalid file format');
                }
            }
            
            this.currentFilePath = filePath;
            localStorage.setItem('lastOpenedFile', filePath);
            
            this.expandParentFolders(filePath);
            await this.refreshFileTree();
            
            const treeItem = document.querySelector(`[data-path="${filePath}"]`);
            if (treeItem) {
                treeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            explorer.room.loadState(data);
            explorer.room.markClean();
            explorer.room.drawAll();
            explorer.room.ensureWebSocketForCurrentFile();
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Failed to open file: ' + error.message);
        }
    },
    
    expandParentFolders(filePath) {
        if (mesh.isMeshPath(filePath)) {
             const parts = mesh.getSubPath(filePath).split('/');
             // mesh://user/file -> parts=[user, file]
             if (parts.length > 1) {
                 this.expandedFolders.add('mesh://');
                 this.expandedFolders.add('mesh://' + parts[0]);
             }
             return;
        }

        if (!this.rootPath) return;
        
        const dirPath = filePath.substring(0, filePath.lastIndexOf(window.electronAPI ? '\\' : '/'));
        
        let currentPath = this.rootPath;
        const pathParts = dirPath.replace(this.rootPath, '').split(/[\\\/]/).filter(p => p);
        
        for (const part of pathParts) {
            currentPath = currentPath + (window.electronAPI ? '\\' : '/') + part;
            this.expandedFolders.add(currentPath);
        }
    },
    
    async saveCurrentFile(immediate = false) {
        if (!this.currentFilePath) return;

        if (mesh.isMeshPath(this.currentFilePath)) {
            // Clear existing timer if any
            if (this.saveDebounceTimer) {
                clearTimeout(this.saveDebounceTimer);
                this.saveDebounceTimer = null;
            }

            const saveAction = async () => {
                try {
                    const state = explorer.room.serializeState();
                    const content = JSON.stringify(state, null, 2);
                    
                    await mesh.writeFile(this.currentFilePath, content);
                    
                    // Only mark clean if state hasn't changed during save
                    const currentState = JSON.stringify(explorer.room.serializeState(), null, 2);
                    if (currentState === content) {
                        explorer.room.markClean();
                    }
                    this.saveDebounceTimer = null;
                } catch(e) {
                     console.error('Save failed:', e);
                }
            };

            if (immediate) {
                await saveAction();
            } else {
                this.saveDebounceTimer = setTimeout(saveAction, 1000);
            }
            return;
        }
        
        if (!window.electronAPI) return;
        
        try {
            const state = explorer.room.serializeState();
            const content = JSON.stringify(state, null, 2);
            await window.electronAPI.writeFile(this.currentFilePath, content);
            explorer.room.markClean();
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Failed to save file: ' + error.message);
        }
    },

    async createNewFile() {
        let targetPath = this.rootPath;
        // Default to selected directory
        if (this.selectedItem && this.selectedItem.isDirectory) {
            targetPath = this.selectedItem.path;
        }

        // Handle Mesh File
        if (targetPath && mesh.isMeshPath(targetPath)) {
            const fileName = await dialog.prompt('Enter file name:', 'untitled.json', 'New File');
            if (!fileName) return;
            const finalName = fileName.endsWith('.json') ? fileName : fileName + '.json';
            
            const separator = '/';
            const newPath = targetPath.endsWith(separator) ? targetPath + finalName : targetPath + separator + finalName;
            
            try {
                const emptyState = { boxes: [], arrows: [] };
                const content = JSON.stringify(emptyState, null, 2);
                
                await mesh.writeFile(newPath, content);
                
                await this.refreshFileTree();
                await this.openFile(newPath);
            } catch (e) {
                console.error(e);
                alert('Failed to create file: ' + e.message);
            }
            return;
        }

        if (this.rootPath && window.electronAPI) {
            // Local file creation
            const fileName = await dialog.prompt('Enter file name:', 'untitled.json', 'New File');
            if (!fileName) return;
            
            const finalName = fileName.endsWith('.json') ? fileName : fileName + '.json';
            
            try {
                const emptyState = { boxes: [], arrows: [] };
                // Use targetPath to allow creating in subfolders
                const result = await window.electronAPI.createFile(
                    targetPath, 
                    finalName, 
                    JSON.stringify(emptyState, null, 2)
                );
                await this.refreshFileTree();
                if (result.path) {
                    await this.openFile(result.path);
                }
            } catch (error) {
                console.error('Error creating file:', error);
                alert('Failed to create file: ' + error.message);
            }
        } else {
             if (!this.rootPath) alert('Please open a local folder first');
        }
    },
    
    async createNewFolder() {
        let targetPath = this.rootPath;
        // Prioritize selected directory
        if (this.selectedItem && this.selectedItem.isDirectory) {
            targetPath = this.selectedItem.path;
        }

        // Handle Mesh Folder
        if (targetPath && mesh.isMeshPath(targetPath)) {
            const folderName = await dialog.prompt('Enter folder name:', 'new-folder', 'New Folder');
            if (!folderName) return;
            
            const separator = '/';
            const newPath = targetPath.endsWith(separator) ? targetPath + folderName : targetPath + separator + folderName;
            
            try {
                await mesh.createDirectory(newPath);
                
                await this.refreshFileTree();
            } catch (e) {
                console.error(e);
                alert('Failed to create folder: ' + e.message);
            }
            return;
        }

        if (this.rootPath && window.electronAPI) {
            const folderName = await dialog.prompt('Enter folder name:', 'new-folder', 'New Folder');
            if (!folderName) return;
            
            try {
                await window.electronAPI.createDirectory(targetPath, folderName);
                await this.refreshFileTree();
            } catch (error) {
                console.error('Error creating folder:', error);
                alert('Failed to create folder: ' + error.message);
            }
        } else {
            if (!this.rootPath) alert('Please open a local folder first');
        }
    },
    
    openSelectedFile() {
        if (this.selectedItem && !this.selectedItem.isDirectory) {
            this.openFile(this.selectedItem.path);
        }
        document.getElementById('fileContextMenu').style.display = 'none';
    },
    
    async renameSelectedFile() {
        if (!this.selectedItem) return;
        
        const oldPath = this.selectedItem.path;
        const oldName = this.selectedItem.name;
        const newName = await dialog.prompt('Enter new name:', oldName, 'Rename');
        
        if (!newName || newName === oldName) {
            document.getElementById('fileContextMenu').style.display = 'none';
            // Clear selection
            document.querySelectorAll('.tree-item-header.selected').forEach(el => {
                el.classList.remove('selected');
            });
            this.selectedItem = null;
            return;
        }

        // Handle Mesh File Rename
        if (mesh.isMeshPath(oldPath)) {
            const separator = '/';
            const parentPath = oldPath.substring(0, oldPath.lastIndexOf(separator));
            const newPath = parentPath + separator + newName;
            
            try {
                await mesh.renameFile(oldPath, newPath);

                if (this.currentFilePath === oldPath) {
                    this.currentFilePath = newPath;
                    localStorage.setItem('lastOpenedFile', newPath);
                }
                
                await this.refreshFileTree();
            } catch (error) {
                console.error('Error renaming mesh file:', error);
                alert('Failed to rename: ' + error.message);
            }
            
            document.getElementById('fileContextMenu').style.display = 'none';
            return;
        }

        if (!window.electronAPI) return;

        const separator = oldPath.includes('\\') ? '\\' : '/';
        const parentPath = oldPath.substring(0, oldPath.lastIndexOf(separator));
        const newPath = parentPath + separator + newName;
        
        try {
            await window.electronAPI.renamePath(oldPath, newPath);
            
            if (this.currentFilePath === oldPath) {
                this.currentFilePath = newPath;
                localStorage.setItem('lastOpenedFile', newPath);
            }
            
            await this.refreshFileTree();
        } catch (error) {
            console.error('Error renaming:', error);
            alert('Failed to rename: ' + error.message);
        }
        
        document.getElementById('fileContextMenu').style.display = 'none';
    },
    
    async deleteSelectedFile() {
        if (!this.selectedItem) return;
        
        const confirmMsg = this.selectedItem.isDirectory
            ? `Delete folder "${this.selectedItem.name}" and all its contents?`
            : `Delete file "${this.selectedItem.name}"?`;
        
        const confirmed = await dialog.confirm(confirmMsg, 'Delete');
        if (!confirmed) {
            document.getElementById('fileContextMenu').style.display = 'none';
            // Clear selection
            document.querySelectorAll('.tree-item-header.selected').forEach(el => {
                el.classList.remove('selected');
            });
            this.selectedItem = null;
            return;
        }

        // Handle Mesh File Delete
        if (mesh.isMeshPath(this.selectedItem.path)) {
            try {
                await mesh.deletePath(this.selectedItem.path);
                
                if (this.currentFilePath === this.selectedItem.path) {
                    this.currentFilePath = null;
                    localStorage.removeItem('lastOpenedFile');
                    explorer.room.boxes = [];
                    explorer.room.arrows = [];
                    explorer.room.drawAll();
                }
                
                await this.refreshFileTree();
            } catch (error) {
                console.error('Error deleting mesh file:', error);
                alert('Failed to delete: ' + error.message);
            }
            document.getElementById('fileContextMenu').style.display = 'none';
            return;
        }

        if (!window.electronAPI) return;
        
        try {
            await window.electronAPI.deletePath(this.selectedItem.path);
            
            if (this.currentFilePath === this.selectedItem.path) {
                this.currentFilePath = null;
                localStorage.removeItem('lastOpenedFile');
                explorer.room.boxes = [];
                explorer.room.arrows = [];
                explorer.room.drawAll();
            }
            
            await this.refreshFileTree();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete: ' + error.message);
        }
        
        document.getElementById('fileContextMenu').style.display = 'none';
    },

    // Drag and Drop Handlers
    handleDragStart(e, item) {
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation();
    },

    handleDragOver(e, targetItem, targetDiv) {
        e.preventDefault();
        e.stopPropagation();

        targetDiv.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragLeave(e, targetDiv) {
        e.preventDefault();
        e.stopPropagation();
        targetDiv.classList.remove('drag-over');
    },

    async handleDrop(e, targetItem) {
        e.preventDefault();
        e.stopPropagation();
        
        const targetDiv = e.currentTarget; 
        if (targetDiv) targetDiv.classList.remove('drag-over');

        try {
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;
            
            const sourceItem = JSON.parse(data);
            
            // Determine target directory path
            let targetDirPath = targetItem.path;
            
            if (!targetItem.isDirectory) {
                const separator = targetDirPath.includes('\\') ? '\\' : '/';
                targetDirPath = targetDirPath.substring(0, targetDirPath.lastIndexOf(separator));
            }
            
            if (sourceItem.path === targetItem.path) return;
            
            const separator = sourceItem.path.includes('\\') ? '\\' : '/';
            const sourceParent = sourceItem.path.substring(0, sourceItem.path.lastIndexOf(separator));
            
            const normSourceParent = sourceParent.replace(/\\/g, '/');
            const normTargetDir = targetDirPath.replace(/\\/g, '/');
            
            if (normSourceParent === normTargetDir) return;
            
            await this.moveFile(sourceItem, targetDirPath);
        } catch (error) {
            console.error('Drop error:', error);
        }
    },

    handleContainerDragOver(e) {
        e.preventDefault();
        if (!e.target.closest('.tree-node')) {
            document.getElementById('fileTree').classList.add('drag-over-container');
            e.dataTransfer.dropEffect = 'move';
        } else {
            document.getElementById('fileTree').classList.remove('drag-over-container');
        }
    },

    handleContainerDragLeave(e) {
        e.preventDefault();
        const fileTree = document.getElementById('fileTree');
        if (!e.relatedTarget || !fileTree.contains(e.relatedTarget)) {
             fileTree.classList.remove('drag-over-container');
        }
    },

    async handleContainerDrop(e) {
        e.preventDefault();
        document.getElementById('fileTree').classList.remove('drag-over-container');
        
        if (e.target.closest('.tree-item-header')) return;
        if (e.target.closest('.tree-node')) return;
        
        if (!this.rootPath) return;

        try {
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;
            
            let sourceItem;
            try {
                sourceItem = JSON.parse(data);
            } catch (err) {
                return;
            }
            
            if (!sourceItem || !sourceItem.path) return;
            
            const sourcePath = sourceItem.path.replace(/\\/g, '/');
            const rootPath = this.rootPath.replace(/\\/g, '/');
            
            const cleanSourcePath = sourcePath.endsWith('/') ? sourcePath.slice(0, -1) : sourcePath;
            const sourceParent = cleanSourcePath.substring(0, cleanSourcePath.lastIndexOf('/'));
            
            if (sourceParent.toLowerCase() === rootPath.toLowerCase()) {
                return;
            }

            await this.moveFile(sourceItem, this.rootPath);
        } catch (error) {
            console.error('Container drop error:', error);
        }
    },

    async acquireLock(item, releaseItems = []) {
        if (!this.currentFilePath) return { success: true };
        
        // Handle lock acquisition for Mesh files
        if (mesh.isMeshPath(this.currentFilePath)) {
            try {
                // Process Release Items
                if (releaseItems && releaseItems.length > 0) {
                    for (const releaseItem of releaseItems) {
                        const releaseId = releaseItem.id; // Ensure items have IDs
                        if (!releaseId) continue;
                        
                        await mesh.releaseLock(this.currentFilePath, releaseId, explorer.room.userId);
                        releaseItem.acquired = null;
                    }
                }

                if (!item) return { success: true };
                
                // Acquire Lock
                const itemId = item.id;
                if (!itemId) {
                    console.warn('Item has no ID, cannot acquire lock', item);
                    return { success: true }; // Should this fail?
                }

                const res = await mesh.acquireLock(this.currentFilePath, itemId, explorer.room.userId);

                if (res.ok) {
                    item.acquired = explorer.room.userId;
                    return { success: true };
                } else {
                    // Lock acquisition failed (likely held by another user)
                    // We might want to know who has it. 
                    // The current backend just returns 409 Conflict.
                    // To get who has it, we would need to query /locks or update the 409 response.
                    // For now, let's just assume it's locked by someone else.
                    // Ideally, we should fetch the lock info to update the UI.
                    
                    // Optimistic update: we don't know who has it, but we know we don't.
                    // We could poll /locks to find out.
                    return { success: false, acquiredBy: null }; 
                }
                
            } catch (e) {
                console.error('Lock acquisition failed:', e);
                return { success: false, error: e };
            }
        }
        
        return { success: true };
    },

    async moveFile(sourceItem, targetDirPath) {
        // Handle Mesh Move
        if (mesh.isMeshPath(sourceItem.path)) {
            // Ensure target is also mesh
            if (!mesh.isMeshPath(targetDirPath)) {
                alert('Cannot move mesh file to local system directly.');
                return;
            }

            const separator = '/';
            // Ensure targetDirPath does not end with separator
            const cleanTarget = targetDirPath.endsWith(separator) ? targetDirPath.slice(0, -1) : targetDirPath;
            const newPath = cleanTarget + separator + sourceItem.name;

            if (sourceItem.path === newPath) return;

            try {
                await mesh.renameFile(sourceItem.path, newPath);

                if (this.currentFilePath === sourceItem.path) {
                    this.currentFilePath = newPath;
                    localStorage.setItem('lastOpenedFile', newPath);
                }

                await this.refreshFileTree();
            } catch (error) {
                console.error('Move error:', error);
                alert('Failed to move file: ' + error.message);
            }
            return;
        }

        if (!window.electronAPI) return;

        const separator = targetDirPath.includes('\\') ? '\\' : '/';
        const newPath = targetDirPath + separator + sourceItem.name;

        if (sourceItem.path === newPath) return;

        try {
            await window.electronAPI.renamePath(sourceItem.path, newPath);
            
            if (this.currentFilePath === sourceItem.path) {
                this.currentFilePath = newPath;
                localStorage.setItem('lastOpenedFile', newPath);
            }
            
            await this.refreshFileTree();
        } catch (error) {
            console.error('Move error:', error);
            alert('Failed to move file: ' + error.message);
        }
    }
};
