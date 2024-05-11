const { app, BrowserWindow, ipcMain, globalShortcut  } = require('electron/main');
const fs = require('fs/promises');
const path = require('node:path')
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'electron-preload.js')
        }
    })
    win.loadFile('dist-electron/browser/index.html');
    return win;
}

app.whenReady().then(() => {
    const win = createWindow()
    ipcMain.handle('save', (event, key, data) => fs.writeFile(key, data));
    ipcMain.handle('load', (event, key) => {
        return fs.access(key).then(() => fs.readFile(key, { encoding: 'utf8' })).catch(z => null)
    });
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
	
    //because angular's router replaces the state to not include index.html, this breaks electron's reload
    //therefore, I need to intercept the reload shortcut and call loadFile() which is basically a reload
    globalShortcut.register('CommandOrControl+R', () => {
        win.loadFile('dist-electron/browser/index.html')
    });
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
