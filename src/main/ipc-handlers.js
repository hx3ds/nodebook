const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { getMainWindow } = require('./window');

function setupIpcHandlers() {
    // Dialog handlers
    ipcMain.handle('show-save-dialog', async (event, options) => {
        const result = await dialog.showSaveDialog(getMainWindow(), options);
        return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
        const result = await dialog.showOpenDialog(getMainWindow(), options);
        return result;
    });

    // File I/O handlers
    ipcMain.handle('write-file', async (event, filePath, data) => {
        if (data && typeof data === 'object' && !Array.isArray(data) && data.byteLength !== undefined) {
            await fs.writeFile(filePath, Buffer.from(data));
        } else if (Array.isArray(data)) {
            await fs.writeFile(filePath, Buffer.from(data));
        } else {
            await fs.writeFile(filePath, data, 'utf-8');
        }
    });

    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return data;
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    });

    // File System Operations for File Explorer
    ipcMain.handle('read-directory', async (event, dirPath) => {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const items = await Promise.all(
                entries.map(async (entry) => {
                    const fullPath = path.join(dirPath, entry.name);
                    const stats = await fs.stat(fullPath);
                    return {
                        name: entry.name,
                        path: fullPath,
                        isDirectory: entry.isDirectory(),
                        size: stats.size,
                        modified: stats.mtime
                    };
                })
            );
            return items;
        } catch (error) {
            console.error('Error reading directory:', error);
            throw error;
        }
    });

    ipcMain.handle('create-file', async (event, parentDir, fileName, content = '') => {
        try {
            const filePath = path.join(parentDir, fileName);
            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true, path: filePath };
        } catch (error) {
            console.error('Error creating file:', error);
            throw error;
        }
    });

    ipcMain.handle('create-directory', async (event, parentDir, folderName) => {
        try {
            const dirPath = path.join(parentDir, folderName);
            await fs.mkdir(dirPath, { recursive: true });
            return { success: true, path: dirPath };
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-path', async (event, targetPath) => {
        try {
            const stats = await fs.stat(targetPath);
            if (stats.isDirectory()) {
                await fs.rm(targetPath, { recursive: true, force: true });
            } else {
                await fs.unlink(targetPath);
            }
            return { success: true };
        } catch (error) {
            console.error('Error deleting path:', error);
            throw error;
        }
    });

    ipcMain.handle('rename-path', async (event, oldPath, newPath) => {
        try {
            await fs.rename(oldPath, newPath);
            return { success: true };
        } catch (error) {
            console.error('Error renaming path:', error);
            throw error;
        }
    });

    ipcMain.handle('path-exists', async (event, targetPath) => {
        try {
            await fs.access(targetPath);
            return true;
        } catch {
            return false;
        }
    });
}

module.exports = { setupIpcHandlers };
