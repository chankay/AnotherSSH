const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const SSHManager = require('./ssh-manager');
const SessionStore = require('./session-store');
const SFTPManager = require('./sftp-manager');
const WebDAVSync = require('./webdav-sync');
const LogManager = require('./log-manager');
const MasterPassword = require('./master-password');

let mainWindow;
const sshManager = new SSHManager();
const sessionStore = new SessionStore();
const sftpManager = new SFTPManager();
const webdavSync = new WebDAVSync();
const logManager = new LogManager();
const masterPassword = new MasterPassword();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
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
    // 如果使用密钥认证，读取密钥文件内容
    if (config.privateKey && !Buffer.isBuffer(config.privateKey)) {
      const fs = require('fs');
      try {
        config.privateKey = fs.readFileSync(config.privateKey);
      } catch (error) {
        return { success: false, error: `无法读取密钥文件: ${error.message}` };
      }
    }
    
    let resolvedSessionId = null;
    const sessionId = await sshManager.connect(
      config, 
      (data) => {
        if (resolvedSessionId) {
          // 记录日志
          logManager.writeLog(resolvedSessionId, data);
          mainWindow.webContents.send('ssh:data', { sessionId: resolvedSessionId, data });
        }
      },
      (sessionId) => {
        // 连接断开时通知渲染进程并结束日志
        logManager.endSession(sessionId);
        mainWindow.webContents.send('ssh:closed', { sessionId });
      }
    );
    resolvedSessionId = sessionId;
    
    // 开始记录日志
    const sessionName = config.name || `${config.username}@${config.host}`;
    logManager.startSession(sessionId, sessionName);
    
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// SSH 数据发送 - 不等待响应
ipcMain.handle('ssh:send', async (event, { sessionId, data }) => {
  sshManager.send(sessionId, data).catch(err => {
    console.error('SSH send error:', err);
  });
  return { success: true };
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
    // 结束日志记录
    logManager.endSession(sessionId);
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

ipcMain.handle('session:loadEncrypted', async (event) => {
  // 读取加密后的原始数据用于同步
  try {
    const fs = require('fs');
    const sessionsFile = path.join(app.getPath('userData'), 'sessions.json');
    
    if (!fs.existsSync(sessionsFile)) {
      return { success: true, sessions: [] };
    }
    
    const data = fs.readFileSync(sessionsFile, 'utf8');
    const sessions = JSON.parse(data);
    return { success: true, sessions };
  } catch (error) {
    console.error('Error loading encrypted sessions:', error);
    return { success: false, error: error.message, sessions: [] };
  }
});

ipcMain.handle('session:saveEncrypted', async (event, encryptedSessions) => {
  // 直接保存加密后的数据（用于同步）
  try {
    const fs = require('fs');
    const sessionsFile = path.join(app.getPath('userData'), 'sessions.json');
    fs.writeFileSync(sessionsFile, JSON.stringify(encryptedSessions, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
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

ipcMain.handle('session:browseKey', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择私钥文件',
      filters: [
        { name: 'Private Key Files', extensions: ['pem', 'key', 'ppk', '*'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    return { success: true, filePath: result.filePaths[0] };
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
      return { success: false, error: 'User canceled', cancelled: true };
    }

    const localPath = result.filePaths[0];
    const fileName = path.basename(localPath);
    const targetPath = remotePath.endsWith('/') ? remotePath + fileName : remotePath + '/' + fileName;

    try {
      const uploadResult = await sftpManager.upload(sessionId, localPath, targetPath, (progress) => {
        mainWindow.webContents.send('sftp:progress', { sessionId, ...progress });
      });
      return uploadResult;
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }
  } catch (error) {
    console.error('SFTP upload handler error:', error);
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

// WebDAV Sync handlers
ipcMain.handle('webdav:loadConfig', async (event) => {
  return webdavSync.loadConfig();
});

ipcMain.handle('webdav:saveConfig', async (event, config) => {
  return webdavSync.saveConfig(config);
});

ipcMain.handle('webdav:testConnection', async (event, config) => {
  return await webdavSync.testConnection(config);
});

ipcMain.handle('webdav:initClient', async (event, config) => {
  return webdavSync.initClient(config);
});

ipcMain.handle('webdav:upload', async (event, sessions) => {
  const result = await webdavSync.uploadSessions(sessions);
  
  // 如果配置上传成功且启用了日志同步，则上传日志
  if (result.success && webdavSync.config && webdavSync.config.syncLogs) {
    console.log('Log sync is enabled, uploading logs...');
    const logUploadResult = await webdavSync.uploadLogs(logManager);
    console.log('Log upload result:', logUploadResult);
    result.logUpload = logUploadResult;
  } else {
    console.log('Log upload check:', {
      resultSuccess: result.success,
      hasConfig: !!webdavSync.config,
      syncLogs: webdavSync.config?.syncLogs
    });
  }
  
  return result;
});

ipcMain.handle('webdav:download', async (event) => {
  const result = await webdavSync.downloadSessions();
  
  // 如果配置下载成功且启用了日志同步，则下载日志
  if (result.success && webdavSync.config && webdavSync.config.syncLogs) {
    const logDownloadResult = await webdavSync.downloadLogs(logManager);
    result.logDownload = logDownloadResult;
  }
  
  return result;
});

ipcMain.handle('webdav:smartSync', async (event, localSessions) => {
  const result = await webdavSync.smartSync(localSessions);
  
  // 如果配置同步成功且启用了日志同步，则同步日志
  if (result.success && webdavSync.config && webdavSync.config.syncLogs) {
    console.log('Log sync is enabled, syncing logs...');
    const logSyncResult = await webdavSync.syncLogs(logManager);
    console.log('Log sync result:', logSyncResult);
    result.logSync = logSyncResult;
  } else {
    console.log('Log sync check:', {
      resultSuccess: result.success,
      hasConfig: !!webdavSync.config,
      syncLogs: webdavSync.config?.syncLogs
    });
  }
  
  return result;
});

ipcMain.handle('webdav:getStatus', async (event) => {
  return webdavSync.getStatus();
});

ipcMain.handle('webdav:startAutoSync', async (event, intervalMinutes) => {
  return webdavSync.startAutoSync(intervalMinutes);
});

ipcMain.handle('webdav:stopAutoSync', async (event) => {
  return webdavSync.stopAutoSync();
});


// 检查更新
ipcMain.handle('check-updates', async () => {
  try {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      // 设置 10 秒超时
      const timeout = setTimeout(() => {
        req.destroy();
        resolve({
          hasUpdate: false,
          error: 'Request timeout'
        });
      }, 10000);
      
      const options = {
        hostname: 'api.github.com',
        path: '/repos/chankay/anotherssh/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'AnotherSSH'
        },
        timeout: 10000
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const release = JSON.parse(data);
            const latestVersion = release.tag_name.replace('v', '');
            const currentVersion = app.getVersion();
            
            // 比较版本号
            const hasUpdate = compareVersions(currentVersion, latestVersion) === 1;
            
            resolve({
              hasUpdate,
              latestVersion,
              currentVersion,
              downloadUrl: release.html_url,
              releaseNotes: release.body
            });
          } catch (error) {
            resolve({
              hasUpdate: false,
              error: error.message
            });
          }
        });
      });
      
      req.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          hasUpdate: false,
          error: error.message
        });
      });
      
      req.on('timeout', () => {
        clearTimeout(timeout);
        req.destroy();
        resolve({
          hasUpdate: false,
          error: 'Request timeout'
        });
      });
      
      req.end();
    });
  } catch (error) {
    console.error('Check update failed:', error);
    return {
      hasUpdate: false,
      error: error.message
    };
  }
});

