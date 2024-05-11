const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronBridge', {
    save: (key, str) => ipcRenderer.invoke('save', key, str),
    load: (key) => ipcRenderer.invoke('load', key)
})