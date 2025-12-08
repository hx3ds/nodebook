// File Explorer Module
import { dialog } from './dialog.js';
import { room } from '../room/room.js';

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
            }
        }

        setInterval(() => {
                if (explorer.currentFilePath && room.isDirty) {
                    explorer.saveCurrentFile();
                }
            }, 5000);
    },
    
    setupSidebarResizer() {
        const resizer = document.getElementById('sidebarResizer');
        const sidebar = document.getElementById('sidebar');
        let isResizing = false;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'ew-resize';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 500) {
                sidebar.style.width = newWidth + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
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
        
        try {
            await this.renderDirectory(this.rootPath, fileTree, 0);
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
        // Create tree item
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        itemDiv.style.paddingLeft = (level * 8 + 8) + 'px';
        itemDiv.dataset.path = item.path;
        
        // Expand arrow for directories
        const expandSpan = document.createElement('span');
        expandSpan.className = 'tree-item-expand';
        if (item.isDirectory) {
            const isExpanded = this.expandedFolders.has(item.path);
            expandSpan.className += isExpanded ? ' expanded' : ' collapsed';
        } else {
            expandSpan.className += ' no-children';
        }
        
        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'tree-item-icon';
        if (item.isDirectory) {
            iconSpan.textContent = '📁';
        } else if (item.name.endsWith('.json')) {
            iconSpan.textContent = '📝';
        } else {
            iconSpan.textContent = '📄';
        }
        
        // Label
        const labelSpan = document.createElement('span');
        labelSpan.className = 'tree-item-label';
        labelSpan.textContent = item.name;
        
        itemDiv.appendChild(expandSpan);
        itemDiv.appendChild(iconSpan);
        itemDiv.appendChild(labelSpan);
        
        // Event listeners
        itemDiv.addEventListener('click', (e) => this.handleItemClick(item, itemDiv, level, e));
        itemDiv.addEventListener('dblclick', (e) => this.handleItemDoubleClick(item, e));
        itemDiv.addEventListener('contextmenu', (e) => this.handleItemContextMenu(item, itemDiv, e));
        
        // If directory is expanded, render its children
        if (item.isDirectory && this.expandedFolders.has(item.path)) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-item-children';
            itemDiv.appendChild(childrenDiv);
            this.renderDirectory(item.path, childrenDiv, level + 1);
        }
        
        // Highlight active file
        if (this.currentFilePath === item.path) {
            itemDiv.classList.add('active-file');
        }
        
        return itemDiv;
    },
    
    async handleItemClick(item, itemDiv, level, e) {
        if (item.isDirectory) {
            const expandSpan = itemDiv.querySelector('.tree-item-expand');
            const isExpanded = this.expandedFolders.has(item.path);
            
            if (isExpanded) {
                this.expandedFolders.delete(item.path);
                expandSpan.className = 'tree-item-expand collapsed';
                const childrenDiv = itemDiv.querySelector('.tree-item-children');
                if (childrenDiv) {
                    childrenDiv.remove();
                }
            } else {
                this.expandedFolders.add(item.path);
                expandSpan.className = 'tree-item-expand expanded';
                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-item-children';
                itemDiv.appendChild(childrenDiv);
                await this.renderDirectory(item.path, childrenDiv, level + 1);
            }
        }
    },
    
    async handleItemDoubleClick(item, e) {
        e.stopPropagation();
        
        if (!item.isDirectory && item.name.endsWith('.json')) {
            await this.openFile(item.path);
        }
    },
    
    handleItemContextMenu(item, itemDiv, e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove previous selection
        document.querySelectorAll('.tree-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        itemDiv.classList.add('selected');
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
            const data = JSON.parse(content);
            
            // Set current file path BEFORE refreshing tree so the active-file class gets applied
            this.currentFilePath = filePath;
            
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
    }
};