// 比较版本号
function compareVersions(current, latest) {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return 1;  // 有新版本
    if (l[i] < c[i]) return -1; // 当前版本更新
  }
  return 0; // 版本相同
}

// 打开外部链接
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});


// 获取应用版本号
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});


// 日志管理
ipcMain.handle('log:getAll', async () => {
  try {
    const logs = logManager.getAllLogs();
    return { success: true, logs };
  } catch (error) {
    return { success: false, error: error.message, logs: [] };
  }
});

ipcMain.handle('log:read', async (event, logPath) => {
  try {
    const content = logManager.readLog(logPath);
    if (content === null) {
      return { success: false, error: 'Failed to read log file' };
    }
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log:delete', async (event, logPath) => {
  return logManager.deleteLog(logPath);
});

ipcMain.handle('log:clearAll', async () => {
  return logManager.clearAllLogs();
});

ipcMain.handle('log:export', async (event, logPath) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.basename(logPath),
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    return logManager.exportLog(logPath, result.filePath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log:openDir', async () => {
  const logDir = logManager.getLogDir();
  await shell.openPath(logDir);
  return { success: true };
});

// 主密码相关
ipcMain.handle('master-password:has', async () => {
  return { success: true, hasPassword: masterPassword.hasPassword() };
});

ipcMain.handle('master-password:hasPrompted', async () => {
  return { success: true, hasPrompted: masterPassword.hasPrompted() };
});

ipcMain.handle('master-password:setPrompted', async () => {
  return masterPassword.setPrompted();
});

ipcMain.handle('master-password:clearPrompted', async () => {
  return masterPassword.clearPrompted();
});

ipcMain.handle('master-password:set', async (event, password) => {
  return masterPassword.setPassword(password);
});

ipcMain.handle('master-password:verify', async (event, password) => {
  return masterPassword.verifyPassword(password);
});

ipcMain.handle('master-password:change', async (event, oldPassword, newPassword) => {
  return masterPassword.changePassword(oldPassword, newPassword);
});

ipcMain.handle('master-password:reset', async () => {
  return masterPassword.resetPassword();
});
