const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ssh: {
    connect: (config) => ipcRenderer.invoke('ssh:connect', config),
    send: (sessionId, data) => ipcRenderer.invoke('ssh:send', { sessionId, data }),
    resize: (sessionId, cols, rows) => ipcRenderer.invoke('ssh:resize', { sessionId, cols, rows }),
    disconnect: (sessionId) => ipcRenderer.invoke('ssh:disconnect', sessionId),
    onData: (callback) => ipcRenderer.on('ssh:data', (event, data) => callback(data))
  },
  session: {
    save: (session) => ipcRenderer.invoke('session:save', session),
    load: () => ipcRenderer.invoke('session:load')
  }
});
