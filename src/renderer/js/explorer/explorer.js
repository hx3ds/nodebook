// File Explorer Module
import { dialog } from './dialog.js';
import { room } from '../room/room.js';

const ICONS = {
    arrowRight: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 4l4 4-4 4z"/></svg>',
    arrowDown: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4z"/></svg>',
    folder: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.17 2L9 3.83 14 3.83C14.55 3.83 15 4.28 15 4.83L15 13.17C15 13.72 14.55 14.17 14 14.17L2 14.17C1.45 14.17 1 13.72 1 13.17L1 2.83C1 2.28 1.45 1.83 2 1.83L7.17 1.83z"/></svg>', 
    folderOpen: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4l-1-1H7L5.5 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/></svg>',
    file: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4.5L10.5 1zM11 5V2.5L13.5 5H11z"/></svg>',
    json: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4.5L10.5 1zM11 5V2.5L13.5 5H11z"/><path d="M5.5 11.5v-1h1v-1h-1v-1h1v-1h-1v-1h2v5h-2z" fill="#fff"/></svg>'
};

export const explorer = {
    rootPath: null,
    currentFilePath: null,
    expandedFolders: new Set(),
    
    async init() {
        const openFolderBtn = document.getElementById('openFolderBtn');
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
        
        // File Tree Drop Zone (Root)
        if (fileTree) {
            fileTree.addEventListener('dragover', (e) => this.handleContainerDragOver(e));
            fileTree.addEventListener('dragleave', (e) => this.handleContainerDragLeave(e));
            fileTree.addEventListener('drop', (e) => this.handleContainerDrop(e));
        }
        
        // File context menu
        document.addEventListener('click', (e) => {
            const fileMenu = document.getElementById('fileContextMenu');
            if (fileMenu && !fileMenu.contains(e.target)) {
                fileMenu.style.display = 'none';
            }
        });
        
        if (fileMenuOpen) {
            fileMenuOpen.addEventListener('click', () => this.openSelectedFile());
        }
        if (fileMenuRename) {
            fileMenuRename.addEventListener('click', () => this.renameSelectedFile());
        }
        if (fileMenuDelete) {
            fileMenuDelete.addEventListener('click', () => this.deleteSelectedFile());
        }
        
        // Sidebar resizer
        this.setupSidebarResizer();
        
        // Load sidebar collapsed state
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.add('collapsed');
        }
        
        // Load last opened folder
        const lastFolder = localStorage.getItem('lastOpenedFolder');
        if (lastFolder && window.electronAPI) {
            const exists = await window.electronAPI.pathExists(lastFolder);
            if (exists) {
                this.rootPath = lastFolder;
                await this.refreshFileTree();
                
                // Load last opened file
                const lastFile = localStorage.getItem('lastOpenedFile');
                if (lastFile) {
                    const fileExists = await window.electronAPI.pathExists(lastFile);
                    if (fileExists) {
                        await this.openFile(lastFile);
                    }
                }
            }
        }

        room.onStateChanged = () => {
            if (explorer.currentFilePath) {
                explorer.saveCurrentFile();
            }
        };
    },
    
    setupSidebarResizer() {
        const sidebar = document.getElementById('sidebar');
        const handle = document.getElementById('sidebarResizeHandle');
        
        if (!sidebar || !handle) return;
        
        // Restore width
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            sidebar.style.width = savedWidth + 'px';
        }
        
        let isResizing = false;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'ew-resize';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const newWidth = e.clientX;
            
            // Constraints
            if (newWidth >= 200 && newWidth <= 500) {
                sidebar.style.width = newWidth + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                localStorage.setItem('sidebarWidth', parseInt(sidebar.style.width));
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
        if (!this.rootPath) return;
        
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';
        
        document.getElementById('currentFolderPath').textContent = this.rootPath;
        
        // Ensure root is expanded by default so content is visible
        this.expandedFolders.add(this.rootPath);
        
        // Derive folder name from path
        const separator = this.rootPath.includes('\\') ? '\\' : '/';
        let folderName = this.rootPath.split(separator).pop();
        if (!folderName) folderName = this.rootPath; // Fallback if split fails or root drive

        // Create a root item representing the opened folder
        const rootItem = {
            name: folderName,
            path: this.rootPath,
            isDirectory: true
        };

        try {
            // Create the root item at level 0
            // createTreeItem will check expandedFolders and call renderDirectory to populate children
            const rootEl = this.createTreeItem(rootItem, 0);
            
            // Disable dragging for the root node itself (optional but good practice)
            const header = rootEl.querySelector('.tree-item-header');
            if (header) {
                header.draggable = false;
                // Add a special class if needed for styling
                header.classList.add('root-folder');
            }

            fileTree.appendChild(rootEl);
        } catch (error) {
            console.error('Error refreshing file tree:', error);
        }
    },
    
    async renderDirectory(dirPath, container, level) {
        if (!window.electronAPI) return;
        
        try {
            const items = await window.electronAPI.readDirectory(dirPath);
            
            // Sort: directories first, then files, alphabetically
            items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            
            for (const item of items) {
                const itemEl = this.createTreeItem(item, level);
                container.appendChild(itemEl);
            }
        } catch (error) {
            console.error('Error rendering directory:', error);
        }
    },
    
    createTreeItem(item, level) {
        // Create wrapper node
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';

        // Create header (the visible row)
        const headerDiv = document.createElement('div');
        headerDiv.className = 'tree-item-header';
        headerDiv.style.paddingLeft = (level * 12 + 10) + 'px';
        headerDiv.dataset.path = item.path;
        headerDiv.dataset.type = item.isDirectory ? 'folder' : 'file';
        headerDiv.draggable = true;
        
        // Drag events
        headerDiv.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
        headerDiv.addEventListener('dragover', (e) => this.handleDragOver(e, item, headerDiv));
        headerDiv.addEventListener('dragleave', (e) => this.handleDragLeave(e, headerDiv));
        headerDiv.addEventListener('drop', (e) => this.handleDrop(e, item));
        
        // Expand arrow for directories
        const expandSpan = document.createElement('span');
        expandSpan.className = 'tree-item-expand';
        if (item.isDirectory) {
            const isExpanded = this.expandedFolders.has(item.path);
            expandSpan.innerHTML = isExpanded ? ICONS.arrowDown : ICONS.arrowRight;
            if (isExpanded) expandSpan.classList.add('expanded');
        } else {
            expandSpan.classList.add('no-children');
        }
        
        // Icon
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
        
        // Event listeners
        headerDiv.addEventListener('click', (e) => this.handleItemClick(item, nodeDiv, level, e));
        headerDiv.addEventListener('dblclick', (e) => this.handleItemDoubleClick(item, e));
        headerDiv.addEventListener('contextmenu', (e) => this.handleItemContextMenu(item, headerDiv, e));
        
        nodeDiv.appendChild(headerDiv);

        // If directory is expanded, render its children
        if (item.isDirectory && this.expandedFolders.has(item.path)) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-item-children';
            nodeDiv.appendChild(childrenDiv);
            this.renderDirectory(item.path, childrenDiv, level + 1);
        }
        
        // Highlight active file
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
                
                const childrenDiv = nodeDiv.querySelector('.tree-item-children');
                if (childrenDiv) {
                    childrenDiv.remove();
                }
            } else {
                this.expandedFolders.add(item.path);
                expandSpan.innerHTML = ICONS.arrowDown;
                expandSpan.classList.add('expanded');
                iconSpan.innerHTML = ICONS.folderOpen;

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
        
        // Remove previous selection
        document.querySelectorAll('.tree-item-header.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        headerDiv.classList.add('selected');
        this.selectedItem = item;
        
        const menu = document.getElementById('fileContextMenu');
        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
    },
    
    async openFile(filePath) {
        if (!window.electronAPI) return;
        
        try {
            const content = await window.electronAPI.readFile(filePath);
            
            let data;
            try {
                data = JSON.parse(content);
            } catch (e) {
                // Not a valid JSON, maybe a newly created empty file or other text file
                // Try to initialize as empty state if empty
                if (!content.trim()) {
                    data = { boxes: [], arrows: [] };
                } else {
                    // Try to parse anyway, or show error?
                    // For now, let's treat non-JSON text as potential "text content" if we were to support it,
                    // but the requirement says "support regardless file name, try parsing it to load".
                    // So if parsing fails, we might just throw or alert.
                    // But maybe user wants to open ANY file and see if it works.
                    // If it fails to parse, we can't loadState.
                    console.error('JSON parse error, attempting to load as empty/raw', e);
                    throw new Error('Invalid file format');
                }
            }
            
            // Set current file path BEFORE refreshing tree so the active-file class gets applied
            this.currentFilePath = filePath;
            localStorage.setItem('lastOpenedFile', filePath);
            
            // Expand parent folders to make file visible
            this.expandParentFolders(filePath);
            await this.refreshFileTree();
            
            // Scroll the active file into view
            const treeItem = document.querySelector(`[data-path="${filePath}"]`);
            if (treeItem) {
                treeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            room.loadState(data);
            room.markClean();
            room.drawAll(); // Full render when loading file
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Failed to open file: ' + error.message);
        }
    },
    
    expandParentFolders(filePath) {
        if (!this.rootPath) return;
        
        // Get directory path
        const dirPath = filePath.substring(0, filePath.lastIndexOf(window.electronAPI ? '\\' : '/'));
        
        // Expand all parent directories
        let currentPath = this.rootPath;
        const pathParts = dirPath.replace(this.rootPath, '').split(/[\\\/]/).filter(p => p);
        
        for (const part of pathParts) {
            currentPath = currentPath + (window.electronAPI ? '\\' : '/') + part;
            this.expandedFolders.add(currentPath);
        }
    },
    
    async saveCurrentFile() {
        if (!this.currentFilePath || !window.electronAPI) return;
        
        try {
            const state = room.serializeState();
            const content = JSON.stringify(state, null, 2);
            await window.electronAPI.writeFile(this.currentFilePath, content);
            room.markClean();
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Failed to save file: ' + error.message);
        }
    },
    
    async createNewFile() {
        if (!this.rootPath || !window.electronAPI) {
            alert('Please open a folder first');
            return;
        }
        
        const fileName = await dialog.prompt('Enter file name:', 'untitled.json', 'New File');
        if (!fileName) return;
        
        const finalName = fileName.endsWith('.json') ? fileName : fileName + '.json';
        
        try {
            const emptyState = { boxes: [], arrows: [] };
            const result = await window.electronAPI.createFile(
                this.rootPath, 
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
    },
    
    async createNewFolder() {
        if (!this.rootPath || !window.electronAPI) {
            alert('Please open a folder first');
            return;
        }
        
        const folderName = await dialog.prompt('Enter folder name:', 'new-folder', 'New Folder');
        if (!folderName) return;
        
        try {
            await window.electronAPI.createDirectory(this.rootPath, folderName);
            await this.refreshFileTree();
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Failed to create folder: ' + error.message);
        }
    },
    
    openSelectedFile() {
        if (this.selectedItem && !this.selectedItem.isDirectory) {
            this.openFile(this.selectedItem.path);
        }
        document.getElementById('fileContextMenu').style.display = 'none';
    },
    
    async renameSelectedFile() {
        if (!this.selectedItem || !window.electronAPI) return;
        
        const oldPath = this.selectedItem.path;
        const oldName = this.selectedItem.name;
        const newName = await dialog.prompt('Enter new name:', oldName, 'Rename');
        
        if (!newName || newName === oldName) {
            document.getElementById('fileContextMenu').style.display = 'none';
            return;
        }
        
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
        if (!this.selectedItem || !window.electronAPI) return;
        
        const confirmMsg = this.selectedItem.isDirectory
            ? `Delete folder "${this.selectedItem.name}" and all its contents?`
            : `Delete file "${this.selectedItem.name}"?`;
        
        const confirmed = await dialog.confirm(confirmMsg, 'Delete');
        if (!confirmed) {
            document.getElementById('fileContextMenu').style.display = 'none';
            return;
        }
        
        try {
            await window.electronAPI.deletePath(this.selectedItem.path);
            
            if (this.currentFilePath === this.selectedItem.path) {
                this.currentFilePath = null;
                localStorage.removeItem('lastOpenedFile');
                room.boxes = [];
                room.arrows = [];
                room.drawAll(); // Full render when clearing canvas
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

        // Allow drop on both folders and files (to drop into parent folder)
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
        
        // Find the closest header in case event target is different (though pointer-events: none helps)
        const targetDiv = e.currentTarget; 
        if (targetDiv) targetDiv.classList.remove('drag-over');

        try {
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;
            
            const sourceItem = JSON.parse(data);
            
            // Determine target directory path
            let targetDirPath = targetItem.path;
            
            // If dropped onto a file, use its parent directory
            if (!targetItem.isDirectory) {
                const separator = targetDirPath.includes('\\') ? '\\' : '/';
                targetDirPath = targetDirPath.substring(0, targetDirPath.lastIndexOf(separator));
            }
            
            // Prevent moving into self (if source is same as target file)
            if (sourceItem.path === targetItem.path) return;
            
            // Prevent moving into same parent directory (no-op)
            const separator = sourceItem.path.includes('\\') ? '\\' : '/';
            const sourceParent = sourceItem.path.substring(0, sourceItem.path.lastIndexOf(separator));
            
            // Normalize paths for comparison (handle potential slash differences)
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
        // Check if we are dragging over the container background (not a tree item or its children)
        // If we are over a tree-node, we are likely inside the tree structure, not the empty root space.
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
        
        // Only handle if dropped on the container directly (not on a child tree item)
        if (e.target.closest('.tree-item-header')) return;
        
        // Also avoid handling if dropped inside a tree node structure (e.g. subfolder list)
        // We only want "empty space" to mean the root container background
        if (e.target.closest('.tree-node')) return;
        
        if (!this.rootPath) return;

        try {
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;
            
            let sourceItem;
            try {
                sourceItem = JSON.parse(data);
            } catch (err) {
                return; // Not a valid internal drag
            }
            
            if (!sourceItem || !sourceItem.path) return;
            
            // Normalize everything to forward slashes first for consistent comparison
            const sourcePath = sourceItem.path.replace(/\\/g, '/');
            const rootPath = this.rootPath.replace(/\\/g, '/');
            
            // Get parent directory of source file
            // Handle case where path might end with slash (shouldn't for files, but maybe folders?)
            const cleanSourcePath = sourcePath.endsWith('/') ? sourcePath.slice(0, -1) : sourcePath;
            const sourceParent = cleanSourcePath.substring(0, cleanSourcePath.lastIndexOf('/'));
            
            // If parent is root (after normalization), do nothing
            // Compare case-insensitively for Windows? 
            // Let's stick to exact match first, but usually casing matches if from same app.
            if (sourceParent.toLowerCase() === rootPath.toLowerCase()) {
                return;
            }

            await this.moveFile(sourceItem, this.rootPath);
        } catch (error) {
            console.error('Container drop error:', error);
        }
    },

    async moveFile(sourceItem, targetDirPath) {
        if (!window.electronAPI) return;

        const separator = targetDirPath.includes('\\') ? '\\' : '/';
        const newPath = targetDirPath + separator + sourceItem.name;

        // Prevent moving to same location
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
