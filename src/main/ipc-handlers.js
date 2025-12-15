const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const { getMainWindow } = require('./window');

const activeProcesses = new Map();

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

    // Process execution
    ipcMain.handle('exec-command', (event, command) => {
        return new Promise((resolve) => {
            exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
                resolve({ 
                    error: error ? error.message : null, 
                    stdout, 
                    stderr,
                    code: error ? error.code : 0
                });
            });
        });
    });

    ipcMain.handle('spawn-command', (event, id, command, args) => {
        try {
            // shell: true allows running command as typed in shell, 
            // helpful for resolving PATH but args need to be handled carefully if shell:true
            const child = spawn(command, args, { shell: true });
            
            activeProcesses.set(id, child);

            child.stdout.on('data', (data) => {
                event.sender.send('process-event', { id, type: 'stdout', data: data.toString() });
            });

            child.stderr.on('data', (data) => {
                event.sender.send('process-event', { id, type: 'stderr', data: data.toString() });
            });

            child.on('close', (code) => {
                event.sender.send('process-event', { id, type: 'close', code });
                activeProcesses.delete(id);
            });
            
            child.on('error', (err) => {
                event.sender.send('process-event', { id, type: 'error', error: err.message });
                activeProcesses.delete(id);
            });

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('kill-process', (event, id) => {
        const child = activeProcesses.get(id);
        if (child) {
            child.kill();
            activeProcesses.delete(id);
            return { success: true };
        }
        return { success: false, error: 'Process not found' };
    });
}

module.exports = { setupIpcHandlers };
