const { contextBridge, ipcRenderer } = require('electron');

// Polyfill path module for sandboxed environment
// Sandbox prevents loading 'path' module directly via require
const isWindows = process.platform === 'win32';
const sep = isWindows ? '\\' : '/';

const pathPolyfill = {
    join: (...args) => {
        return args.map((part, index) => {
            if (index === 0) {
                return part.replace(/[\/\\]+$/, '');
            } else {
                return part.replace(/^[\/\\]+/, '').replace(/[\/\\]+$/, '');
            }
        }).filter(p => p.length > 0).join(sep);
    },
    basename: (p) => {
        return p.split(/[\/\\]/).pop();
    },
    dirname: (p) => {
        const parts = p.split(/[\/\\]/);
        parts.pop();
        return parts.join(sep);
    }
};

console.log('Preload script loading...');

contextBridge.exposeInMainWorld('electronAPI', {
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    // File Explorer APIs
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
    createFile: (parentDir, fileName, content) => ipcRenderer.invoke('create-file', parentDir, fileName, content),
    createDirectory: (parentDir, folderName) => ipcRenderer.invoke('create-directory', parentDir, folderName),
    deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
    renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', oldPath, newPath),
    pathExists: (targetPath) => ipcRenderer.invoke('path-exists', targetPath),

    // Path Utils
    joinPath: (...args) => pathPolyfill.join(...args),
    basename: (p) => pathPolyfill.basename(p),
    dirname: (p) => pathPolyfill.dirname(p),

    // Process APIs
    execCommand: (command) => ipcRenderer.invoke('exec-command', command),
    spawnCommand: (id, command, args) => ipcRenderer.invoke('spawn-command', id, command, args),
    killProcess: (id) => ipcRenderer.invoke('kill-process', id),
    onProcessEvent: (callback) => {
        const subscription = (_event, data) => callback(data);
        ipcRenderer.on('process-event', subscription);
    },
    removeAllProcessListeners: () => ipcRenderer.removeAllListeners('process-event')
});
