import { contextBridge, ipcRenderer } from 'electron';

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
    pathExists: (targetPath) => ipcRenderer.invoke('path-exists', targetPath)
});

