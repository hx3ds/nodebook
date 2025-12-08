const { app, BrowserWindow } = require('electron');
const { createWindow } = require('./window');
const { setupIpcHandlers } = require('./ipc-handlers');

if (require('electron-squirrel-startup')) app.quit();

app.whenReady().then(() => {
    createWindow();
    setupIpcHandlers();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
