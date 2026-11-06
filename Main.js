const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 750,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function(){
    if (process.platform !== 'darwin'){
        app.quit();
    }
});

app.on('activate', function(){
    if (BrowserWindow.getAllWindows().length === 0){
        createWindow();
    }
});