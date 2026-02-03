const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const SSHManager = require('./ssh-manager');
const SessionStore = require('./session-store');
const SFTPManager = require('./sftp-manager');
const WebDAVSync = require('./webdav-sync');
const LogManager = require('./log-manager');
const MasterPassword = require('./master-password');
const LocalShellManager = require('./local-shell-manager');

let mainWindow;
const sshManager = new SSHManager();
const sessionStore = new SessionStore();
const sftpManager = new SFTPManager();
const webdavSync = new WebDAVSync();
const logManager = new LogManager();
const masterPassword = new MasterPassword();
const localShellManager = new LocalShellManager();

// 创建应用菜单
function createMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // macOS 应用菜单
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: '关于 AnotherSSH', click: () => mainWindow.webContents.send('menu:about') },
        { type: 'separator' },
        { label: '设置...', accelerator: 'Cmd+,', click: () => mainWindow.webContents.send('menu:settings') },
        { type: 'separator' },
        { label: '隐藏 AnotherSSH', role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    }] : []),
    
    // 文件菜单
    {
      label: '文件',
      submenu: [
        { 
          label: '💻 本地终端', 
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow.webContents.send('menu:new-local-shell')
        },
        { 
          label: '新建连接', 
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-connection')
        },
        { 
          label: '新建分组', 
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow.webContents.send('menu:new-group')
        },
        { type: 'separator' },
        { 
          label: '导入配置...', 
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow.webContents.send('menu:import')
        },
        { 
          label: '导出配置...', 
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export')
        },
        { type: 'separator' },
        ...(!isMac ? [
          { label: '设置...', accelerator: 'Ctrl+,', click: () => mainWindow.webContents.send('menu:settings') },
          { type: 'separator' }
        ] : []),
        ...(!isMac ? [{ label: '退出', role: 'quit' }] : [])
      ]
    },
    
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' },
        { type: 'separator' },
        { 
          label: '查找', 
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu:find')
        },
        { 
          label: '清屏', 
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('menu:clear')
        }
      ]
    },
    
    // 查看菜单
    {
      label: '查看',
      submenu: [
        { 
          label: '切换侧边栏', 
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar')
        },
        { type: 'separator' },
        { 
          label: '放大', 
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow.webContents.send('menu:zoom-in')
        },
        { 
          label: '缩小', 
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.send('menu:zoom-out')
        },
        { 
          label: '重置缩放', 
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('menu:zoom-reset')
        },
        { type: 'separator' },
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '切换开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    
    // 窗口菜单
    {
      label: '窗口',
      submenu: [
        { 
          label: '水平分屏', 
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow.webContents.send('menu:split-horizontal')
        },
        { 
          label: '垂直分屏', 
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('menu:split-vertical')
        },
        { 
          label: '关闭分屏', 
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow.webContents.send('menu:close-split')
        },
        { type: 'separator' },
        { label: '最小化', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { label: '前置全部窗口', role: 'front' }
        ] : [
          { label: '关闭', role: 'close' }
        ])
      ]
    },
    
    // 帮助菜单
    {
      label: '帮助',
      submenu: [
        {
          label: '用户手册',
          click: async () => {
            await shell.openExternal('https://github.com/chankay/AnotherSSH/blob/main/doc/USER_MANUAL.md')
          }
        },
        {
          label: '报告问题',
          click: async () => {
            await shell.openExternal('https://github.com/chankay/AnotherSSH/issues')
          }
        },
        {
          label: '项目主页',
          click: async () => {
            await shell.openExternal('https://github.com/chankay/AnotherSSH')
          }
        },
        { type: 'separator' },
        {
          label: '检查更新',
          click: () => mainWindow.webContents.send('menu:check-updates')
        },
        { type: 'separator' },
        ...(!isMac ? [
          { label: '关于 AnotherSSH', click: () => mainWindow.webContents.send('menu:about') }
        ] : [])
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

  // 创建菜单
  createMenu();

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

// SSH 数据发送 - 使用单向通信，最低延迟
ipcMain.on('ssh:send', (event, { sessionId, data }) => {
  try {
    sshManager.send(sessionId, data);
  } catch (err) {
    console.error('SSH send error:', err);
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
    // 结束日志记录
    logManager.endSession(sessionId);
    await sshManager.disconnect(sessionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ========== 本地 Shell IPC 处理器 ==========

// 创建本地 Shell
ipcMain.handle('local-shell:spawn', async (event, options) => {
  try {
    const sessionId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = localShellManager.spawn(sessionId, options);
    
    if (result.success) {
      // 设置数据监听器
      localShellManager.onData(sessionId, (data) => {
        mainWindow.webContents.send('local-shell:data', { sessionId, data });
      });
      
      // 设置退出监听器
      localShellManager.onExit(sessionId, ({ exitCode, signal }) => {
        console.log(`[LocalShell] Exited: ${sessionId}, code: ${exitCode}, signal: ${signal}`);
        mainWindow.webContents.send('local-shell:closed', { sessionId, exitCode, signal });
      });
    }
    
    return result;
  } catch (error) {
    console.error('[LocalShell] Failed to spawn:', error);
    return { success: false, error: error.message };
  }
});

// 发送数据到本地 Shell
ipcMain.on('local-shell:write', (event, { sessionId, data }) => {
  try {
    localShellManager.write(sessionId, data);
  } catch (error) {
    console.error('[LocalShell] Write error:', error);
  }
});

// 调整本地 Shell 大小
ipcMain.handle('local-shell:resize', async (event, { sessionId, cols, rows }) => {
  try {
    return localShellManager.resize(sessionId, cols, rows);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 关闭本地 Shell
ipcMain.handle('local-shell:kill', async (event, sessionId) => {
  try {
    return localShellManager.kill(sessionId);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ========== 会话管理 IPC 处理器 ==========

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
// 检查更新
ipcMain.handle('check-updates', async () => {
  try {
    const https = require('https');
    const currentVersion = app.getVersion();
    
    // 优先尝试 Gitee（国内用户快）
    const giteeResult = await checkUpdateFromGitee(https, currentVersion);
    if (giteeResult.success) {
      return giteeResult.data;
    }
    
    console.log('Gitee 检查失败，尝试 GitHub...', giteeResult.error);
    
    // Gitee 失败，降级到 GitHub
    const githubResult = await checkUpdateFromGitHub(https, currentVersion);
    if (githubResult.success) {
      return githubResult.data;
    }
    
    console.error('所有更新源都失败了');
    return {
      hasUpdate: false,
      error: 'All update sources failed'
    };
  } catch (error) {
    console.error('Check update failed:', error);
    return {
      hasUpdate: false,
      error: error.message
    };
  }
});

// 从 Gitee 检查更新
function checkUpdateFromGitee(https, currentVersion) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      req.destroy();
      resolve({
        success: false,
        error: 'Gitee request timeout'
      });
    }, 5000); // Gitee 5秒超时
    
    const options = {
      hostname: 'gitee.com',
      path: '/api/v5/repos/chankay/AnotherSSH/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'AnotherSSH'
      },
      timeout: 5000
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
          
          // 比较版本号
          const hasUpdate = compareVersions(currentVersion, latestVersion) === 1;
          
          // Gitee 下载链接
          const downloadUrl = `https://gitee.com/chankay/AnotherSSH/releases/${release.tag_name}`;
          
          resolve({
            success: true,
            data: {
              hasUpdate,
              latestVersion,
              currentVersion,
              downloadUrl,
              releaseNotes: release.body,
              source: 'gitee'
            }
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Gitee parse error: ${error.message}`
          });
        }
      });
    });
    
    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: `Gitee request error: ${error.message}`
      });
    });
    
    req.on('timeout', () => {
      clearTimeout(timeout);
      req.destroy();
      resolve({
        success: false,
        error: 'Gitee request timeout'
      });
    });
    
    req.end();
  });
}

// 从 GitHub 检查更新
function checkUpdateFromGitHub(https, currentVersion) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      req.destroy();
      resolve({
        success: false,
        error: 'GitHub request timeout'
      });
    }, 10000); // GitHub 10秒超时
    
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
          
          // 比较版本号
          const hasUpdate = compareVersions(currentVersion, latestVersion) === 1;
          
          resolve({
            success: true,
            data: {
              hasUpdate,
              latestVersion,
              currentVersion,
              downloadUrl: release.html_url,
              releaseNotes: release.body,
              source: 'github'
            }
          });
        } catch (error) {
          resolve({
            success: false,
            error: `GitHub parse error: ${error.message}`
          });
        }
      });
    });
    
    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: `GitHub request error: ${error.message}`
      });
    });
    
    req.on('timeout', () => {
      clearTimeout(timeout);
      req.destroy();
      resolve({
        success: false,
        error: 'GitHub request timeout'
      });
    });
    
    req.end();
  });
}

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
