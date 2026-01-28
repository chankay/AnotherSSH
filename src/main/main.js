const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const SSHManager = require('./ssh-manager');
const SessionStore = require('./session-store');
const SFTPManager = require('./sftp-manager');

let mainWindow;
const sshManager = new SSHManager();
const sessionStore = new SessionStore();
const sftpManager = new SFTPManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('src/renderer/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('ssh:connect', async (event, config) => {
  try {
    let resolvedSessionId = null;
    const sessionId = await sshManager.connect(
      config, 
      (data) => {
        if (resolvedSessionId) {
          mainWindow.webContents.send('ssh:data', { sessionId: resolvedSessionId, data });
        }
      },
      (sessionId) => {
        // 连接断开时通知渲染进程
        mainWindow.webContents.send('ssh:closed', { sessionId });
      }
    );
    resolvedSessionId = sessionId;
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:send', async (event, { sessionId, data }) => {
  try {
    await sshManager.send(sessionId, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:resize', async (event, { sessionId, cols, rows }) => {
  try {
    await sshManager.resize(sessionId, cols, rows);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:disconnect', async (event, sessionId) => {
  try {
    await sshManager.disconnect(sessionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('session:save', async (event, sessions) => {
  return sessionStore.saveSessions(sessions);
});

ipcMain.handle('session:load', async (event) => {
  return sessionStore.loadSessions();
});

ipcMain.handle('session:delete', async (event, sessionId) => {
  return sessionStore.deleteSession(sessionId);
});

ipcMain.handle('session:export', async (event) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出会话配置',
      defaultPath: `ssh-sessions-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    return sessionStore.exportSessions(result.filePath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('session:import', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入会话配置',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    return sessionStore.importSessions(result.filePaths[0]);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// SFTP handlers
ipcMain.handle('sftp:connect', async (event, { sessionId, config }) => {
  return await sftpManager.connect(sessionId, config);
});

ipcMain.handle('sftp:list', async (event, { sessionId, remotePath }) => {
  return await sftpManager.list(sessionId, remotePath);
});

ipcMain.handle('sftp:download', async (event, { sessionId, remotePath }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.basename(remotePath)
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    return await sftpManager.download(sessionId, remotePath, result.filePath, (progress) => {
      mainWindow.webContents.send('sftp:progress', { sessionId, ...progress });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:upload', async (event, { sessionId, remotePath }) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile']
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    const localPath = result.filePaths[0];
    const fileName = path.basename(localPath);
    const targetPath = remotePath.endsWith('/') ? remotePath + fileName : remotePath + '/' + fileName;

    return await sftpManager.upload(sessionId, localPath, targetPath, (progress) => {
      mainWindow.webContents.send('sftp:progress', { sessionId, ...progress });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:mkdir', async (event, { sessionId, remotePath }) => {
  return await sftpManager.mkdir(sessionId, remotePath);
});

ipcMain.handle('sftp:delete', async (event, { sessionId, remotePath }) => {
  return await sftpManager.delete(sessionId, remotePath);
});

ipcMain.handle('sftp:rename', async (event, { sessionId, oldPath, newPath }) => {
  return await sftpManager.rename(sessionId, oldPath, newPath);
});

ipcMain.handle('sftp:disconnect', async (event, sessionId) => {
  return await sftpManager.disconnect(sessionId);
});

ipcMain.handle('sftp:uploadFile', async (event, { sessionId, localPath, remotePath }) => {
  try {
    return await sftpManager.upload(sessionId, localPath, remotePath, (progress) => {
      mainWindow.webContents.send('sftp:progress', { sessionId, ...progress });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:cancelTransfer', async (event, transferId) => {
  return sftpManager.cancelTransfer(transferId);
});
