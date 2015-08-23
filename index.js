'use strict';

const app           = require('app');
const BrowserWindow = require('browser-window');
const crashReporter = require('crash-reporter');

// Report crashes to the Electron project.
crashReporter.start();

// Prevent the main window from being GCed.
let mainWindow;

function onClosed() {
    mainWindow = null;
}

function createMainWindow() {
    const win = new BrowserWindow({
        width:     1820,
        height:    1024,
        resizable: true
    });

    win.loadUrl(`file://${__dirname}/index.html`);

    win.on('closed', onClosed);

    return win;
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate-with-no-open-windows', function () {
    if (!mainWindow) {
        mainWindow = createMainWindow();
    }
});

app.on('ready', function () {
    mainWindow = createMainWindow();
});
