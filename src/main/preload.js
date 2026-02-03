const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ssh: {
    connect: (config) => ipcRenderer.invoke('ssh:connect', config),
    send: (sessionId, data) => ipcRenderer.invoke('ssh:send', { sessionId, data }),  // 保持 invoke
    resize: (sessionId, cols, rows) => ipcRenderer.invoke('ssh:resize', { sessionId, cols, rows }),
    disconnect: (sessionId) => ipcRenderer.invoke('ssh:disconnect', sessionId),
    onData: (callback) => ipcRenderer.on('ssh:data', (event, data) => callback(data))
  },
  session: {
    save: (session) => ipcRenderer.invoke('session:save', session),
    load: () => ipcRenderer.invoke('session:load'),
    loadEncrypted: () => ipcRenderer.invoke('session:loadEncrypted'),
    saveEncrypted: (sessions) => ipcRenderer.invoke('session:saveEncrypted', sessions),
    delete: (sessionId) => ipcRenderer.invoke('session:delete', sessionId),
    export: () => ipcRenderer.invoke('session:export'),
    import: () => ipcRenderer.invoke('session:import'),
    browseKey: () => ipcRenderer.invoke('session:browseKey')
  },
  sftp: {
    connect: (sessionId, config) => ipcRenderer.invoke('sftp:connect', { sessionId, config }),
    list: (sessionId, remotePath) => ipcRenderer.invoke('sftp:list', { sessionId, remotePath }),
    download: (sessionId, remotePath) => ipcRenderer.invoke('sftp:download', { sessionId, remotePath }),
    upload: (sessionId, remotePath) => ipcRenderer.invoke('sftp:upload', { sessionId, remotePath }),
    mkdir: (sessionId, remotePath) => ipcRenderer.invoke('sftp:mkdir', { sessionId, remotePath }),
    delete: (sessionId, remotePath) => ipcRenderer.invoke('sftp:delete', { sessionId, remotePath }),
    rename: (sessionId, oldPath, newPath) => ipcRenderer.invoke('sftp:rename', { sessionId, oldPath, newPath }),
    disconnect: (sessionId) => ipcRenderer.invoke('sftp:disconnect', sessionId),
    uploadFile: (sessionId, localPath, remotePath) => ipcRenderer.invoke('sftp:uploadFile', { sessionId, localPath, remotePath }),
    cancelTransfer: (transferId) => ipcRenderer.invoke('sftp:cancelTransfer', transferId),
    onProgress: (callback) => ipcRenderer.on('sftp:progress', (event, data) => callback(data))
  },
  webdav: {
    loadConfig: () => ipcRenderer.invoke('webdav:loadConfig'),
    saveConfig: (config) => ipcRenderer.invoke('webdav:saveConfig', config),
    testConnection: (config) => ipcRenderer.invoke('webdav:testConnection', config),
    initClient: (config) => ipcRenderer.invoke('webdav:initClient', config),
    upload: (sessions) => ipcRenderer.invoke('webdav:upload', sessions),
    download: () => ipcRenderer.invoke('webdav:download'),
    smartSync: (localSessions) => ipcRenderer.invoke('webdav:smartSync', localSessions),
    getStatus: () => ipcRenderer.invoke('webdav:getStatus'),
    startAutoSync: (intervalMinutes) => ipcRenderer.invoke('webdav:startAutoSync', intervalMinutes),
    stopAutoSync: () => ipcRenderer.invoke('webdav:stopAutoSync')
  },
  logs: {
    getAll: () => ipcRenderer.invoke('log:getAll'),
    read: (logPath) => ipcRenderer.invoke('log:read', logPath),
    delete: (logPath) => ipcRenderer.invoke('log:delete', logPath),
    clearAll: () => ipcRenderer.invoke('log:clearAll'),
    export: (logPath) => ipcRenderer.invoke('log:export', logPath),
    openDir: () => ipcRenderer.invoke('log:openDir')
  },
  localShell: {
    spawn: (options) => ipcRenderer.invoke('local-shell:spawn', options),
    write: (sessionId, data) => ipcRenderer.send('local-shell:write', { sessionId, data }),
    resize: (sessionId, cols, rows) => ipcRenderer.invoke('local-shell:resize', { sessionId, cols, rows }),
    kill: (sessionId) => ipcRenderer.invoke('local-shell:kill', sessionId),
    onData: (callback) => ipcRenderer.on('local-shell:data', (event, data) => callback(data)),
    onClosed: (callback) => ipcRenderer.on('local-shell:closed', (event, data) => callback(data))
  },
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

