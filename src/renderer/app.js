// Terminal、FitAddon、SearchAddon 已在 HTML 中加载

// 等待 DOM 和依赖加载完成
if (!window.ipcRenderer) {
  console.error('ipcRenderer not loaded');
}

// 创建 electronAPI 对象（替代 preload）
if (!window.electronAPI) {
  window.electronAPI = {
    ssh: {
      connect: (config) => window.ipcRenderer.invoke('ssh:connect', config),
      send: (sessionId, data) => {
        // 使用单向 send 而不是双向 invoke，减少延迟
        window.ipcRenderer.send('ssh:send', { sessionId, data });
      },
      resize: (sessionId, cols, rows) => window.ipcRenderer.invoke('ssh:resize', { sessionId, cols, rows }),
      disconnect: (sessionId) => window.ipcRenderer.invoke('ssh:disconnect', sessionId),
      onData: (callback) => window.ipcRenderer.on('ssh:data', (event, data) => callback(data))
    },
    session: {
      save: (sessions) => window.ipcRenderer.invoke('session:save', sessions),
      load: () => window.ipcRenderer.invoke('session:load'),
      loadEncrypted: () => window.ipcRenderer.invoke('session:loadEncrypted'),
      saveEncrypted: (sessions) => window.ipcRenderer.invoke('session:saveEncrypted', sessions),
      delete: (sessionId) => window.ipcRenderer.invoke('session:delete', sessionId),
      export: () => window.ipcRenderer.invoke('session:export'),
      import: () => window.ipcRenderer.invoke('session:import'),
      browseKey: () => window.ipcRenderer.invoke('session:browseKey')
    },
    sftp: {
      connect: (sessionId, config) => window.ipcRenderer.invoke('sftp:connect', { sessionId, config }),
      list: (sessionId, remotePath) => window.ipcRenderer.invoke('sftp:list', { sessionId, remotePath }),
      download: (sessionId, remotePath) => window.ipcRenderer.invoke('sftp:download', { sessionId, remotePath }),
      upload: (sessionId, remotePath) => window.ipcRenderer.invoke('sftp:upload', { sessionId, remotePath }),
      uploadFile: (sessionId, localPath, remotePath) => window.ipcRenderer.invoke('sftp:uploadFile', { sessionId, localPath, remotePath }),
      mkdir: (sessionId, remotePath) => window.ipcRenderer.invoke('sftp:mkdir', { sessionId, remotePath }),
      delete: (sessionId, remotePath) => window.ipcRenderer.invoke('sftp:delete', { sessionId, remotePath }),
      rename: (sessionId, oldPath, newPath) => window.ipcRenderer.invoke('sftp:rename', { sessionId, oldPath, newPath }),
      disconnect: (sessionId) => window.ipcRenderer.invoke('sftp:disconnect', sessionId),
      cancelTransfer: (transferId) => window.ipcRenderer.invoke('sftp:cancelTransfer', transferId),
      onProgress: (callback) => window.ipcRenderer.on('sftp:progress', (event, data) => callback(data))
    },
    webdav: {
      loadConfig: () => window.ipcRenderer.invoke('webdav:loadConfig'),
      saveConfig: (config) => window.ipcRenderer.invoke('webdav:saveConfig', config),
      testConnection: (config) => window.ipcRenderer.invoke('webdav:testConnection', config),
      initClient: (config) => window.ipcRenderer.invoke('webdav:initClient', config),
      upload: (sessions) => window.ipcRenderer.invoke('webdav:upload', sessions),
      download: () => window.ipcRenderer.invoke('webdav:download'),
      smartSync: (localSessions) => window.ipcRenderer.invoke('webdav:smartSync', localSessions),
      getStatus: () => window.ipcRenderer.invoke('webdav:getStatus'),
      startAutoSync: (intervalMinutes) => window.ipcRenderer.invoke('webdav:startAutoSync', intervalMinutes),
      stopAutoSync: () => window.ipcRenderer.invoke('webdav:stopAutoSync')
    },
    checkUpdates: () => window.ipcRenderer.invoke('check-updates'),
    openExternal: (url) => window.ipcRenderer.invoke('open-external', url),
    getAppVersion: () => window.ipcRenderer.invoke('get-app-version'),
    log: {
      getAll: () => window.ipcRenderer.invoke('log:getAll'),
      read: (logPath) => window.ipcRenderer.invoke('log:read', logPath),
      delete: (logPath) => window.ipcRenderer.invoke('log:delete', logPath),
      clearAll: () => window.ipcRenderer.invoke('log:clearAll'),
      export: (logPath) => window.ipcRenderer.invoke('log:export', logPath),
      openDir: () => window.ipcRenderer.invoke('log:openDir')
    },
    localShell: {
      spawn: (options) => window.ipcRenderer.invoke('local-shell:spawn', options),
      write: (sessionId, data) => window.ipcRenderer.send('local-shell:write', { sessionId, data }),
      resize: (sessionId, cols, rows) => window.ipcRenderer.invoke('local-shell:resize', { sessionId, cols, rows }),
      kill: (sessionId) => window.ipcRenderer.invoke('local-shell:kill', sessionId),
      onData: (callback) => window.ipcRenderer.on('local-shell:data', (event, data) => callback(data)),
      onClosed: (callback) => window.ipcRenderer.on('local-shell:closed', (event, data) => callback(data))
    },
    masterPassword: {
      has: () => window.ipcRenderer.invoke('master-password:has'),
      hasPrompted: () => window.ipcRenderer.invoke('master-password:hasPrompted'),
      setPrompted: () => window.ipcRenderer.invoke('master-password:setPrompted'),
      clearPrompted: () => window.ipcRenderer.invoke('master-password:clearPrompted'),
      set: (password) => window.ipcRenderer.invoke('master-password:set', password),
      verify: (password) => window.ipcRenderer.invoke('master-password:verify', password),
      change: (oldPassword, newPassword) => window.ipcRenderer.invoke('master-password:change', oldPassword, newPassword),
      reset: () => window.ipcRenderer.invoke('master-password:reset')
    }
  };
}


class SSHClient {
  constructor() {
    this.terminals = new Map();
    this.sftpSessions = new Map();
    this.activeSessionId = null;
    this.savedSessions = [];
    this.sessionGroups = [];
    this.collapsedGroups = new Set();
    this.loadCollapsedGroups(); // 加载折叠状态
    this.currentSftpPath = {};
    this.editingSessionId = null;
    this.searchQuery = '';
    this.selectedFiles = new Set();
    this.currentTransferId = null;
    this.settingsDialogInitialized = false; // 标记设置对话框是否已初始化
    
    // 分屏相关
    this.splitSessions = new Map(); // sessionId -> { layout, panes: [] }
    this.activePaneId = null;
    
    // 同步输入相关
    this.syncInputMode = 'OFF'; // OFF / ALL / SPLIT
    
    // 自动重连相关
    this.reconnectConfig = new Map(); // sessionId -> { attempts, timer, interval, config }
    this.userDisconnectedSessions = new Set(); // 用户主动断开的会话
    this.commandBuffers = new Map(); // sessionId -> 命令缓冲区，用于检测 exit 等命令
    
    this.init();
  }

  // 翻译辅助方法
  t(key, defaultValue) {
    return window.i18n ? window.i18n.t(key, defaultValue || key) : (defaultValue || key);
  }

  init() {
    // 立即加载会话列表（最重要）
    this.loadSessions();
    this.loadSidebarState();
    
    // 使用 setTimeout 延迟非关键初始化，让界面先渲染
    setTimeout(() => {
      this.setupEventListeners();
      this.loadAppVersion();
      
      // 监听来自主进程的数据
      window.electronAPI.ssh.onData((data) => {
        this.handleSSHData(data);
      });

      // 监听 SSH 连接关闭
      window.ipcRenderer.on('ssh:closed', (event, data) => {
        this.handleSSHClosed(data);
      });

      // 监听 SFTP 进度
      window.electronAPI.sftp.onProgress((data) => {
        this.updateProgress(data);
      });

      // 监听菜单事件
      this.setupMenuListeners();

      // 监听窗口大小变化
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.terminals.forEach((terminalData) => {
            if (terminalData.fitAddon && terminalData.terminal) {
              // 先 fit，让终端重新计算大小
              terminalData.fitAddon.fit();
              
              // 延迟一下再通知 SSH，确保 cols/rows 已更新
              setTimeout(() => {
                const sessionId = terminalData.sessionId || Array.from(this.terminals.entries())
                  .find(([_, data]) => data === terminalData)?.[0];
                
                if (sessionId && terminalData.terminal.cols && terminalData.terminal.rows) {
                  window.electronAPI.ssh.resize(
                    sessionId, 
                    terminalData.terminal.cols, 
                    terminalData.terminal.rows
                  );
                }
              }, 50);
            }
          });
        }, 200);
      });
      
      // 设置主密码相关的事件监听器
      this.setupMasterPasswordListeners();
      
      // 异步检查主密码（不阻塞界面显示）
      this.checkMasterPassword();
      
      // 延迟 2 秒后自动检查更新（不阻塞启动）
      setTimeout(() => {
        this.autoCheckUpdates();
      }, 2000);
    }, 0);
  }

  setupMasterPasswordListeners() {
    // 主密码对话框事件监听
    document.getElementById('masterPasswordForm').addEventListener('submit', (e) => {
      this.handleMasterPassword(e);
    });

    document.getElementById('masterPasswordSkipBtn').addEventListener('click', () => {
      this.skipMasterPassword();
    });

    document.getElementById('masterPasswordCancelBtn').addEventListener('click', () => {
      this.hideMasterPasswordDialog();
    });

    // 关于对话框关闭按钮
    document.getElementById('aboutCloseBtn').addEventListener('click', () => {
      document.getElementById('aboutDialog').style.display = 'none';
    });
  }

  setupMenuListeners() {
    // 监听来自主进程菜单的事件
    window.ipcRenderer.on('menu:new-local-shell', () => {
      this.openLocalShell();
    });

    window.ipcRenderer.on('menu:new-connection', () => {
      this.showConnectDialog();
    });

    window.ipcRenderer.on('menu:new-group', () => {
      this.createNewGroup();
    });

    window.ipcRenderer.on('menu:import', () => {
      this.importConfig();
    });

    window.ipcRenderer.on('menu:export', () => {
      this.exportConfig();
    });

    window.ipcRenderer.on('menu:settings', () => {
      this.showSettingsDialog();
    });

    window.ipcRenderer.on('menu:find', () => {
      this.toggleSearch();
    });

    window.ipcRenderer.on('menu:clear', () => {
      const activeTerminal = this.terminals.get(this.activeSessionId);
      if (activeTerminal && activeTerminal.terminal) {
        activeTerminal.terminal.clear();
      }
    });

    window.ipcRenderer.on('menu:toggle-sidebar', () => {
      this.toggleSidebar();
    });

    window.ipcRenderer.on('menu:zoom-in', () => {
      this.increaseFontSize();
    });

    window.ipcRenderer.on('menu:zoom-out', () => {
      this.decreaseFontSize();
    });

    window.ipcRenderer.on('menu:zoom-reset', () => {
      this.resetFontSize();
    });

    window.ipcRenderer.on('menu:split-horizontal', () => {
      this.splitTerminal('horizontal');
    });

    window.ipcRenderer.on('menu:split-vertical', () => {
      this.splitTerminal('vertical');
    });

    window.ipcRenderer.on('menu:close-split', () => {
      this.closeSplit();
    });

    window.ipcRenderer.on('menu:check-updates', () => {
      this.checkForUpdates(true);
    });

    window.ipcRenderer.on('menu:about', () => {
      this.showAboutDialog();
    });
  }

  async checkMasterPassword() {
    try {
      // 并行检查两个状态，减少等待时间
      const [promptedResult, hasPasswordResult] = await Promise.all([
        window.electronAPI.masterPassword.hasPrompted(),
        window.electronAPI.masterPassword.has()
      ]);
      
      const hasPrompted = promptedResult.success && promptedResult.hasPrompted;
      const hasPassword = hasPasswordResult.hasPassword;
      
      if (!hasPassword) {
        // 没有设置主密码
        if (!hasPrompted) {
          // 首次使用，提示设置主密码
          this.showMasterPasswordDialog('set');
        }
        // 用户之前选择了跳过，不做任何操作（应用已经初始化）
      } else {
        // 已有主密码，需要验证
        this.showMasterPasswordDialog('verify');
        // 锁定界面，禁止操作
        this.lockUI();
      }
    } catch (error) {
      console.error('Failed to check master password:', error);
      // 出错时不阻塞应用使用
    }
  }

  lockUI() {
    // 锁定界面，禁止操作（除了主密码对话框）
    const mainContent = document.querySelector('.container');
    if (mainContent) {
      mainContent.style.pointerEvents = 'none';
      mainContent.style.opacity = '0.5';
    }
  }

  unlockUI() {
    // 解锁界面
    const mainContent = document.querySelector('.container');
    if (mainContent) {
      mainContent.style.pointerEvents = 'auto';
      mainContent.style.opacity = '1';
    }
  }

  updateProgress(data) {
    const { sessionId, transferred, total, percent, transferId } = data;
    
    // 显示进度条
    let progressBar = document.getElementById('progressBar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'progressBar';
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = `
        <div class="progress-content">
          <div class="progress-header">
            <div class="progress-text">传输中...</div>
            <button class="progress-cancel" id="progressCancelBtn">✕</button>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-info">
            <span class="progress-percent" id="progressPercent">0%</span>
            <span class="progress-size" id="progressSize">0 / 0</span>
          </div>
        </div>
      `;
      document.body.appendChild(progressBar);

      // 绑定取消按钮
      document.getElementById('progressCancelBtn').addEventListener('click', () => {
        this.cancelTransfer();
      });
    }

    // 存储当前传输 ID
    this.currentTransferId = transferId;

    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressSize = document.getElementById('progressSize');
    
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    progressSize.textContent = `${this.formatSize(transferred)} / ${this.formatSize(total)}`;

    // 传输完成后隐藏进度条
    if (parseFloat(percent) >= 100) {
      setTimeout(() => {
        if (progressBar) {
          progressBar.remove();
          this.currentTransferId = null;
        }
      }, 1000);
    }
  }

  async cancelTransfer() {
    if (!this.currentTransferId) return;

    const result = await window.electronAPI.sftp.cancelTransfer(this.currentTransferId);
    
    if (result.success) {
      this.showNotification('notify.transferCancelled', 'info');
      const progressBar = document.getElementById('progressBar');
      if (progressBar) {
        progressBar.remove();
      }
      this.currentTransferId = null;
    }
  }

  setupEventListeners() {
    // 侧边栏拖拽调整宽度
    this.setupSidebarResizer();
    
    // 侧边栏收起/展开
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.getElementById('sidebarExpand').addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.getElementById('newSessionBtn').addEventListener('click', () => {
      this.showConnectDialog();
    });

    document.getElementById('newLocalShellBtn').addEventListener('click', () => {
      this.openLocalShell();
    });

    document.getElementById('newGroupBtn').addEventListener('click', () => {
      this.createNewGroup();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsDialog();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.hideConnectDialog();
    });

    document.getElementById('saveOnlyBtn').addEventListener('click', () => {
      this.handleSaveOnly();
    });

    document.getElementById('authType').addEventListener('change', (e) => {
      const isPassword = e.target.value === 'password';
      document.getElementById('passwordGroup').style.display = isPassword ? 'block' : 'none';
      document.getElementById('keyGroup').style.display = isPassword ? 'none' : 'block';
    });

    // 浏览密钥文件按钮
    document.getElementById('browseKeyBtn').addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.session.browseKey();
        if (result.success && result.filePath) {
          document.getElementById('privateKey').value = result.filePath;
        }
      } catch (error) {
        console.error('Failed to browse key file:', error);
        this.showNotification('notify.fileSelectFailed', 'error');
      }
    });

    document.getElementById('connectForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleConnect();
    });

    // SFTP 事件监听
    document.getElementById('sftpBackBtn').addEventListener('click', () => {
      this.sftpNavigateUp();
    });

    document.getElementById('sftpRefreshBtn').addEventListener('click', () => {
      this.sftpRefresh();
    });

    document.getElementById('sftpUploadBtn').addEventListener('click', () => {
      this.sftpUpload();
    });

    document.getElementById('sftpMkdirBtn').addEventListener('click', () => {
      this.sftpMkdir();
    });

    document.getElementById('sftpDownloadBtn').addEventListener('click', () => {
      this.sftpDownloadSelected();
    });

    document.getElementById('sftpSelectAllBtn').addEventListener('click', () => {
      this.sftpToggleSelectAll();
    });

    // 搜索功能
    document.getElementById('sessionSearch').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderSessionList();
    });

    // 键盘快捷键（合并所有快捷键到一个监听器）
    document.addEventListener('keydown', (e) => {
      // 检查终端是否有焦点
      const terminalHasFocus = document.activeElement && 
                               document.activeElement.closest('.terminal');
      
      // Ctrl/Cmd + N: 新建连接
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showConnectDialog();
        return;
      }
      
      // Ctrl/Cmd + F: 搜索（优先终端搜索）
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        const activeTerminal = this.terminals.get(this.activeSessionId);
        if (activeTerminal && document.getElementById('terminalToolbar').style.display !== 'none') {
          this.toggleSearch();
        } else {
          document.getElementById('sessionSearch').focus();
        }
        return;
      }
      
      // Ctrl/Cmd + B: 切换侧边栏（终端有焦点时不拦截，让 vim/emacs 处理）
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !terminalHasFocus) {
        e.preventDefault();
        this.toggleSidebar();
        return;
      }
      
      // Ctrl/Cmd + = 或 + 增大字体
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        this.increaseFontSize();
        return;
      }
      
      // Ctrl/Cmd + - 减小字体
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        this.decreaseFontSize();
        return;
      }
      
      // Ctrl/Cmd + 0 重置字体
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        this.resetFontSize();
        return;
      }
      
      // Ctrl/Cmd + Shift + D: 水平分屏
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.splitTerminal('horizontal');
        return;
      }
      
      // Ctrl/Cmd + Shift + E: 垂直分屏
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.splitTerminal('vertical');
        return;
      }
      
      // ESC: 关闭对话框
      if (e.key === 'Escape') {
        const dialogs = document.querySelectorAll('.dialog');
        dialogs.forEach(dialog => {
          if (dialog.style.display === 'flex') {
            dialog.style.display = 'none';
          }
        });
        return;
      }
    });

    // 点击版本号检查更新
    document.getElementById('statusVersion').addEventListener('click', () => {
      this.checkForUpdates(true);
    });

    // 分屏按钮事件
    document.getElementById('splitHorizontalBtn').addEventListener('click', () => {
      this.splitTerminal('horizontal');
    });

    document.getElementById('splitVerticalBtn').addEventListener('click', () => {
      this.splitTerminal('vertical');
    });

    document.getElementById('closeSplitBtn').addEventListener('click', () => {
      this.closeSplit();
    });

    // 分屏会话选择对话框事件
    document.getElementById('splitNewSessionBtn').addEventListener('click', () => {
      this.showSplitConnectDialog();
    });

    document.getElementById('splitSavedSessionBtn').addEventListener('click', () => {
      this.showSavedSessionsList();
    });

    document.getElementById('splitSessionCancelBtn').addEventListener('click', () => {
      document.getElementById('splitSessionDialog').style.display = 'none';
      this.pendingSplitLayout = null;
    });

    document.getElementById('splitSessionSearch').addEventListener('input', (e) => {
      this.filterSplitSessions(e.target.value);
    });

    // 同步输入按钮事件
    document.getElementById('syncInputBtn').addEventListener('click', () => {
      this.toggleSyncInput();
    });

    // 搜索按钮事件
    document.getElementById('searchBtn').addEventListener('click', () => {
      this.toggleSearch();
    });

    // 搜索框事件
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });

    document.getElementById('searchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.searchPrevious();
        } else {
          this.searchNext();
        }
      } else if (e.key === 'Escape') {
        this.closeSearch();
      }
    });

    document.getElementById('searchClearBtn').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      this.performSearch('');
    });

    document.getElementById('searchPrevBtn').addEventListener('click', () => {
      this.searchPrevious();
    });

    document.getElementById('searchNextBtn').addEventListener('click', () => {
      this.searchNext();
    });

    document.getElementById('searchCaseSensitiveBtn').addEventListener('click', (e) => {
      e.target.classList.toggle('active');
      this.performSearch(document.getElementById('searchInput').value);
    });

    document.getElementById('searchRegexBtn').addEventListener('click', (e) => {
      e.target.classList.toggle('active');
      this.performSearch(document.getElementById('searchInput').value);
    });

    document.getElementById('searchCloseBtn').addEventListener('click', () => {
      this.closeSearch();
    });

    // 重连按钮事件
    document.getElementById('reconnectNowBtn').addEventListener('click', () => {
      const notification = document.getElementById('reconnectNotification');
      const sessionId = notification.dataset.sessionId;
      if (sessionId) {
        this.reconnectNow(sessionId);
      }
    });

    document.getElementById('cancelReconnectBtn').addEventListener('click', () => {
      const notification = document.getElementById('reconnectNotification');
      const sessionId = notification.dataset.sessionId;
      if (sessionId) {
        this.cancelReconnect(sessionId);
      }
    });

    // 颜色选择器事件
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        // 移除所有选中状态
        document.querySelectorAll('.color-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        // 添加选中状态
        option.classList.add('selected');
        // 设置隐藏字段的值
        document.getElementById('sessionColor').value = option.dataset.color;
      });
    });
  }

  showMasterPasswordDialog(mode) {
    const dialog = document.getElementById('masterPasswordDialog');
    const title = document.getElementById('masterPasswordTitle');
    const confirmGroup = document.getElementById('masterPasswordConfirmGroup');
    const hint = document.getElementById('masterPasswordHint');
    const cancelBtn = document.getElementById('masterPasswordCancelBtn');
    const skipBtn = document.getElementById('masterPasswordSkipBtn');
    const form = document.getElementById('masterPasswordForm');
    
    // 重置表单
    form.reset();
    
    if (mode === 'set') {
      title.textContent = this.t('masterPassword.titleSetOptional');
      confirmGroup.style.display = 'block';
      hint.textContent = this.t('masterPassword.hintSetOptional');
      cancelBtn.style.display = 'none';
      skipBtn.style.display = 'inline-block';
    } else if (mode === 'verify') {
      title.textContent = this.t('masterPassword.titleVerify');
      confirmGroup.style.display = 'none';
      hint.textContent = this.t('masterPassword.hintVerify');
      cancelBtn.style.display = 'none';
      skipBtn.style.display = 'none';
    } else if (mode === 'change') {
      title.textContent = this.t('masterPassword.titleChange');
      confirmGroup.style.display = 'block';
      hint.textContent = this.t('masterPassword.hintChange');
      cancelBtn.style.display = 'inline-block';
      skipBtn.style.display = 'none';
    }
    
    dialog.style.display = 'flex';
    document.getElementById('masterPassword').focus();
  }

  hideMasterPasswordDialog() {
    document.getElementById('masterPasswordDialog').style.display = 'none';
    document.getElementById('masterPasswordForm').reset();
  }

  async handleMasterPassword(e) {
    e.preventDefault();
    
    const password = document.getElementById('masterPassword').value;
    const confirmPassword = document.getElementById('masterPasswordConfirm').value;
    const title = document.getElementById('masterPasswordTitle').textContent;
    
    if (title.includes(this.t('masterPassword.titleSetOptional').substring(0, 6))) {
      // 设置主密码
      if (!password) {
        this.showNotification('notify.passwordRequired', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        this.showNotification('notify.passwordMismatch', 'error');
        return;
      }
      
      if (password.length < 6) {
        this.showNotification('notify.passwordTooShort', 'error');
        return;
      }
      
      const result = await window.electronAPI.masterPassword.set(password);
      if (result.success) {
        // 记录用户已经设置过主密码
        await window.electronAPI.masterPassword.setPrompted();
        this.showNotification('notify.masterPasswordSet', 'success');
        this.hideMasterPasswordDialog();
        // 应用已经初始化，不需要再调用 initializeApp
      } else {
        this.showNotification('notify.operationFailed', 'error');
      }
    } else if (title === this.t('masterPassword.titleVerify')) {
      // 验证主密码
      if (!password) {
        this.showNotification('notify.passwordRequired', 'error');
        return;
      }
      
      const result = await window.electronAPI.masterPassword.verify(password);
      if (result.success && result.valid) {
        this.hideMasterPasswordDialog();
        this.unlockUI(); // 解锁界面
      } else {
        this.showNotification('notify.masterPasswordWrong', 'error');
        document.getElementById('masterPassword').value = '';
        document.getElementById('masterPassword').focus();
      }
    }
  }

  async skipMasterPassword() {
    // 记录用户已经看过设置主密码的提示
    const result = await window.electronAPI.masterPassword.setPrompted();
    this.hideMasterPasswordDialog();
    // 应用已经初始化，不需要再调用 initializeApp
  }

  async updateMasterPasswordStatus() {
    try {
      const result = await window.electronAPI.masterPassword.has();
      const statusText = document.getElementById('masterPasswordStatus');
      const setGroup = document.getElementById('setMasterPasswordGroup');
      const changeGroup = document.getElementById('changeMasterPasswordGroup');
      
      if (result.hasPassword) {
        statusText.textContent = this.t('settings.masterPasswordSet');
        statusText.style.color = '#4caf50';
        setGroup.style.display = 'none';
        changeGroup.style.display = 'block';
      } else {
        statusText.textContent = this.t('settings.masterPasswordNotSet');
        statusText.style.color = '#888';
        setGroup.style.display = 'block';
        changeGroup.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check master password status:', error);
    }
  }

  // 加载语言设置
  loadLanguageSettings() {
    const currentLang = window.i18n.getCurrentLanguage();
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = currentLang;
    }
  }

  // 保存语言设置
  saveLanguageSettings() {
    const languageSelect = document.getElementById('languageSelect');
    const newLang = languageSelect.value;
    const oldLang = window.i18n.getCurrentLanguage();
    
    if (newLang !== oldLang) {
      window.i18n.setLanguage(newLang);
      // 立即更新界面语言
      window.i18n.updatePageLanguage();
      this.showNotification('notify.languageChanged', 'success');
    }
  }

  showChangeMasterPasswordDialog() {
    // 先隐藏设置对话框
    document.getElementById('settingsDialog').style.display = 'none';
    
    // 创建修改主密码的对话框
    const dialog = document.getElementById('masterPasswordDialog');
    const title = document.getElementById('masterPasswordTitle');
    const form = document.getElementById('masterPasswordForm');
    const confirmGroup = document.getElementById('masterPasswordConfirmGroup');
    const hint = document.getElementById('masterPasswordHint');
    const skipBtn = document.getElementById('masterPasswordSkipBtn');
    const cancelBtn = document.getElementById('masterPasswordCancelBtn');
    
    // 重置表单
    form.reset();
    
    // 添加旧密码输入框
    let oldPasswordGroup = document.getElementById('oldPasswordGroup');
    if (!oldPasswordGroup) {
      oldPasswordGroup = document.createElement('div');
      oldPasswordGroup.className = 'form-group';
      oldPasswordGroup.id = 'oldPasswordGroup';
      oldPasswordGroup.innerHTML = `
        <label for="oldPassword" data-i18n="masterPassword.oldPassword">${this.t('masterPassword.oldPassword')}</label>
        <input type="password" id="oldPassword" data-i18n-placeholder="masterPassword.oldPasswordPlaceholder" placeholder="${this.t('masterPassword.oldPasswordPlaceholder')}" />
      `;
      document.getElementById('masterPasswordGroup').after(oldPasswordGroup);
    }
    
    title.textContent = this.t('masterPassword.titleChange');
    oldPasswordGroup.style.display = 'block';
    document.getElementById('masterPasswordGroup').querySelector('label').textContent = this.t('masterPassword.newPassword');
    document.getElementById('masterPassword').placeholder = this.t('masterPassword.newPasswordPlaceholder');
    confirmGroup.style.display = 'block';
    hint.textContent = this.t('masterPassword.hintChange');
    skipBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';
    
    // 修改表单提交处理
    const oldHandler = form.onsubmit;
    form.onsubmit = async (e) => {
      e.preventDefault();
      await this.handleChangeMasterPassword();
    };
    
    dialog.style.display = 'flex';
    document.getElementById('oldPassword').focus();
    
    // 关闭时恢复
    const closeHandler = () => {
      oldPasswordGroup.style.display = 'none';
      document.getElementById('masterPasswordGroup').querySelector('label').textContent = this.t('masterPassword.password');
      document.getElementById('masterPassword').placeholder = this.t('masterPassword.passwordPlaceholder');
      form.onsubmit = oldHandler;
      // 恢复设置对话框
      document.getElementById('settingsDialog').style.display = 'flex';
    };
    
    cancelBtn.onclick = () => {
      this.hideMasterPasswordDialog();
      closeHandler();
    };
  }

  async handleChangeMasterPassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('masterPassword').value;
    const confirmPassword = document.getElementById('masterPasswordConfirm').value;
    
    if (!oldPassword) {
      this.showNotification('notify.oldPasswordRequired', 'error');
      return;
    }
    
    if (!newPassword) {
      this.showNotification('notify.newPasswordRequired', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      this.showNotification('notify.passwordMismatch', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      this.showNotification('notify.passwordTooShort', 'error');
      return;
    }
    
    const result = await window.electronAPI.masterPassword.change(oldPassword, newPassword);
    if (result.success) {
      this.showNotification('notify.masterPasswordChanged', 'success');
      this.hideMasterPasswordDialog();
      document.getElementById('oldPasswordGroup').style.display = 'none';
      // 恢复标签和占位符
      document.getElementById('masterPasswordGroup').querySelector('label').textContent = this.t('masterPassword.password');
      document.getElementById('masterPassword').placeholder = this.t('masterPassword.passwordPlaceholder');
      // 恢复设置对话框
      document.getElementById('settingsDialog').style.display = 'flex';
      this.updateMasterPasswordStatus();
    } else {
      this.showNotification('notify.operationFailed', 'error');
    }
  }

  // 更新分组选择器（辅助方法）
  updateGroupSelect(selectedGroup = '') {
    const groupSelect = document.getElementById('sessionGroup');
    groupSelect.innerHTML = `<option value="">${this.t('group.default')}</option>`;
    
    // 按层级排序分组
    const sortedGroups = [...this.sessionGroups].sort((a, b) => {
      const aDepth = (a.match(/\//g) || []).length;
      const bDepth = (b.match(/\//g) || []).length;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.localeCompare(b);
    });
    
    sortedGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      // 根据层级添加缩进
      const depth = (group.match(/\//g) || []).length;
      const indent = '　'.repeat(depth); // 使用全角空格缩进
      const displayName = group.split('/').pop(); // 只显示最后一级名称
      option.textContent = indent + displayName;
      if (group === selectedGroup) {
        option.selected = true;
      }
      groupSelect.appendChild(option);
    });
  }

  showConnectDialog() {
    // 重置编辑模式
    this.editingSessionId = null;
    document.querySelector('#connectDialog h3').textContent = this.t('connect.titleNew');
    document.getElementById('connectSubmitBtn').textContent = this.t('connect.btnConnect');
    document.getElementById('saveOnlyBtn').style.display = 'inline-block';
    document.getElementById('saveSession').parentElement.style.display = 'block';
    
    // 更新分组下拉列表
    this.updateGroupSelect();

    // 重置颜色选择
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    document.querySelector('.color-option[data-color=""]').classList.add('selected');
    document.getElementById('sessionColor').value = '';

    document.getElementById('connectDialog').style.display = 'flex';
  }

  hideConnectDialog() {
    document.getElementById('connectDialog').style.display = 'none';
    document.getElementById('connectForm').reset();
  }

  async handleConnect() {
    const config = {
      host: document.getElementById('host').value,
      port: parseInt(document.getElementById('port').value),
      username: document.getElementById('username').value,
      name: document.getElementById('sessionName').value || `${document.getElementById('username').value}@${document.getElementById('host').value}`,
      group: document.getElementById('sessionGroup').value,
      color: document.getElementById('sessionColor').value
    };

    const authType = document.getElementById('authType').value;
    if (authType === 'password') {
      config.password = document.getElementById('password').value;
    } else {
      config.privateKey = document.getElementById('privateKey').value;
    }

    const shouldSave = document.getElementById('saveSession').checked;

    // 如果是编辑模式，更新现有会话
    if (this.editingSessionId) {
      const index = this.savedSessions.findIndex(s => s.id === this.editingSessionId);
      if (index > -1) {
        config.id = this.editingSessionId;
        this.savedSessions[index] = config;
        
        // 如果是新分组，添加到分组列表
        if (config.group && !this.sessionGroups.includes(config.group)) {
          this.sessionGroups.push(config.group);
        }
        
        await window.electronAPI.session.save(this.savedSessions);
        this.renderSessionList();
        
        // 保存后创建连接
        try {
          const result = await window.electronAPI.ssh.connect(config);
          
          if (result.success) {
            this.createTerminal(result.sessionId, config);
            this.hideConnectDialog();
            this.showNotification('notify.sessionUpdatedAndConnected', 'success');
          } else {
            this.hideConnectDialog();
            this.showNotification('notify.sessionUpdatedButConnectFailed', 'error');
          }
        } catch (error) {
          this.hideConnectDialog();
          this.showNotification('notify.sessionUpdatedButConnectError', 'error');
        }
        return;
      }
    }

    // 检查是否是分屏连接
    if (this.pendingSplitLayout) {
      const layout = this.pendingSplitLayout;
      this.pendingSplitLayout = null;
      
      // 创建分屏面板
      const result = await this.createSplitPane(this.activeSessionId, layout, config);
      
      if (result) {
        this.hideConnectDialog();
        this.showNotification('notify.splitCreated', 'success');
      }
      return;
    }

    try {
      const result = await window.electronAPI.ssh.connect(config);
      
      if (result.success) {
        // 保存会话配置
        if (shouldSave) {
          config.id = Date.now().toString();
          this.savedSessions.push(config);
          
          // 如果是新分组，添加到分组列表
          if (config.group && !this.sessionGroups.includes(config.group)) {
            this.sessionGroups.push(config.group);
          }
          
          await window.electronAPI.session.save(this.savedSessions);
          this.renderSessionList();
        }

        this.createTerminal(result.sessionId, config);
        this.hideConnectDialog();
      } else {
        this.showNotification('notify.connectFailed', 'error');
      }
    } catch (error) {
      this.showNotification('notify.connectError', 'error');
    }
  }

  async handleSaveOnly() {
    const config = {
      host: document.getElementById('host').value,
      port: parseInt(document.getElementById('port').value),
      username: document.getElementById('username').value,
      name: document.getElementById('sessionName').value || `${document.getElementById('username').value}@${document.getElementById('host').value}`,
      group: document.getElementById('sessionGroup').value
    };

    const authType = document.getElementById('authType').value;
    if (authType === 'password') {
      config.password = document.getElementById('password').value;
    } else {
      config.privateKey = document.getElementById('privateKey').value;
    }

    // 验证必填字段
    if (!config.host || !config.username) {
      this.showNotification('notify.requiredFieldsMissing', 'error');
      return;
    }

    // 如果是编辑模式，更新现有会话
    if (this.editingSessionId) {
      const index = this.savedSessions.findIndex(s => s.id === this.editingSessionId);
      if (index > -1) {
        config.id = this.editingSessionId;
        this.savedSessions[index] = config;
        
        // 如果是新分组，添加到分组列表
        if (config.group && !this.sessionGroups.includes(config.group)) {
          this.sessionGroups.push(config.group);
        }
        
        await window.electronAPI.session.save(this.savedSessions);
        this.renderSessionList();
        this.hideConnectDialog();
        this.showNotification('notify.sessionUpdated', 'success');
        return;
      }
    }

    // 新建会话
    config.id = Date.now().toString();
    this.savedSessions.push(config);
    
    // 如果是新分组，添加到分组列表
    if (config.group && !this.sessionGroups.includes(config.group)) {
      this.sessionGroups.push(config.group);
    }
    
    await window.electronAPI.session.save(this.savedSessions);
    this.renderSessionList();
    this.hideConnectDialog();
    this.showNotification('notify.sessionSaved', 'success');
  }

  createTerminal(sessionId, config) {
    // 加载保存的设置
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const themes = this.getPresetThemes();
    
    // 获取当前主题的终端配置
    let terminalConfig;
    if (settings.themeMode === 'custom' && settings.customTheme && settings.customTheme.terminal) {
      terminalConfig = settings.customTheme.terminal;
    } else if (settings.themeMode && themes[settings.themeMode]) {
      terminalConfig = themes[settings.themeMode].terminal;
    } else {
      // 默认使用深色主题的终端配置
      terminalConfig = themes.dark.terminal;
    }
    
    // 如果用户有自定义终端设置，覆盖主题的终端配置
    if (settings.terminal) {
      terminalConfig = {
        ...terminalConfig,
        fontSize: settings.terminal.fontSize || terminalConfig.fontSize,
        fontFamily: settings.terminal.fontFamily || terminalConfig.fontFamily,
        cursorStyle: settings.terminal.cursorStyle || terminalConfig.cursorStyle,
        cursorBlink: settings.terminal.cursorBlink !== undefined ? settings.terminal.cursorBlink : terminalConfig.cursorBlink,
        background: settings.terminal.background || terminalConfig.background,
        foreground: settings.terminal.foreground || terminalConfig.foreground,
        cursor: settings.terminal.cursor || terminalConfig.cursor
      };
    }
    
    const terminal = new window.Terminal({
      cursorBlink: terminalConfig.cursorBlink,
      fontSize: terminalConfig.fontSize,
      lineHeight: 1.2,
      fontFamily: terminalConfig.fontFamily,
      cursorStyle: terminalConfig.cursorStyle,
      theme: {
        background: terminalConfig.background,
        foreground: terminalConfig.foreground,
        cursor: terminalConfig.cursor,
        cursorAccent: terminalConfig.cursorAccent
      },
      scrollback: 1000,
      allowProposedApi: true,
      // 性能优化选项
      fastScrollModifier: 'shift',
      fastScrollSensitivity: 5,
      scrollSensitivity: 3,
      rendererType: 'canvas',
      disableStdin: false,
      windowsMode: false,
      windowOptions: {
        setWinSizePixels: false,
        setWinSizeChars: false
      },
      // 额外的性能优化
      convertEol: false,
      screenReaderMode: false,
      drawBoldTextInBrightColors: true,
      minimumContrastRatio: 1
    });

    const fitAddon = new window.FitAddon();
    const searchAddon = new window.SearchAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    // 创建终端容器
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';
    wrapper.id = `terminal-${sessionId}`;
    document.getElementById('terminalContainer').appendChild(wrapper);

    terminal.open(wrapper);
    
    // 延迟 fit 和 focus，确保 DOM 已渲染
    // 增加延迟时间，特别是在大屏幕上首次打开时
    setTimeout(() => {
      fitAddon.fit();
      terminal.focus();
      
      // fit 之后再通知 SSH 终端大小，增加延迟确保尺寸计算完成
      setTimeout(() => {
        if (terminal.cols && terminal.rows) {
          window.electronAPI.ssh.resize(sessionId, terminal.cols, terminal.rows);
        }
      }, 100);
    }, 200);

    // 监听终端输入
    terminal.onData((data) => {
      this.handleTerminalInput(sessionId, data);
    });

    // 添加自定义键盘事件处理器，处理粘贴和复制
    terminal.attachCustomKeyEventHandler((event) => {
      // Ctrl+V / Cmd+V 粘贴
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && event.type === 'keydown') {
        event.preventDefault();
        // 从剪贴板读取并粘贴
        navigator.clipboard.readText().then(text => {
          terminal.paste(text);
        }).catch(err => {
          console.error('Failed to read clipboard:', err);
        });
        return false; // 阻止默认行为
      }
      
      // Ctrl+C / Cmd+C：如果有选中文本则复制
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && event.type === 'keydown') {
        if (terminal.hasSelection()) {
          event.preventDefault();
          const selection = terminal.getSelection();
          navigator.clipboard.writeText(selection).catch(err => {
            console.error('Failed to write clipboard:', err);
          });
          return false; // 阻止默认行为
        }
        // 没有选中文本，让终端处理（发送 Ctrl+C）
      }
      
      // 其他按键正常处理
      return true;
    });

    this.terminals.set(sessionId, {
      terminal,
      fitAddon,
      searchAddon,
      sessionId,
      config
    });

    // 创建标签页
    this.createTab(sessionId, config);
    this.switchToSession(sessionId);
    
    // 显示终端工具栏（分屏按钮）
    document.getElementById('terminalToolbar').style.display = 'flex';
    
    // 连接成功后更新状态为已连接
    setTimeout(() => {
      this.updateTabStatus(sessionId, 'connected');
    }, 500);
  }

  createTab(sessionId, config) {
    const tabsContainer = document.getElementById('tabs');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = `tab-${sessionId}`;
    
    // 设置颜色属性
    if (config.color) {
      tab.setAttribute('data-color', config.color);
      tab.style.setProperty('--tab-color', config.color);
    }
    
    tab.innerHTML = `
      <span class="tab-status connecting" data-i18n-title="status.connecting" title="${this.t('status.connecting')}"></span>
      <span class="tab-name">${config.name || config.username + '@' + config.host}</span>
      <button class="tab-sftp-btn" data-session="${sessionId}" data-i18n-title="sftp.openTitle" title="${this.t('sftp.openTitle')}">📁</button>
      <span class="tab-close" data-session="${sessionId}">✕</span>
    `;

    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close') && !e.target.classList.contains('tab-sftp-btn')) {
        this.switchToSession(sessionId);
      }
    });

    // SFTP 按钮
    tab.querySelector('.tab-sftp-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSFTP(sessionId, config);
    });

    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeSession(sessionId);
    });

    tabsContainer.appendChild(tab);
  }

  switchToSession(sessionId) {
    // 隐藏 SFTP 容器，显示终端容器
    document.getElementById('sftpContainer').style.display = 'none';
    document.getElementById('terminalContainer').style.display = 'flex';

    // 取消所有标签的激活状态
    document.querySelectorAll('.tab').forEach(el => {
      el.classList.remove('active');
    });

    // 激活选中的标签
    const tab = document.getElementById(`tab-${sessionId}`);
    if (tab) tab.classList.add('active');

    this.activeSessionId = sessionId;

    // 检查是否是分屏会话
    if (this.splitSessions.has(sessionId)) {
      // 显示工具栏和关闭分屏按钮
      document.getElementById('terminalToolbar').style.display = 'flex';
      document.getElementById('closeSplitBtn').style.display = 'flex';
      
      // 隐藏所有普通终端
      document.querySelectorAll('.terminal-wrapper').forEach(el => {
        el.classList.remove('active');
      });
      
      // 隐藏所有其他会话的分屏容器
      document.querySelectorAll('.split-container').forEach(el => {
        if (el.id !== `split-${sessionId}`) {
          el.style.display = 'none';
        }
      });
      
      // 渲染当前会话的分屏
      this.renderSplitPanes(sessionId);
    } else {
      // 显示工具栏，但隐藏关闭分屏按钮
      document.getElementById('terminalToolbar').style.display = 'flex';
      document.getElementById('closeSplitBtn').style.display = 'none';
      
      // 隐藏所有分屏容器
      document.querySelectorAll('.split-container').forEach(el => {
        el.style.display = 'none';
      });
      
      // 隐藏所有终端
      document.querySelectorAll('.terminal-wrapper').forEach(el => {
        el.classList.remove('active');
      });

      // 激活选中的终端
      const terminalWrapper = document.getElementById(`terminal-${sessionId}`);
      if (terminalWrapper) {
        terminalWrapper.classList.add('active');
      }

      // 重新调整终端大小并聚焦
      const terminalData = this.terminals.get(sessionId);
      if (terminalData) {
        setTimeout(() => {
          terminalData.fitAddon.fit();
          // 自动聚焦到终端
          terminalData.terminal.focus();
          
          // fit 之后通知 SSH 终端大小
          setTimeout(() => {
            if (terminalData.terminal.cols && terminalData.terminal.rows) {
              window.electronAPI.ssh.resize(
                sessionId,
                terminalData.terminal.cols,
                terminalData.terminal.rows
              );
            }
          }, 50);
        }, 100);
      }
    }

    // 更新状态栏
    this.updateStatusBar(sessionId);
  }

  updateStatusBar(sessionId) {
    const terminalData = this.terminals.get(sessionId);
    if (!terminalData) {
      // 没有活动会话
      document.getElementById('statusConnectionText').textContent = this.t('status.notConnected');
      document.querySelector('#statusConnection .status-icon').className = 'status-icon disconnected';
      document.getElementById('statusSessionText').textContent = '';
      document.getElementById('statusInfoText').textContent = '';
      return;
    }

    const config = terminalData.config;
    const tab = document.getElementById(`tab-${sessionId}`);
    const statusSpan = tab?.querySelector('.tab-status');
    
    // 更新连接状态
    if (statusSpan?.classList.contains('connected')) {
      document.getElementById('statusConnectionText').textContent = this.t('status.connected');
      document.querySelector('#statusConnection .status-icon').className = 'status-icon connected';
    } else if (statusSpan?.classList.contains('connecting')) {
      document.getElementById('statusConnectionText').textContent = this.t('status.connecting');
      document.querySelector('#statusConnection .status-icon').className = 'status-icon connecting';
    } else {
      document.getElementById('statusConnectionText').textContent = this.t('status.disconnected');
      document.querySelector('#statusConnection .status-icon').className = 'status-icon disconnected';
    }

    // 更新会话信息
    const sessionInfo = `${config.username}@${config.host}:${config.port}`;
    document.getElementById('statusSessionText').textContent = sessionInfo;

    // 更新其他信息（可以后续扩展）
    document.getElementById('statusInfoText').textContent = '';
  }

  async closeSession(sessionId, skipStatusUpdate = false) {
    // 标记为用户主动断开
    if (!skipStatusUpdate) {
      this.userDisconnectedSessions.add(sessionId);
    }
    
    // 清理重连状态
    this.clearReconnectState(sessionId);
    
    // 清理命令缓冲区
    this.commandBuffers.delete(sessionId);
    
    // 更新状态为断开（除非是自动关闭）
    if (!skipStatusUpdate) {
      this.updateTabStatus(sessionId, 'disconnected');
    }
    
    // 获取终端数据
    const terminalData = this.terminals.get(sessionId);
    
    // 检查是否为本地 Shell
    if (terminalData && terminalData.type === 'local') {
      // 关闭本地 Shell
      await window.electronAPI.localShell.kill(sessionId);
    } else {
      // 获取实际的 SSH sessionId（可能重连后变了）
      const actualSessionId = terminalData ? (terminalData.sessionId || sessionId) : sessionId;
      await window.electronAPI.ssh.disconnect(actualSessionId);
    }
    
    if (terminalData) {
      terminalData.terminal.dispose();
      this.terminals.delete(sessionId);
    }

    // 延迟删除，让用户看到断开状态
    const delay = skipStatusUpdate ? 0 : 300;
    setTimeout(() => {
      const terminalWrapper = document.getElementById(`terminal-${sessionId}`);
      const tab = document.getElementById(`tab-${sessionId}`);
      
      if (terminalWrapper) terminalWrapper.remove();
      if (tab) tab.remove();

      // 如果关闭的是当前会话，切换到其他会话
      if (this.activeSessionId === sessionId) {
        const remainingSessions = Array.from(this.terminals.keys());
        if (remainingSessions.length > 0) {
          this.switchToSession(remainingSessions[0]);
        } else {
          this.activeSessionId = null;
        }
      }
    }, delay);
  }

  handleSSHData(data) {
    const { sessionId, data: output } = data;
    
    // 先尝试直接查找
    let terminalData = this.terminals.get(sessionId);
    
    // 如果找不到，可能是重连后 sessionId 变了
    // 遍历所有 terminals，找到 sessionId 匹配的
    if (!terminalData) {
      for (const [mapKey, tData] of this.terminals) {
        if (tData.sessionId === sessionId) {
          terminalData = tData;
          break;
        }
      }
    }
    
    if (terminalData && output) {
      terminalData.terminal.write(output);
    }
  }

  handleSSHClosed(data) {
    const { sessionId } = data;
    
    // 先尝试直接查找
    let terminalData = this.terminals.get(sessionId);
    let mapKey = sessionId;
    
    // 如果找不到，可能是重连后 sessionId 变了
    // 遍历所有 terminals，找到 sessionId 匹配的
    if (!terminalData) {
      for (const [key, tData] of this.terminals) {
        if (tData.sessionId === sessionId) {
          terminalData = tData;
          mapKey = key;
          break;
        }
      }
    }
    
    // 检查是否为用户主动断开
    if (this.userDisconnectedSessions.has(sessionId) || this.userDisconnectedSessions.has(mapKey)) {
      this.userDisconnectedSessions.delete(sessionId);
      this.userDisconnectedSessions.delete(mapKey);
      this.cleanupSession(mapKey);
      return;
    }
    
    // 更新标签页状态为断开（使用 mapKey，因为 DOM 元素用的是原始 sessionId）
    this.updateTabStatus(mapKey, 'disconnected');
    
    if (terminalData) {
      // 标记为已断开，阻止发送数据
      terminalData.disconnected = true;
      
      // 显示断开消息和重连提示
      terminalData.terminal.write('\r\n\x1b[31m[连接已断开]\x1b[0m\r\n');
      terminalData.terminal.write('\x1b[33m按 Enter 键重新连接，或关闭此标签页\x1b[0m\r\n');
      
      // 保存重连标记
      terminalData.waitingForReconnect = true;
    }
  }
  
  async reconnectSession(sessionId) {
    const terminalData = this.terminals.get(sessionId);
    if (!terminalData) return;
    
    const config = terminalData.config;
    
    try {
      terminalData.terminal.write('\r\n\x1b[33m[正在重新连接...]\x1b[0m\r\n');
      this.updateTabStatus(sessionId, 'connecting');
      
      // 建立新连接
      const result = await window.electronAPI.ssh.connect(config);
      
      if (result.success) {
        const newSessionId = result.sessionId;
        
        // 只更新 terminalData.sessionId 用于发送数据
        // 不更新 Map 的 key，不更新任何 DOM id
        // 这样所有查找逻辑都不受影响
        terminalData.sessionId = newSessionId;
        terminalData.disconnected = false;
        terminalData.waitingForReconnect = false;
        
        terminalData.terminal.write('\r\n\x1b[32m[重连成功]\x1b[0m\r\n');
        this.updateTabStatus(sessionId, 'connected');
        this.showNotification('notify.reconnectSuccess', 'success');
      } else {
        terminalData.terminal.write(`\r\n\x1b[31m[重连失败: ${result.error}]\x1b[0m\r\n`);
        terminalData.terminal.write('\x1b[33m按 Enter 键重试\x1b[0m\r\n');
        this.updateTabStatus(sessionId, 'disconnected');
        terminalData.waitingForReconnect = true;
      }
    } catch (error) {
      terminalData.terminal.write(`\r\n\x1b[31m[重连失败: ${error.message}]\x1b[0m\r\n`);
      terminalData.terminal.write('\x1b[33m按 Enter 键重试\x1b[0m\r\n');
      this.updateTabStatus(sessionId, 'disconnected');
      terminalData.waitingForReconnect = true;
    }
  }

  shouldAutoReconnect(sessionId) {
    // 禁用自动重连
    return false;
  }

  startReconnect(sessionId) {
    const terminalData = this.terminals.get(sessionId);
    if (!terminalData) return;
    
    // 获取设置
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const maxAttempts = settings.maxReconnectAttempts || 5;
    const initialInterval = settings.reconnectInterval || 2000;
    
    // 初始化或获取重连配置
    let config = this.reconnectConfig.get(sessionId);
    if (!config) {
      config = {
        attempts: 0,
        interval: initialInterval,
        maxAttempts: maxAttempts,
        config: terminalData.config
      };
      this.reconnectConfig.set(sessionId, config);
    }
    
    config.attempts++;
    
    // 显示重连提示
    this.showReconnectNotification(sessionId, config);
    
    // 更新标签页状态为重连中
    this.updateTabStatus(sessionId, 'reconnecting');
    
    // 设置重连定时器
    config.timer = setTimeout(() => {
      this.attemptReconnect(sessionId);
    }, config.interval);
  }

  showReconnectNotification(sessionId, config) {
    const notification = document.getElementById('reconnectNotification');
    const message = document.getElementById('reconnectMessage');
    
    const countdown = Math.ceil(config.interval / 1000);
    message.textContent = `正在重连... (${config.attempts}/${config.maxAttempts}) - ${countdown}秒后重试`;
    
    notification.style.display = 'flex';
    notification.dataset.sessionId = sessionId;
    
    // 倒计时更新
    let remaining = countdown;
    const countdownTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        message.textContent = `正在重连... (${config.attempts}/${config.maxAttempts}) - ${remaining}秒后重试`;
      } else {
        clearInterval(countdownTimer);
      }
    }, 1000);
    
    // 保存定时器以便取消
    config.countdownTimer = countdownTimer;
  }

  hideReconnectNotification() {
    const notification = document.getElementById('reconnectNotification');
    notification.style.display = 'none';
    notification.dataset.sessionId = '';
  }

  async attemptReconnect(sessionId) {
    const config = this.reconnectConfig.get(sessionId);
    if (!config) return;
    
    const terminalData = this.terminals.get(sessionId);
    if (!terminalData) {
      this.clearReconnectState(sessionId);
      return;
    }
    
    try {
      // 在终端显示重连尝试
      terminalData.terminal.write(`\r\n\x1b[33m[尝试重连... (${config.attempts}/${config.maxAttempts})]\x1b[0m\r\n`);
      
      // 尝试重新连接
      const result = await window.electronAPI.ssh.connect(config.config);
      
      if (result.success) {
        // 重连成功
        terminalData.terminal.write('\r\n\x1b[32m[重连成功]\x1b[0m\r\n');
        this.showNotification('notify.reconnectSuccess', 'success');
        this.updateTabStatus(sessionId, 'connected');
        this.clearReconnectState(sessionId);
        
        // 重新调整终端大小
        setTimeout(() => {
          if (terminalData.fitAddon && terminalData.terminal) {
            terminalData.fitAddon.fit();
            setTimeout(() => {
              if (terminalData.terminal.cols && terminalData.terminal.rows) {
                window.electronAPI.ssh.resize(
                  result.sessionId,
                  terminalData.terminal.cols,
                  terminalData.terminal.rows
                );
              }
            }, 50);
          }
        }, 100);
        
        // 更新 sessionId（可能变化了）
        if (result.sessionId !== sessionId) {
          // 处理 sessionId 变化的情况
          this.terminals.set(result.sessionId, terminalData);
          this.terminals.delete(sessionId);
        }
      } else {
        throw new Error(result.error || this.t('connection.failed'));
      }
      
    } catch (error) {
      // 重连失败
      terminalData.terminal.write(`\r\n\x1b[31m[重连失败: ${error.message}]\x1b[0m\r\n`);
      
      if (config.attempts >= config.maxAttempts) {
        // 达到最大次数
        terminalData.terminal.write('\r\n\x1b[31m[已达到最大重连次数，停止重连]\x1b[0m\r\n');
        this.showNotification('notify.reconnectMaxAttempts', 'error');
        this.clearReconnectState(sessionId);
        
        // 3秒后关闭标签页
        setTimeout(() => {
          this.closeSession(sessionId, true);
        }, 3000);
      } else {
        // 继续重连，使用指数退避
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const maxInterval = settings.maxReconnectInterval || 30000;
        config.interval = Math.min(config.interval * 2, maxInterval);
        this.startReconnect(sessionId);
      }
    }
  }

  cancelReconnect(sessionId) {
    const config = this.reconnectConfig.get(sessionId);
    if (config) {
      if (config.timer) {
        clearTimeout(config.timer);
      }
      if (config.countdownTimer) {
        clearInterval(config.countdownTimer);
      }
    }
    
    this.clearReconnectState(sessionId);
    
    const terminalData = this.terminals.get(sessionId);
    if (terminalData) {
      terminalData.terminal.write('\r\n\x1b[33m[已取消自动重连]\x1b[0m\r\n');
    }
    
    // 3秒后关闭标签页
    setTimeout(() => {
      this.closeSession(sessionId, true);
    }, 3000);
  }

  clearReconnectState(sessionId) {
    const config = this.reconnectConfig.get(sessionId);
    if (config) {
      if (config.timer) {
        clearTimeout(config.timer);
      }
      if (config.countdownTimer) {
        clearInterval(config.countdownTimer);
      }
    }
    this.reconnectConfig.delete(sessionId);
    this.hideReconnectNotification();
  }

  cleanupSession(sessionId) {
    // 清理重连状态
    this.clearReconnectState(sessionId);
    
    // 更新标签页状态
    this.updateTabStatus(sessionId, 'disconnected');
    
    // 在终端显示断开消息
    const terminalData = this.terminals.get(sessionId);
    if (terminalData) {
      terminalData.terminal.write('\r\n\x1b[31m[连接已断开]\x1b[0m\r\n');
    }
    
    // 3秒后自动关闭标签页
    setTimeout(() => {
      this.closeSession(sessionId, true);
    }, 3000);
  }

  reconnectNow(sessionId) {
    const config = this.reconnectConfig.get(sessionId);
    if (!config) return;
    
    // 取消当前的定时器
    if (config.timer) {
      clearTimeout(config.timer);
    }
    if (config.countdownTimer) {
      clearInterval(config.countdownTimer);
    }
    
    // 立即尝试重连
    this.attemptReconnect(sessionId);
  }

  async loadSessions() {
    const result = await window.electronAPI.session.load();
    
    if (result.success && result.sessions) {
      this.savedSessions = result.sessions;
      
      // 提取所有分组
      this.sessionGroups = [...new Set(this.savedSessions
        .map(s => s.group)
        .filter(g => g))];
      
      this.renderSessionList();
    }
  }

  // 保存折叠状态到 localStorage
  saveCollapsedGroups() {
    const collapsed = Array.from(this.collapsedGroups);
    localStorage.setItem('collapsedGroups', JSON.stringify(collapsed));
  }

  // 从 localStorage 加载折叠状态
  loadCollapsedGroups() {
    try {
      const saved = localStorage.getItem('collapsedGroups');
      if (saved) {
        const collapsed = JSON.parse(saved);
        this.collapsedGroups = new Set(collapsed);
      }
    } catch (error) {
      console.error('Failed to load collapsed groups:', error);
      this.collapsedGroups = new Set();
    }
  }

  renderSessionList() {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = '';

    // 按分组组织会话
    const groupedSessions = {};
    
    // 初始化所有分组（包括空分组）
    this.sessionGroups.forEach(group => {
      groupedSessions[group] = [];
    });
    
    // 添加默认分组（使用空字符串作为内部标识）
    groupedSessions[''] = [];
    
    // 分配会话到分组，并应用搜索过滤
    this.savedSessions.forEach(session => {
      // 搜索过滤
      if (this.searchQuery) {
        const searchText = `${session.name} ${session.host} ${session.username} ${session.group}`.toLowerCase();
        if (!searchText.includes(this.searchQuery)) {
          return;
        }
      }

      // 使用空字符串作为默认分组的内部标识
      const group = session.group || '';
      if (!groupedSessions[group]) {
        groupedSessions[group] = [];
      }
      groupedSessions[group].push(session);
    });

    // 构建分组树结构
    const groupTree = this.buildGroupTree(groupedSessions);
    
    // 渲染分组树
    this.renderGroupTree(sessionList, groupTree, '', 0);
  }

  // 构建分组树结构
  buildGroupTree(groupedSessions) {
    const tree = {};
    
    Object.keys(groupedSessions).forEach(groupPath => {
      const sessions = groupedSessions[groupPath];
      
      // 如果是默认分组（空字符串）
      if (groupPath === '') {
        const defaultGroupName = this.t('group.default');
        tree[defaultGroupName] = {
          name: defaultGroupName,
          fullPath: '', // 内部使用空字符串
          children: {},
          sessions: sessions,
          isDefault: true // 标记为默认分组
        };
        return;
      }
      
      const parts = groupPath.split('/').filter(p => p);
      
      // 构建路径上的所有节点
      let current = tree;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            fullPath: parts.slice(0, index + 1).join('/'),
            children: {},
            sessions: [],
            isDefault: false
          };
        }
        
        // 如果是最后一个部分，设置会话
        if (index === parts.length - 1) {
          current[part].sessions = sessions;
        }
        
        // 移动到下一级
        current = current[part].children;
      });
    });
    
    return tree;
  }

  // 渲染分组树
  renderGroupTree(container, tree, parentPath, level = 0) {
    // 自定义排序：默认分组始终在最后，其他按名称排序
    const sortedKeys = Object.keys(tree).sort((a, b) => {
      const nodeA = tree[a];
      const nodeB = tree[b];
      
      // 默认分组排在最后
      if (nodeA.isDefault) return 1;
      if (nodeB.isDefault) return -1;
      
      // 其他按名称排序
      return a.localeCompare(b, 'zh-CN');
    });
    
    sortedKeys.forEach(key => {
      const node = tree[key];
      const groupName = node.name;
      const fullPath = node.fullPath;
      const sessions = node.sessions || [];
      const hasChildren = Object.keys(node.children).length > 0;
      
      // 如果搜索时分组和子分组都为空，跳过
      if (this.searchQuery && sessions.length === 0 && !hasChildren) {
        return;
      }

      const isCollapsed = this.collapsedGroups.has(fullPath);
      
      const groupDiv = document.createElement('div');
      groupDiv.className = 'session-group';
      groupDiv.style.marginLeft = `${level * 16}px`;
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.dataset.groupPath = fullPath;
      groupHeader.innerHTML = `
        <div class="group-title">
          <span class="group-toggle ${isCollapsed ? 'collapsed' : ''}">${hasChildren || sessions.length > 0 ? '▼' : '•'}</span>
          <span class="group-name">${groupName}</span>
          <span class="group-count">(${sessions.length})</span>
        </div>
        <div class="group-actions">
          ${fullPath !== '' ? `<button class="add-subgroup-btn" title="${this.t('group.addSubgroup')}" data-i18n-title="group.addSubgroup">+</button>` : ''}
          ${fullPath !== '' ? `<button class="rename-group-btn" data-i18n="group.rename">${this.t('group.rename')}</button>` : ''}
          ${fullPath !== '' ? `<button class="delete-group-btn" data-i18n="group.delete">${this.t('group.delete')}</button>` : ''}
        </div>
      `;

      // 拖拽悬停在分组上
      groupHeader.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        groupHeader.classList.add('drag-over');
      });

      // 拖拽离开分组
      groupHeader.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 只有当真正离开分组头部时才移除样式
        if (e.target === groupHeader || !groupHeader.contains(e.relatedTarget)) {
          groupHeader.classList.remove('drag-over');
        }
      });

      // 放置到分组
      groupHeader.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        groupHeader.classList.remove('drag-over');
        
        const sessionId = e.dataTransfer.getData('application/session-id');
        const currentGroup = e.dataTransfer.getData('application/current-group');
        const targetGroup = fullPath;
        
        if (sessionId && currentGroup !== targetGroup) {
          this.moveSessionToGroup(sessionId, targetGroup);
        }
      });

      // 切换折叠状态
      groupHeader.addEventListener('click', (e) => {
        if (e.target.closest('.group-actions')) return;
        
        if (this.collapsedGroups.has(fullPath)) {
          this.collapsedGroups.delete(fullPath);
        } else {
          this.collapsedGroups.add(fullPath);
        }
        this.saveCollapsedGroups();
        this.renderSessionList();
      });

      // 添加子分组
      const addSubgroupBtn = groupHeader.querySelector('.add-subgroup-btn');
      if (addSubgroupBtn) {
        addSubgroupBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.createSubGroup(fullPath);
        });
      }

      // 重命名分组
      const renameBtn = groupHeader.querySelector('.rename-group-btn');
      if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.renameGroup(fullPath);
        });
      }

      // 删除分组
      const deleteBtn = groupHeader.querySelector('.delete-group-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteGroup(fullPath);
        });
      }

      groupDiv.appendChild(groupHeader);

      // 会话列表和子分组容器
      if (!isCollapsed) {
        // 先渲染会话
        if (sessions.length > 0) {
          const sessionsDiv = document.createElement('div');
          sessionsDiv.className = 'group-sessions';
          
          sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'session-item';
            item.draggable = true; // 使会话项可拖拽
            item.dataset.sessionId = session.id;
            item.dataset.currentGroup = fullPath;
            
            // 高亮搜索结果
            if (this.searchQuery) {
              item.classList.add('highlight');
            }

            item.innerHTML = `
              <span>${session.name || session.username + '@' + session.host}</span>
            `;

            // 拖拽开始
            item.addEventListener('dragstart', (e) => {
              e.stopPropagation();
              item.classList.add('dragging');
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', session.id);
              e.dataTransfer.setData('application/session-id', session.id);
              e.dataTransfer.setData('application/current-group', fullPath);
            });

            // 拖拽结束
            item.addEventListener('dragend', (e) => {
              item.classList.remove('dragging');
              // 移除所有拖拽悬停效果
              document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
              });
            });

            // 双击快速连接
            item.addEventListener('dblclick', () => {
              this.connectSavedSession(session);
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.showSessionContextMenu(e, session);
            });

            sessionsDiv.appendChild(item);
          });
          
          groupDiv.appendChild(sessionsDiv);
        } else if (!hasChildren) {
          // 只有在没有子分组且没有会话时才显示空状态
          const sessionsDiv = document.createElement('div');
          sessionsDiv.className = 'group-sessions';
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'empty-group';
          emptyDiv.textContent = this.t('group.empty');
          sessionsDiv.appendChild(emptyDiv);
          groupDiv.appendChild(sessionsDiv);
        }
        
        // 再递归渲染子分组（子分组会添加到当前 groupDiv 的父容器中，但带有缩进）
        if (hasChildren) {
          // 将子分组添加到主容器，但在当前分组之后
          container.appendChild(groupDiv);
          this.renderGroupTree(container, node.children, fullPath, level + 1);
          return; // 提前返回，避免重复添加 groupDiv
        }
      }

      container.appendChild(groupDiv);
    });
  }

  // 创建子分组
  createSubGroup(parentPath) {
    this.showInputDialog(
      this.t('group.addSubgroupTitle'),
      this.t('group.addSubgroupPrompt'),
      '',
      (subGroupName) => {
        if (!subGroupName) return;
        
        // 如果父分组是默认分组（空字符串），子分组直接作为顶级分组
        const fullPath = (parentPath && parentPath !== '') ? `${parentPath}/${subGroupName}` : subGroupName;
        
        if (this.sessionGroups.includes(fullPath)) {
          this.showAlert(this.t('group.alreadyExists'));
          return;
        }

        this.sessionGroups.push(fullPath);
        this.renderSessionList();
      }
    );
  }

  createNewGroup() {
    this.showInputDialog(this.t('group.newTitle'), this.t('group.newPrompt'), '', (groupName) => {
      if (!groupName) return;
      
      if (this.sessionGroups.includes(groupName)) {
        this.showAlert(this.t('group.alreadyExists'));
        return;
      }

      this.sessionGroups.push(groupName);
      this.renderSessionList();
    });
  }

  async renameGroup(oldName) {
    this.showInputDialog(this.t('group.renameTitle'), this.t('group.renamePrompt'), oldName, async (newName) => {
      if (!newName || newName === oldName) return;

      if (this.sessionGroups.includes(newName)) {
        this.showAlert(this.t('group.nameExists'));
        return;
      }

      // 更新所有会话的分组名
      this.savedSessions.forEach(session => {
        if (session.group === oldName) {
          session.group = newName;
        }
      });

      // 更新分组列表
      const index = this.sessionGroups.indexOf(oldName);
      if (index > -1) {
        this.sessionGroups[index] = newName;
      }

      await window.electronAPI.session.save(this.savedSessions);
      this.renderSessionList();
    });
  }

  async deleteGroup(groupName) {
    // 查找该分组及其所有子分组的会话
    const affectedSessions = this.savedSessions.filter(s => 
      s.group === groupName || s.group?.startsWith(groupName + '/')
    );
    
    // 查找所有子分组
    const affectedGroups = this.sessionGroups.filter(g => 
      g === groupName || g.startsWith(groupName + '/')
    );
    
    if (affectedSessions.length > 0) {
      const message = affectedGroups.length > 1 
        ? this.t('group.deleteWithSubgroupsMessage')
            .replace('{name}', groupName)
            .replace('{count}', affectedSessions.length)
            .replace('{subcount}', affectedGroups.length - 1)
        : this.t('group.deleteMessage')
            .replace('{name}', groupName)
            .replace('{count}', affectedSessions.length);
      
      this.showConfirmDialog(
        this.t('group.deleteTitle'),
        message,
        async () => {
          // 将会话移至默认分组
          this.savedSessions.forEach(session => {
            if (session.group === groupName || session.group?.startsWith(groupName + '/')) {
              session.group = '';
            }
          });

          // 删除分组及其所有子分组
          this.sessionGroups = this.sessionGroups.filter(g => 
            g !== groupName && !g.startsWith(groupName + '/')
          );

          await window.electronAPI.session.save(this.savedSessions);
          this.renderSessionList();
        }
      );
    } else {
      // 直接删除空分组及其子分组
      this.sessionGroups = this.sessionGroups.filter(g => 
        g !== groupName && !g.startsWith(groupName + '/')
      );
      this.renderSessionList();
    }
  }

  // 移动会话到指定分组
  async moveSessionToGroup(sessionId, targetGroup) {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    const oldGroup = session.group || this.t('group.default');
    const newGroup = targetGroup || this.t('group.default');
    
    // 如果目标分组和当前分组相同，不做任何操作
    if (session.group === targetGroup) {
      return;
    }

    // 更新会话的分组
    session.group = targetGroup;

    // 保存到存储
    await window.electronAPI.session.save(this.savedSessions);
    
    // 重新渲染列表
    this.renderSessionList();

    // 显示通知
    const sessionName = session.name || `${session.username}@${session.host}`;
    this.showNotification(
      this.t('group.moveSuccess')
        .replace('{session}', sessionName)
        .replace('{from}', oldGroup)
        .replace('{to}', newGroup),
      'success'
    );
  }

  // 自定义对话框方法
  showInputDialog(title, message, defaultValue, callback) {
    const dialog = document.getElementById('inputDialog');
    const titleEl = document.getElementById('inputDialogTitle');
    const inputEl = document.getElementById('inputDialogValue');
    const okBtn = document.getElementById('inputDialogOk');
    const cancelBtn = document.getElementById('inputDialogCancel');

    titleEl.textContent = title;
    inputEl.value = defaultValue;
    inputEl.placeholder = message;
    dialog.style.display = 'flex';
    
    setTimeout(() => inputEl.focus(), 100);

    const handleOk = () => {
      const value = inputEl.value.trim();
      dialog.style.display = 'none';
      cleanup();
      callback(value);
    };

    const handleCancel = () => {
      dialog.style.display = 'none';
      cleanup();
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleOk();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    const cleanup = () => {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      inputEl.removeEventListener('keypress', handleKeyPress);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    inputEl.addEventListener('keypress', handleKeyPress);
  }

  showConfirmDialog(title, message, callback) {
    const dialog = document.getElementById('confirmDialog');
    const titleEl = document.getElementById('confirmDialogTitle');
    const messageEl = document.getElementById('confirmDialogMessage');
    const okBtn = document.getElementById('confirmDialogOk');
    const cancelBtn = document.getElementById('confirmDialogCancel');

    titleEl.textContent = title;
    messageEl.textContent = message;
    dialog.style.display = 'flex';

    // 如果没有提供回调函数，返回 Promise
    if (!callback) {
      return new Promise((resolve) => {
        const handleOk = () => {
          dialog.style.display = 'none';
          cleanup();
          resolve(true);
        };

        const handleCancel = () => {
          dialog.style.display = 'none';
          cleanup();
          resolve(false);
        };

        const cleanup = () => {
          okBtn.removeEventListener('click', handleOk);
          cancelBtn.removeEventListener('click', handleCancel);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
      });
    }

    // 兼容旧的回调方式
    const handleOk = () => {
      dialog.style.display = 'none';
      cleanup();
      callback();
    };

    const handleCancel = () => {
      dialog.style.display = 'none';
      cleanup();
    };

    const cleanup = () => {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
  }

  showSessionContextMenu(event, session) {
    const menu = document.getElementById('sessionContextMenu');
    
    if (!menu) {
      console.error('sessionContextMenu element not found');
      return;
    }
    
    // 显示菜单
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    // 移除之前的事件监听器
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);

    // 添加菜单项点击事件
    newMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        newMenu.style.display = 'none';

        switch(action) {
          case 'connect':
            this.connectSavedSession(session);
            break;
          case 'edit':
            this.editSession(session);
            break;
          case 'clone':
            this.cloneSession(session);
            break;
          case 'delete':
            this.showConfirmDialog(
              this.t('session.deleteTitle'),
              this.t('session.deleteMessage').replace('{name}', session.name),
              async () => {
                await this.deleteSavedSession(session.id);
              }
            );
            break;
        }
      });
    });

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!newMenu.contains(e.target)) {
        newMenu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  showAlert(message) {
    // 使用 Electron 的原生对话框
    alert(message);
  }

  // 导出配置
  async exportConfig() {
    try {
      const result = await window.electronAPI.session.export();
      
      if (result.success) {
        this.showAlert(this.t('session.exportSuccess').replace('{path}', result.filePath));
      } else {
        this.showAlert(this.t('session.exportFailed') + ': ' + result.error);
      }
    } catch (error) {
      this.showAlert(this.t('session.exportError') + ': ' + error.message);
    }
  }

  // 导入配置
  async importConfig() {
    this.showConfirmDialog(
      this.t('session.importTitle'),
      this.t('session.importMessage'),
      async () => {
        try {
          const result = await window.electronAPI.session.import();
          
          if (result.success) {
            // 重新加载会话
            await this.loadSessions();
            this.showNotification(this.t('notify.importSuccess').replace('{count}', result.count), 'success');
          } else if (result.error !== 'User canceled') {
            this.showNotification(this.t('notify.importFailed') + ': ' + result.error, 'error');
          }
        } catch (error) {
          this.showNotification(this.t('notify.importError') + ': ' + error.message, 'error');
        }
      }
    );
  }

  // 设置侧边栏拖拽调整宽度
  setupSidebarResizer() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('sidebar');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // 加载保存的宽度
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      sidebar.style.width = savedWidth + 'px';
    }

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      resizer.classList.add('resizing');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;
      
      // 限制宽度范围
      const minWidth = 200;
      const maxWidth = 600;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebar.style.width = newWidth + 'px';
        
        // 触发终端大小调整
        this.terminals.forEach((terminalData) => {
          if (terminalData.fitAddon && terminalData.terminal) {
            setTimeout(() => {
              terminalData.fitAddon.fit();
              
              const sessionId = terminalData.sessionId || Array.from(this.terminals.entries())
                .find(([_, data]) => data === terminalData)?.[0];
              
              if (sessionId && terminalData.terminal.cols && terminalData.terminal.rows) {
                window.electronAPI.ssh.resize(
                  sessionId, 
                  terminalData.terminal.cols, 
                  terminalData.terminal.rows
                );
              }
            }, 50);
          }
        });
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // 保存宽度
        localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
      }
    });
  }

  // 切换侧边栏显示/隐藏
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const expandBtn = document.getElementById('sidebarExpand');
    const isCollapsed = sidebar.classList.contains('collapsed');

    if (isCollapsed) {
      // 展开侧边栏
      sidebar.classList.remove('collapsed');
      expandBtn.style.display = 'none';
      // 保存状态
      localStorage.setItem('sidebarCollapsed', 'false');
    } else {
      // 收起侧边栏
      sidebar.classList.add('collapsed');
      expandBtn.style.display = 'flex';
      // 保存状态
      localStorage.setItem('sidebarCollapsed', 'true');
    }
  }

  // 加载侧边栏状态
  loadSidebarState() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
      const sidebar = document.getElementById('sidebar');
      const expandBtn = document.getElementById('sidebarExpand');
      sidebar.classList.add('collapsed');
      expandBtn.style.display = 'flex';
    }
  }

  showNotification(message, type = 'info') {
    // 如果 message 以 'notify.' 开头，尝试翻译
    let displayMessage = message;
    if (message.startsWith('notify.') && window.i18n) {
      displayMessage = window.i18n.t(message, message);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = displayMessage;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showAboutDialog() {
    const version = document.getElementById('statusVersion').textContent.replace('v', '');
    document.getElementById('aboutVersion').textContent = `v${version}`;
    document.getElementById('aboutDialog').style.display = 'flex';
  }

  // SFTP 批量下载选中文件
  async sftpDownloadSelected() {
    if (this.selectedFiles.size === 0) {
      this.showNotification('notify.selectFilesToDownload', 'info');
      return;
    }

    if (!this.activeSessionId || !this.activeSessionId.startsWith('sftp-')) return;

    const session = this.sftpSessions.get(this.activeSessionId);
    if (!session) return;

    this.showNotification(`准备下载 ${this.selectedFiles.size} 个文件...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (const fileName of this.selectedFiles) {
      const remotePath = this.currentSftpPath[this.activeSessionId] === '/' 
        ? `/${fileName}` 
        : `${this.currentSftpPath[this.activeSessionId]}/${fileName}`;

      const result = await window.electronAPI.sftp.download(session.sessionId, remotePath);
      
      if (result.success) {
        successCount++;
      } else if (result.error !== 'User canceled') {
        failCount++;
      }
    }

    if (successCount > 0) {
      this.showNotification(`成功下载 ${successCount} 个文件`, 'success');
    }
    if (failCount > 0) {
      this.showNotification(`${failCount} 个文件下载失败`, 'error');
    }

    // 清除选择
    this.selectedFiles.clear();
    this.updateSelectionCount();
    this.sftpRefresh();
  }

  // 全选/取消全选
  sftpToggleSelectAll() {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
      const fileName = cb.dataset.filename;
      const fileItem = cb.closest('.file-item');
      
      if (!allChecked) {
        this.selectedFiles.add(fileName);
        fileItem.classList.add('selected');
      } else {
        this.selectedFiles.delete(fileName);
        fileItem.classList.remove('selected');
      }
    });

    this.updateSelectionCount();
  }

  async connectSavedSession(config) {
    try {
      // 显示连接状态
      this.showNotification('notify.connecting', 'info');
      
      const result = await window.electronAPI.ssh.connect(config);
      
      if (result.success) {
        this.createTerminal(result.sessionId, config);
        this.showNotification('notify.connectSuccess', 'success');
      } else {
        this.showNotification(this.t('notify.connectFailed') + ': ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification(this.t('notify.connectError') + ': ' + error.message, 'error');
    }
  }

  async deleteSavedSession(sessionId) {
    this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId);
    await window.electronAPI.session.save(this.savedSessions);
    this.renderSessionList();
  }

  editSession(session) {
    // 填充表单
    document.getElementById('host').value = session.host;
    document.getElementById('port').value = session.port || 22;
    document.getElementById('username').value = session.username;
    document.getElementById('sessionName').value = session.name || '';
    
    // 设置认证方式
    const authType = session.password ? 'password' : 'key';
    document.getElementById('authType').value = authType;
    
    if (authType === 'password') {
      document.getElementById('password').value = session.password || '';
      document.getElementById('passwordGroup').style.display = 'block';
      document.getElementById('keyGroup').style.display = 'none';
    } else {
      document.getElementById('privateKey').value = session.privateKey || '';
      document.getElementById('passwordGroup').style.display = 'none';
      document.getElementById('keyGroup').style.display = 'block';
    }

    // 设置分组
    this.updateGroupSelect(session.group);

    // 设置颜色
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.remove('selected');
      if (opt.dataset.color === (session.color || '')) {
        opt.classList.add('selected');
      }
    });
    document.getElementById('sessionColor').value = session.color || '';

    // 隐藏"保存此会话配置"选项（编辑模式下自动保存）
    document.getElementById('saveSession').parentElement.style.display = 'none';
    document.getElementById('saveSession').checked = true;

    // 显示对话框，标记为编辑模式
    this.editingSessionId = session.id;
    document.querySelector('#connectDialog h3').textContent = this.t('connect.titleEdit');
    document.getElementById('connectSubmitBtn').textContent = this.t('connect.btnSaveAndConnect');
    document.getElementById('saveOnlyBtn').style.display = 'inline-block';
    document.getElementById('connectDialog').style.display = 'flex';
  }

  cloneSession(session) {
    // 填充表单（与 editSession 类似，但不设置 editingSessionId）
    document.getElementById('host').value = session.host;
    document.getElementById('port').value = session.port || 22;
    document.getElementById('username').value = session.username;
    document.getElementById('sessionName').value = (session.name || '') + ' (副本)';
    
    // 设置认证方式
    const authType = session.password ? 'password' : 'key';
    document.getElementById('authType').value = authType;
    
    if (authType === 'password') {
      document.getElementById('password').value = session.password || '';
      document.getElementById('passwordGroup').style.display = 'block';
      document.getElementById('keyGroup').style.display = 'none';
    } else {
      document.getElementById('privateKey').value = session.privateKey || '';
      document.getElementById('passwordGroup').style.display = 'none';
      document.getElementById('keyGroup').style.display = 'block';
    }

    // 设置分组
    this.updateGroupSelect(session.group);

    // 显示"保存此会话配置"选项（默认勾选）
    document.getElementById('saveSession').parentElement.style.display = 'block';
    document.getElementById('saveSession').checked = true;

    // 显示对话框，不设置 editingSessionId（这样会创建新会话）
    this.editingSessionId = null;
    document.querySelector('#connectDialog h3').textContent = this.t('connect.titleClone');
    document.getElementById('connectSubmitBtn').textContent = this.t('connect.btnConnect');
    document.getElementById('saveOnlyBtn').style.display = 'inline-block';
    document.getElementById('connectDialog').style.display = 'flex';
  }

  // SFTP 功能
  async openSFTP(sessionId, config) {
    try {
      // 连接 SFTP
      const result = await window.electronAPI.sftp.connect(sessionId, config);
      
      if (!result.success) {
        alert('SFTP 连接失败: ' + result.error);
        return;
      }

      // 创建 SFTP 标签
      const sftpSessionId = `sftp-${sessionId}`;
      this.sftpSessions.set(sftpSessionId, { sessionId, config });
      this.currentSftpPath[sftpSessionId] = '/';

      this.createSFTPTab(sftpSessionId, config);
      this.switchToSFTP(sftpSessionId);
      this.sftpList(sftpSessionId, '/');
    } catch (error) {
      alert('SFTP 错误: ' + error.message);
    }
  }

  createSFTPTab(sftpSessionId, config) {
    const tabsContainer = document.getElementById('tabs');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = `tab-${sftpSessionId}`;
    tab.innerHTML = `
      <span class="tab-status connected" data-i18n-title="status.connected" title="${this.t('status.connected')}"></span>
      <span class="tab-name">${config.name || config.username + '@' + config.host}</span>
      <span class="tab-sftp">SFTP</span>
      <span class="tab-close" data-session="${sftpSessionId}">✕</span>
    `;

    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.switchToSFTP(sftpSessionId);
      }
    });

    tab.querySelector('.tab-close').addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.closeSFTP(sftpSessionId);
    });

    tabsContainer.appendChild(tab);
  }

  switchToSFTP(sftpSessionId) {
    // 隐藏所有终端
    document.querySelectorAll('.terminal-wrapper').forEach(el => {
      el.classList.remove('active');
    });

    // 取消所有标签的激活状态
    document.querySelectorAll('.tab').forEach(el => {
      el.classList.remove('active');
    });

    // 显示 SFTP 容器
    document.getElementById('terminalContainer').style.display = 'none';
    document.getElementById('sftpContainer').style.display = 'flex';

    // 激活标签
    const tab = document.getElementById(`tab-${sftpSessionId}`);
    if (tab) tab.classList.add('active');

    this.activeSessionId = sftpSessionId;
  }

  async sftpList(sftpSessionId, remotePath) {
    const session = this.sftpSessions.get(sftpSessionId);
    if (!session) return;

    // 显示加载状态
    const fileList = document.getElementById('sftpFileList');
    fileList.innerHTML = '<div class="loading">加载中...</div>';

    const result = await window.electronAPI.sftp.list(session.sessionId, remotePath);
    
    if (result.success) {
      this.currentSftpPath[sftpSessionId] = remotePath;
      document.getElementById('sftpPath').value = remotePath;
      
      // 清除选择
      this.selectedFiles.clear();
      this.updateSelectionCount();
      
      this.renderFileList(sftpSessionId, result.files);
    } else {
      fileList.innerHTML = `<div class="error-message">获取文件列表失败: ${result.error}</div>`;
    }
  }

  renderFileList(sftpSessionId, files) {
    const fileList = document.getElementById('sftpFileList');
    
    // 添加淡入动画
    fileList.style.opacity = '0';
    fileList.innerHTML = '';

    // 排序：文件夹在前
    files.sort((a, b) => {
      if (a.type === 'd' && b.type !== 'd') return -1;
      if (a.type !== 'd' && b.type === 'd') return 1;
      return a.name.localeCompare(b.name);
    });

    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.dataset.fileName = file.name;
      item.dataset.fileType = file.type;
      
      const icon = file.type === 'd' ? '📁' : '📄';
      const size = file.type === 'd' ? '' : this.formatSize(file.size);
      const date = new Date(file.modifyTime).toLocaleString();

      item.innerHTML = `
        <input type="checkbox" class="file-checkbox" data-filename="${file.name}">
        <span class="file-icon">${icon}</span>
        <span class="file-name">${file.name}</span>
        <span class="file-size">${size}</span>
        <span class="file-date">${date}</span>
        <div class="file-actions">
          ${file.type !== 'd' ? '<button class="download-btn">下载</button>' : ''}
          <button class="rename-btn">重命名</button>
          <button class="delete-btn">删除</button>
        </div>
      `;

      // 复选框选择
      const checkbox = item.querySelector('.file-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        if (checkbox.checked) {
          this.selectedFiles.add(file.name);
          item.classList.add('selected');
        } else {
          this.selectedFiles.delete(file.name);
          item.classList.remove('selected');
        }
        this.updateSelectionCount();
      });

      // 双击进入文件夹或下载文件
      item.addEventListener('dblclick', () => {
        if (file.type === 'd') {
          const newPath = this.currentSftpPath[sftpSessionId] === '/' 
            ? `/${file.name}` 
            : `${this.currentSftpPath[sftpSessionId]}/${file.name}`;
          this.sftpList(sftpSessionId, newPath);
        } else {
          this.sftpDownload(sftpSessionId, file.name);
        }
      });

      // 右键菜单
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showFileContextMenu(e, sftpSessionId, file);
      });

      // 下载按钮
      const downloadBtn = item.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sftpDownload(sftpSessionId, file.name);
        });
      }

      // 重命名按钮
      item.querySelector('.rename-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.sftpRename(sftpSessionId, file.name);
      });

      // 删除按钮
      item.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.sftpDelete(sftpSessionId, file.name);
      });

      fileList.appendChild(item);
    });

    // 启用拖拽上传
    this.enableDragUpload(fileList, sftpSessionId);

    // 淡入动画
    setTimeout(() => {
      fileList.style.opacity = '1';
    }, 50);
  }

  updateSelectionCount() {
    const count = this.selectedFiles.size;
    const downloadBtn = document.getElementById('sftpDownloadBtn');
    if (downloadBtn) {
      downloadBtn.textContent = count > 0 ? this.t('sftp.downloadSelectedCount').replace('{count}', count) : this.t('sftp.downloadSelected');
      downloadBtn.disabled = count === 0;
    }
  }

  enableDragUpload(fileList, sftpSessionId) {
    // 移除旧的事件监听器
    fileList.ondragover = null;
    fileList.ondragleave = null;
    fileList.ondrop = null;

    fileList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileList.classList.add('drag-over');
    });

    fileList.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === fileList) {
        fileList.classList.remove('drag-over');
      }
    });

    fileList.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileList.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const session = this.sftpSessions.get(sftpSessionId);
      if (!session) return;

      this.showNotification(`准备上传 ${files.length} 个文件...`, 'info');

      let successCount = 0;
      let failCount = 0;
      let cancelCount = 0;

      for (const file of files) {
        const remotePath = this.currentSftpPath[sftpSessionId] === '/' 
          ? `/${file.name}` 
          : `${this.currentSftpPath[sftpSessionId]}/${file.name}`;

        try {
          const result = await this.uploadLocalFile(session.sessionId, file.path, remotePath);
          
          if (result.success) {
            successCount++;
          } else if (result.cancelled) {
            cancelCount++;
            // 用户取消了，停止后续上传
            break;
          } else {
            failCount++;
            this.showNotification(`上传 ${file.name} 失败: ${result.error}`, 'error');
          }
        } catch (error) {
          failCount++;
          this.showNotification(`上传 ${file.name} 错误: ${error.message}`, 'error');
        }
      }

      // 显示汇总信息
      if (successCount > 0) {
        this.showNotification(`成功上传 ${successCount} 个文件`, 'success');
      }
      if (cancelCount > 0) {
        this.showNotification(`取消了 ${cancelCount} 个文件的上传`, 'info');
      }
      if (failCount > 0) {
        this.showNotification(`${failCount} 个文件上传失败`, 'error');
      }

      this.sftpRefresh();
    });
  }

  async uploadLocalFile(sessionId, localPath, remotePath) {
    return await window.electronAPI.sftp.uploadFile(sessionId, localPath, remotePath);
  }

  showFileContextMenu(e, sftpSessionId, file) {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';

    const menuItems = [];

    if (file.type !== 'd') {
      menuItems.push({ label: this.t('sftp.menuDownload'), action: () => this.sftpDownload(sftpSessionId, file.name) });
    } else {
      menuItems.push({ label: this.t('sftp.menuOpen'), action: () => {
        const newPath = this.currentSftpPath[sftpSessionId] === '/' 
          ? `/${file.name}` 
          : `${this.currentSftpPath[sftpSessionId]}/${file.name}`;
        this.sftpList(sftpSessionId, newPath);
      }});
    }

    menuItems.push({ label: this.t('sftp.menuRename'), action: () => this.sftpRename(sftpSessionId, file.name) });
    menuItems.push({ divider: true });
    menuItems.push({ label: this.t('sftp.menuDelete'), action: () => this.sftpDelete(sftpSessionId, file.name) });

    menuItems.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        menu.appendChild(divider);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.addEventListener('click', () => {
          item.action();
          menu.remove();
        });
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  async sftpDownload(sftpSessionId, fileName) {
    const session = this.sftpSessions.get(sftpSessionId);
    if (!session) return;

    const remotePath = this.currentSftpPath[sftpSessionId] === '/' 
      ? `/${fileName}` 
      : `${this.currentSftpPath[sftpSessionId]}/${fileName}`;

    const result = await window.electronAPI.sftp.download(session.sessionId, remotePath);
    
    if (result.success) {
      this.showNotification('notify.downloadComplete', 'success');
    } else if (result.cancelled) {
      // 用户取消，不显示错误
    } else if (result.error !== 'User canceled') {
      this.showNotification(this.t('notify.downloadFailed') + ': ' + result.error, 'error');
    }
  }

  async sftpUpload() {
    if (!this.activeSessionId || !this.activeSessionId.startsWith('sftp-')) {
      return;
    }

    const session = this.sftpSessions.get(this.activeSessionId);
    if (!session) {
      return;
    }

    const remotePath = this.currentSftpPath[this.activeSessionId];
    const result = await window.electronAPI.sftp.upload(session.sessionId, remotePath);
    
    if (result.success) {
      this.showNotification('notify.uploadComplete', 'success');
      this.sftpRefresh();
    } else if (result.cancelled) {
      // 用户取消，不显示错误
    } else if (result.error !== 'User canceled') {
      this.showNotification(this.t('notify.uploadFailed') + ': ' + result.error, 'error');
    }
  }

  async sftpMkdir() {
    if (!this.activeSessionId || !this.activeSessionId.startsWith('sftp-')) return;

    const session = this.sftpSessions.get(this.activeSessionId);
    if (!session) return;

    this.showInputDialog(this.t('sftp.mkdirTitle'), this.t('sftp.mkdirPrompt'), '', async (dirName) => {
      if (!dirName) return;

      const remotePath = this.currentSftpPath[this.activeSessionId] === '/' 
        ? `/${dirName}` 
        : `${this.currentSftpPath[this.activeSessionId]}/${dirName}`;

      const result = await window.electronAPI.sftp.mkdir(session.sessionId, remotePath);
      
      if (result.success) {
        this.sftpRefresh();
      } else {
        this.showAlert(this.t('sftp.mkdirFailed') + ': ' + result.error);
      }
    });
  }

  async sftpDelete(sftpSessionId, fileName) {
    this.showConfirmDialog(
      this.t('sftp.deleteTitle'),
      this.t('sftp.deleteMessage').replace('{name}', fileName),
      async () => {
        const session = this.sftpSessions.get(sftpSessionId);
        if (!session) return;

        const remotePath = this.currentSftpPath[sftpSessionId] === '/' 
          ? `/${fileName}` 
          : `${this.currentSftpPath[sftpSessionId]}/${fileName}`;

        const result = await window.electronAPI.sftp.delete(session.sessionId, remotePath);
        
        if (result.success) {
          this.sftpRefresh();
        } else {
          this.showAlert(this.t('sftp.deleteFailed') + ': ' + result.error);
        }
      }
    );
  }

  async sftpRename(sftpSessionId, oldName) {
    this.showInputDialog(this.t('sftp.renameTitle'), this.t('sftp.renamePrompt'), oldName, async (newName) => {
      if (!newName || newName === oldName) return;

      const session = this.sftpSessions.get(sftpSessionId);
      if (!session) return;

      const basePath = this.currentSftpPath[sftpSessionId];
      const oldPath = basePath === '/' ? `/${oldName}` : `${basePath}/${oldName}`;
      const newPath = basePath === '/' ? `/${newName}` : `${basePath}/${newName}`;

      const result = await window.electronAPI.sftp.rename(session.sessionId, oldPath, newPath);
      
      if (result.success) {
        this.sftpRefresh();
      } else {
        this.showAlert(this.t('sftp.renameFailed') + ': ' + result.error);
      }
    });
  }

  sftpNavigateUp() {
    if (!this.activeSessionId || !this.activeSessionId.startsWith('sftp-')) return;

    const currentPath = this.currentSftpPath[this.activeSessionId];
    if (currentPath === '/') return;

    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    this.sftpList(this.activeSessionId, parentPath);
  }

  sftpRefresh() {
    if (!this.activeSessionId || !this.activeSessionId.startsWith('sftp-')) {
      return;
    }
    
    // 添加刷新按钮动画
    const refreshBtn = document.getElementById('sftpRefreshBtn');
    if (refreshBtn) {
      refreshBtn.classList.add('rotating');
      setTimeout(() => {
        refreshBtn.classList.remove('rotating');
      }, 600);
    }
    
    const currentPath = this.currentSftpPath[this.activeSessionId];
    this.sftpList(this.activeSessionId, currentPath);
  }

  async closeSFTP(sftpSessionId) {
    const session = this.sftpSessions.get(sftpSessionId);
    if (session) {
      await window.electronAPI.sftp.disconnect(session.sessionId);
      this.sftpSessions.delete(sftpSessionId);
    }

    const tab = document.getElementById(`tab-${sftpSessionId}`);
    if (tab) tab.remove();

    // 切换到其他会话
    if (this.activeSessionId === sftpSessionId) {
      const remainingSessions = Array.from(this.terminals.keys());
      if (remainingSessions.length > 0) {
        this.switchToSession(remainingSessions[0]);
      } else {
        this.activeSessionId = null;
        document.getElementById('sftpContainer').style.display = 'none';
        document.getElementById('terminalContainer').style.display = 'block';
      }
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 设置相关方法
  getPresetThemes() {
    return {
      dark: {
        name: this.t('theme.dark'),
        bgColor: '#1e1e1e',
        sidebarBg: '#252526',
        primaryColor: '#0e639c',
        textColor: '#d4d4d4',
        borderColor: '#3e3e42',
        hoverBg: '#3e3e42',
        // 终端配置
        terminal: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      light: {
        name: this.t('theme.light'),
        bgColor: '#ffffff',
        sidebarBg: '#f3f3f3',
        primaryColor: '#0078d4',
        textColor: '#333333',
        borderColor: '#e0e0e0',
        hoverBg: '#e8e8e8',
        terminal: {
          background: '#ffffff',
          foreground: '#333333',
          cursor: '#333333',
          cursorAccent: '#ffffff',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      dracula: {
        name: 'Dracula',
        bgColor: '#282a36',
        sidebarBg: '#21222c',
        primaryColor: '#bd93f9',
        textColor: '#f8f8f2',
        borderColor: '#44475a',
        hoverBg: '#44475a',
        terminal: {
          background: '#282a36',
          foreground: '#f8f8f2',
          cursor: '#f8f8f0',
          cursorAccent: '#282a36',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      monokai: {
        name: 'Monokai',
        bgColor: '#272822',
        sidebarBg: '#1e1f1c',
        primaryColor: '#66d9ef',
        textColor: '#f8f8f2',
        borderColor: '#3e3d32',
        hoverBg: '#3e3d32',
        terminal: {
          background: '#272822',
          foreground: '#f8f8f2',
          cursor: '#f8f8f0',
          cursorAccent: '#272822',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      'solarized-dark': {
        name: 'Solarized Dark',
        bgColor: '#002b36',
        sidebarBg: '#073642',
        primaryColor: '#268bd2',
        textColor: '#839496',
        borderColor: '#586e75',
        hoverBg: '#073642',
        terminal: {
          background: '#002b36',
          foreground: '#839496',
          cursor: '#839496',
          cursorAccent: '#002b36',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      nord: {
        name: 'Nord',
        bgColor: '#2e3440',
        sidebarBg: '#3b4252',
        primaryColor: '#88c0d0',
        textColor: '#eceff4',
        borderColor: '#4c566a',
        hoverBg: '#434c5e',
        terminal: {
          background: '#2e3440',
          foreground: '#eceff4',
          cursor: '#eceff4',
          cursorAccent: '#2e3440',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      'one-dark': {
        name: 'One Dark',
        bgColor: '#282c34',
        sidebarBg: '#21252b',
        primaryColor: '#61afef',
        textColor: '#abb2bf',
        borderColor: '#3e4451',
        hoverBg: '#2c313a',
        terminal: {
          background: '#282c34',
          foreground: '#abb2bf',
          cursor: '#abb2bf',
          cursorAccent: '#282c34',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      'github-dark': {
        name: 'GitHub Dark',
        bgColor: '#0d1117',
        sidebarBg: '#161b22',
        primaryColor: '#58a6ff',
        textColor: '#c9d1d9',
        borderColor: '#30363d',
        hoverBg: '#21262d',
        terminal: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#c9d1d9',
          cursorAccent: '#0d1117',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      'tokyo-night': {
        name: 'Tokyo Night',
        bgColor: '#1a1b26',
        sidebarBg: '#16161e',
        primaryColor: '#7aa2f7',
        textColor: '#a9b1d6',
        borderColor: '#292e42',
        hoverBg: '#24283b',
        terminal: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#a9b1d6',
          cursorAccent: '#1a1b26',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      gruvbox: {
        name: 'Gruvbox Dark',
        bgColor: '#282828',
        sidebarBg: '#1d2021',
        primaryColor: '#83a598',
        textColor: '#ebdbb2',
        borderColor: '#504945',
        hoverBg: '#3c3836',
        terminal: {
          background: '#282828',
          foreground: '#ebdbb2',
          cursor: '#ebdbb2',
          cursorAccent: '#282828',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      },
      material: {
        name: 'Material',
        bgColor: '#263238',
        sidebarBg: '#1e272c',
        primaryColor: '#80cbc4',
        textColor: '#eeffff',
        borderColor: '#37474f',
        hoverBg: '#314549',
        terminal: {
          background: '#263238',
          foreground: '#eeffff',
          cursor: '#eeffff',
          cursorAccent: '#263238',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorStyle: 'block',
          cursorBlink: true
        }
      }
    };
  }

  showSettingsDialog() {
    this.loadSettings();
    this.loadWebDAVConfig(); // 加载 WebDAV 配置
    this.updateMasterPasswordStatus(); // 更新主密码状态
    this.loadLanguageSettings(); // 加载语言设置
    document.getElementById('settingsDialog').style.display = 'flex';
    
    // 只在第一次打开时初始化事件监听器
    if (!this.settingsDialogInitialized) {
      this.initializeSettingsDialog();
      this.settingsDialogInitialized = true;
    }
    
    // 初始预览
    this.updateThemePreview(document.getElementById('themeMode').value);
    
    // 如果当前是日志标签，加载日志
    const activeTab = document.querySelector('.settings-tab.active');
    if (activeTab && activeTab.dataset.tab === 'logs') {
      this.loadLogs();
    }
  }

  initializeSettingsDialog() {
    // 设置标签切换
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // 切换标签激活状态
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // 切换面板显示
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
        
        // 如果切换到日志标签，加载日志
        if (tabName === 'logs') {
          this.loadLogs();
        }
      });
    });

    // 主题模式切换
    document.getElementById('themeMode').addEventListener('change', (e) => {
      const customSettings = document.getElementById('customThemeSettings');
      customSettings.style.display = e.target.value === 'custom' ? 'block' : 'none';
      this.updateThemePreview(e.target.value);
    });

    // 颜色选择器同步
    this.setupColorSync('bgColor', 'bgColorText');
    this.setupColorSync('sidebarBgColor', 'sidebarBgColorText');
    this.setupColorSync('primaryColor', 'primaryColorText');
    this.setupColorSync('textColor', 'textColorText');
    this.setupColorSync('borderColor', 'borderColorText');
    this.setupColorSync('terminalBackground', 'terminalBackgroundText');
    this.setupColorSync('terminalForeground', 'terminalForegroundText');
    this.setupColorSync('terminalCursor', 'terminalCursorText');

    // 保存按钮
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
      document.getElementById('settingsDialog').style.display = 'none';
    });

    // 取消按钮
    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
      document.getElementById('settingsDialog').style.display = 'none';
    });

    // 恢复默认按钮
    document.getElementById('resetThemeBtn').addEventListener('click', () => {
      this.resetTheme();
    });

    // 自动同步复选框
    document.getElementById('autoSyncEnabled').addEventListener('change', (e) => {
      document.getElementById('autoSyncIntervalGroup').style.display = 
        e.target.checked ? 'block' : 'none';
    });

    // 日志同步复选框
    document.getElementById('syncLogsEnabled').addEventListener('change', (e) => {
      document.getElementById('logsPathGroup').style.display = 
        e.target.checked ? 'block' : 'none';
    });

    // 测试连接按钮
    document.getElementById('testWebdavBtn').addEventListener('click', async () => {
      await this.testWebDAVConnection();
    });

    // 立即同步按钮
    document.getElementById('syncNowBtn').addEventListener('click', async () => {
      await this.syncNow();
    });

    // 安全设置按钮
    document.getElementById('setMasterPasswordBtn').addEventListener('click', () => {
      this.showMasterPasswordDialog('set');
      document.getElementById('settingsDialog').style.display = 'none';
    });

    document.getElementById('changeMasterPasswordBtn').addEventListener('click', () => {
      this.showChangeMasterPasswordDialog();
    });

    document.getElementById('removeMasterPasswordBtn').addEventListener('click', async () => {
      // 先隐藏设置对话框
      document.getElementById('settingsDialog').style.display = 'none';
      
      const confirmed = await this.showConfirmDialog(
        this.t('removeMasterPassword.title'),
        this.t('removeMasterPassword.message')
      );
      
      if (confirmed) {
        const result = await window.electronAPI.masterPassword.reset();
        if (result.success) {
          // 清除提示标记，下次启动时会再次提示设置主密码
          await window.electronAPI.masterPassword.clearPrompted();
          this.showNotification('notify.masterPasswordRemoved', 'success');
          this.updateMasterPasswordStatus();
        } else {
          this.showNotification(this.t('notify.removeFailed') + ': ' + result.error, 'error');
        }
      }
      
      // 恢复设置对话框
      document.getElementById('settingsDialog').style.display = 'flex';
    });

    // 日志管理按钮
    document.getElementById('refreshLogsBtn').addEventListener('click', async () => {
      await this.loadLogs();
    });

    document.getElementById('openLogDirBtn').addEventListener('click', async () => {
      await this.openLogDir();
    });

    document.getElementById('clearAllLogsBtn').addEventListener('click', async () => {
      await this.clearAllLogs();
    });

    // 语言选择
    document.getElementById('languageSelect').addEventListener('change', () => {
      this.saveLanguageSettings();
    });
  }

  setupColorSync(colorId, textId) {
    const colorInput = document.getElementById(colorId);
    const textInput = document.getElementById(textId);

    colorInput.addEventListener('input', (e) => {
      textInput.value = e.target.value;
      this.updateThemePreview('custom');
    });

    textInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(value)) {
        colorInput.value = value;
        this.updateThemePreview('custom');
      }
    });
  }

  updateThemePreview(themeMode) {
    const themes = this.getPresetThemes();
    let theme;

    if (themeMode === 'custom') {
      theme = {
        bgColor: document.getElementById('bgColor').value,
        sidebarBg: document.getElementById('sidebarBgColor').value,
        primaryColor: document.getElementById('primaryColor').value,
        textColor: document.getElementById('textColor').value,
        borderColor: document.getElementById('borderColor').value
      };
    } else {
      theme = themes[themeMode] || themes.dark;
    }

    // 更新预览
    const previewSidebar = document.querySelector('.preview-sidebar');
    const previewContent = document.querySelector('.preview-content');
    const previewItems = document.querySelectorAll('.preview-item');
    const previewText = document.querySelector('.preview-text');
    const previewButton = document.querySelector('.preview-button');

    if (previewSidebar) {
      previewSidebar.style.background = theme.sidebarBg;
      previewContent.style.background = theme.bgColor;
      
      previewItems.forEach(item => {
        item.style.background = theme.borderColor;
      });
      
      previewText.style.background = theme.borderColor;
      previewButton.style.background = theme.primaryColor;
    }
  }

  loadSettings() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    
    // 加载主题设置
    const themeMode = settings.themeMode || 'dark';
    document.getElementById('themeMode').value = themeMode;
    document.getElementById('customThemeSettings').style.display = 
      themeMode === 'custom' ? 'block' : 'none';

    if (themeMode === 'custom' && settings.customTheme) {
      document.getElementById('bgColor').value = settings.customTheme.bgColor || '#1e1e1e';
      document.getElementById('bgColorText').value = settings.customTheme.bgColor || '#1e1e1e';
      document.getElementById('sidebarBgColor').value = settings.customTheme.sidebarBg || '#252526';
      document.getElementById('sidebarBgColorText').value = settings.customTheme.sidebarBg || '#252526';
      document.getElementById('primaryColor').value = settings.customTheme.primaryColor || '#0e639c';
      document.getElementById('primaryColorText').value = settings.customTheme.primaryColor || '#0e639c';
      document.getElementById('textColor').value = settings.customTheme.textColor || '#d4d4d4';
      document.getElementById('textColorText').value = settings.customTheme.textColor || '#d4d4d4';
      document.getElementById('borderColor').value = settings.customTheme.borderColor || '#3e3e42';
      document.getElementById('borderColorText').value = settings.customTheme.borderColor || '#3e3e42';
    }

    // 加载终端设置
    const terminalSettings = settings.terminal || {};
    document.getElementById('terminalBackground').value = terminalSettings.background || '#1e1e1e';
    document.getElementById('terminalBackgroundText').value = terminalSettings.background || '#1e1e1e';
    document.getElementById('terminalForeground').value = terminalSettings.foreground || '#d4d4d4';
    document.getElementById('terminalForegroundText').value = terminalSettings.foreground || '#d4d4d4';
    document.getElementById('terminalCursor').value = terminalSettings.cursor || '#d4d4d4';
    document.getElementById('terminalCursorText').value = terminalSettings.cursor || '#d4d4d4';
    document.getElementById('terminalFontSize').value = terminalSettings.fontSize || 14;
    document.getElementById('terminalFontFamily').value = terminalSettings.fontFamily || "Menlo, Monaco, 'Courier New', monospace";
    document.getElementById('terminalCursorStyle').value = terminalSettings.cursorStyle || 'block';
    document.getElementById('terminalCursorBlink').checked = terminalSettings.cursorBlink !== false;
  }

  saveSettings() {
    const themeMode = document.getElementById('themeMode').value;
    
    const settings = {
      themeMode,
      terminal: {
        background: document.getElementById('terminalBackground').value,
        foreground: document.getElementById('terminalForeground').value,
        cursor: document.getElementById('terminalCursor').value,
        cursorAccent: document.getElementById('terminalBackground').value, // 使用背景色作为光标强调色
        fontSize: parseInt(document.getElementById('terminalFontSize').value),
        fontFamily: document.getElementById('terminalFontFamily').value,
        cursorStyle: document.getElementById('terminalCursorStyle').value,
        cursorBlink: document.getElementById('terminalCursorBlink').checked
      }
    };

    if (themeMode === 'custom') {
      settings.customTheme = {
        bgColor: document.getElementById('bgColor').value,
        sidebarBg: document.getElementById('sidebarBgColor').value,
        primaryColor: document.getElementById('primaryColor').value,
        textColor: document.getElementById('textColor').value,
        borderColor: document.getElementById('borderColor').value
      };
    }

    localStorage.setItem('appSettings', JSON.stringify(settings));
    this.applySettings(settings);
    
    // 保存 WebDAV 配置
    this.saveWebDAVConfig();
    
    this.showNotification('notify.settingsSaved', 'success');
  }

  async saveWebDAVConfig() {
    const url = document.getElementById('webdavUrl').value.trim();
    const username = document.getElementById('webdavUsername').value.trim();
    const password = document.getElementById('webdavPassword').value;
    const remotePath = document.getElementById('webdavRemotePath').value.trim() || 'anotherssh-config.json';
    const autoSync = document.getElementById('autoSyncEnabled').checked;
    const syncInterval = parseInt(document.getElementById('autoSyncInterval').value);
    const syncLogs = document.getElementById('syncLogsEnabled').checked;
    const remoteLogsPath = document.getElementById('remoteLogsPath').value.trim() || 'anotherssh-logs';

    if (url && username && password) {
      const config = {
        url,
        username,
        password,
        remotePath,
        autoSync,
        syncInterval,
        syncLogs,
        remoteLogsPath
      };

      await window.electronAPI.webdav.saveConfig(config);
      await window.electronAPI.webdav.initClient(config);

      // 启动或停止自动同步
      if (autoSync) {
        await window.electronAPI.webdav.startAutoSync(syncInterval);
      } else {
        await window.electronAPI.webdav.stopAutoSync();
      }
    }
  }

  applySettings(settings) {
    const themes = this.getPresetThemes();
    let theme;

    // 应用主题
    if (settings.themeMode === 'custom') {
      document.body.classList.remove('light-theme');
      document.body.classList.add('custom-theme');
      theme = settings.customTheme;
    } else if (themes[settings.themeMode]) {
      document.body.classList.remove('light-theme', 'custom-theme');
      theme = themes[settings.themeMode];
    } else {
      // 默认深色主题
      document.body.classList.remove('light-theme', 'custom-theme');
      theme = themes.dark;
    }

    // 应用主题颜色
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--bg-color', theme.bgColor);
      root.style.setProperty('--sidebar-bg', theme.sidebarBg);
      root.style.setProperty('--primary-color', theme.primaryColor);
      root.style.setProperty('--text-color', theme.textColor);
      root.style.setProperty('--border-color', theme.borderColor);
      root.style.setProperty('--hover-bg', theme.hoverBg || theme.borderColor);
      // 对话框和输入框颜色（基于主题颜色计算）
      root.style.setProperty('--dialog-bg', theme.sidebarBg);
      root.style.setProperty('--input-bg', theme.bgColor);
      root.style.setProperty('--input-border', theme.borderColor);
    }

    // 获取终端配置
    let terminalConfig;
    if (settings.themeMode === 'custom' && settings.customTheme && settings.customTheme.terminal) {
      terminalConfig = settings.customTheme.terminal;
    } else if (settings.themeMode && themes[settings.themeMode]) {
      terminalConfig = themes[settings.themeMode].terminal;
    } else {
      terminalConfig = themes.dark.terminal;
    }

    // 如果用户有自定义终端设置，覆盖主题的终端配置
    if (settings.terminal) {
      terminalConfig = {
        ...terminalConfig,
        fontSize: settings.terminal.fontSize || terminalConfig.fontSize,
        fontFamily: settings.terminal.fontFamily || terminalConfig.fontFamily,
        cursorStyle: settings.terminal.cursorStyle || terminalConfig.cursorStyle,
        cursorBlink: settings.terminal.cursorBlink !== undefined ? settings.terminal.cursorBlink : terminalConfig.cursorBlink,
        background: settings.terminal.background || terminalConfig.background,
        foreground: settings.terminal.foreground || terminalConfig.foreground,
        cursor: settings.terminal.cursor || terminalConfig.cursor
      };
    }

    // 应用终端设置到所有现有终端
    this.terminals.forEach((terminalData) => {
      const terminal = terminalData.terminal;
      
      // 更新字体和光标设置
      terminal.options.fontSize = terminalConfig.fontSize;
      terminal.options.lineHeight = 1.2;
      terminal.options.fontFamily = terminalConfig.fontFamily;
      terminal.options.cursorStyle = terminalConfig.cursorStyle;
      terminal.options.cursorBlink = terminalConfig.cursorBlink;
      
      // 更新终端颜色主题
      terminal.options.theme = {
        background: terminalConfig.background,
        foreground: terminalConfig.foreground,
        cursor: terminalConfig.cursor,
        cursorAccent: terminalConfig.cursorAccent
      };
      
      // 刷新终端显示
      terminal.refresh(0, terminal.rows - 1);
      terminalData.fitAddon.fit();
      
      // fit 之后通知 SSH 终端大小（字体大小改变会影响 cols/rows）
      setTimeout(() => {
        const sessionId = terminalData.sessionId || Array.from(this.terminals.entries())
          .find(([_, data]) => data === terminalData)?.[0];
        
        if (sessionId && terminal.cols && terminal.rows) {
          window.electronAPI.ssh.resize(sessionId, terminal.cols, terminal.rows);
        }
      }, 50);
    });
  }

  resetTheme() {
    document.getElementById('bgColor').value = '#1e1e1e';
    document.getElementById('bgColorText').value = '#1e1e1e';
    document.getElementById('sidebarBgColor').value = '#252526';
    document.getElementById('sidebarBgColorText').value = '#252526';
    document.getElementById('primaryColor').value = '#0e639c';
    document.getElementById('primaryColorText').value = '#0e639c';
    document.getElementById('textColor').value = '#d4d4d4';
    document.getElementById('textColorText').value = '#d4d4d4';
    document.getElementById('borderColor').value = '#3e3e42';
    document.getElementById('borderColorText').value = '#3e3e42';
  }

  resetThemeVariables() {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', '#1e1e1e');
    root.style.setProperty('--sidebar-bg', '#252526');
    root.style.setProperty('--primary-color', '#0e639c');
    root.style.setProperty('--text-color', '#d4d4d4');
    root.style.setProperty('--border-color', '#3e3e42');
  }

  updateTabStatus(sessionId, status) {
    const tab = document.getElementById(`tab-${sessionId}`);
    if (!tab) return;

    const statusIndicator = tab.querySelector('.tab-status');
    if (!statusIndicator) return;

    // 移除所有状态类
    statusIndicator.classList.remove('connecting', 'connected', 'disconnected');
    
    // 添加新状态类
    statusIndicator.classList.add(status);
    
    // 更新 title
    const statusText = {
      connecting: this.t('status.connecting'),
      connected: this.t('status.connected'),
      disconnected: this.t('status.disconnected')
    };
    statusIndicator.title = statusText[status] || '';

    // 如果是当前活动会话，更新状态栏
    if (sessionId === this.activeSessionId) {
      this.updateStatusBar(sessionId);
    }
  }

  // ========== WebDAV 同步相关方法 ==========

  async loadWebDAVConfig() {
    try {
      const result = await window.electronAPI.webdav.loadConfig();
      if (result.success && result.config) {
        document.getElementById('webdavUrl').value = result.config.url || '';
        document.getElementById('webdavUsername').value = result.config.username || '';
        document.getElementById('webdavPassword').value = result.config.password || '';
        document.getElementById('webdavRemotePath').value = result.config.remotePath || 'anotherssh-config.json';
        document.getElementById('autoSyncEnabled').checked = result.config.autoSync || false;
        document.getElementById('autoSyncInterval').value = result.config.syncInterval || 5;
        document.getElementById('syncLogsEnabled').checked = result.config.syncLogs || false;
        document.getElementById('remoteLogsPath').value = result.config.remoteLogsPath || 'anotherssh-logs';
        document.getElementById('autoSyncIntervalGroup').style.display = 
          result.config.autoSync ? 'block' : 'none';
        document.getElementById('logsPathGroup').style.display = 
          result.config.syncLogs ? 'block' : 'none';

        // 初始化客户端
        if (result.config.url && result.config.username && result.config.password) {
          await window.electronAPI.webdav.initClient(result.config);
        }
      } else {
        // 设置默认值
        document.getElementById('webdavRemotePath').value = 'anotherssh-config.json';
        document.getElementById('syncLogsEnabled').checked = false;
        document.getElementById('remoteLogsPath').value = 'anotherssh-logs';
      }

      // 更新状态显示
      await this.updateSyncStatus();
    } catch (error) {
      console.error('Failed to load WebDAV config:', error);
    }
  }

  async updateSyncStatus() {
    try {
      const status = await window.electronAPI.webdav.getStatus();
      if (status.success) {
        const statusText = document.getElementById('syncStatusText');
        const lastSyncTime = document.getElementById('lastSyncTime');

        if (status.configured && status.connected) {
          statusText.textContent = '✅ 已连接';
          statusText.style.color = '#4caf50';
        } else if (status.configured) {
          statusText.textContent = '⚠️ 已配置未连接';
          statusText.style.color = '#ff9800';
        } else {
          statusText.textContent = '❌ 未配置';
          statusText.style.color = '#f44336';
        }

        if (status.lastSyncTime) {
          const time = new Date(status.lastSyncTime);
          lastSyncTime.textContent = time.toLocaleString('zh-CN');
        } else {
          lastSyncTime.textContent = this.t('webdav.lastSyncNever');
        }
      }
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  async testWebDAVConnection() {
    const url = document.getElementById('webdavUrl').value.trim();
    const username = document.getElementById('webdavUsername').value.trim();
    const password = document.getElementById('webdavPassword').value;
    const remotePath = document.getElementById('webdavRemotePath').value.trim() || 'anotherssh-config.json';

    if (!url || !username || !password) {
      this.showNotification('notify.webdavConfigIncomplete', 'error');
      return;
    }

    const testBtn = document.getElementById('testWebdavBtn');
    testBtn.disabled = true;
    testBtn.textContent = this.t('webdav.testing');

    try {
      const result = await window.electronAPI.webdav.testConnection({
        url,
        username,
        password
      });

      if (result.success) {
        this.showNotification('notify.connectionSuccess', 'success');
        
        // 保存配置并初始化客户端
        const config = {
          url,
          username,
          password,
          remotePath,
          autoSync: document.getElementById('autoSyncEnabled').checked,
          syncInterval: parseInt(document.getElementById('autoSyncInterval').value),
          syncLogs: document.getElementById('syncLogsEnabled').checked,
          remoteLogsPath: document.getElementById('remoteLogsPath').value.trim() || 'anotherssh-logs'
        };
        
        await window.electronAPI.webdav.saveConfig(config);
        await window.electronAPI.webdav.initClient(config);
        await this.updateSyncStatus();
        
        console.log('WebDAV config saved and initialized with remotePath:', remotePath);
      } else {
        this.showNotification(`❌ 连接失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`❌ 连接失败: ${error.message}`, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = this.t('webdav.testConnection');
    }
  }

  async syncNow() {
    const syncBtn = document.getElementById('syncNowBtn');
    syncBtn.disabled = true;
    syncBtn.textContent = this.t('webdav.syncing');

    try {
      // 确保使用最新的配置重新初始化客户端
      const url = document.getElementById('webdavUrl').value.trim();
      const username = document.getElementById('webdavUsername').value.trim();
      const password = document.getElementById('webdavPassword').value;
      const remotePath = document.getElementById('webdavRemotePath').value.trim() || 'anotherssh-config.json';
      
      if (!url || !username || !password) {
        this.showNotification('notify.webdavNotConfigured', 'error');
        syncBtn.disabled = false;
        syncBtn.textContent = this.t('webdav.syncNow');
        return;
      }

      const config = {
        url,
        username,
        password,
        remotePath,
        autoSync: document.getElementById('autoSyncEnabled').checked,
        syncInterval: parseInt(document.getElementById('autoSyncInterval').value),
        syncLogs: document.getElementById('syncLogsEnabled').checked,
        remoteLogsPath: document.getElementById('remoteLogsPath').value.trim() || 'anotherssh-logs'
      };
      
      // 重新初始化客户端以使用最新的 remotePath
      await window.electronAPI.webdav.saveConfig(config);
      await window.electronAPI.webdav.initClient(config);
      
      console.log('Syncing with remotePath:', remotePath);
      
      // 先保存当前会话（确保数据是最新的）
      await window.electronAPI.session.save(this.savedSessions);
      
      // 获取加密后的会话数据用于同步
      const encryptedResult = await window.electronAPI.session.loadEncrypted();
      if (!encryptedResult.success) {
        this.showNotification('notify.cannotReadSessionData', 'error');
        syncBtn.disabled = false;
        syncBtn.textContent = this.t('webdav.syncNow');
        return;
      }
      
      const sessions = encryptedResult.sessions;
      console.log('Uploading', sessions.length, 'sessions (encrypted)');
      
      // 先尝试下载，看看远程文件是否存在
      const downloadResult = await window.electronAPI.webdav.download();
      
      if (downloadResult.success && downloadResult.sessions && downloadResult.sessions.length > 0) {
        // 远程有数据，执行智能同步
        const result = await window.electronAPI.webdav.smartSync(sessions);

        if (result.success) {
          let msg = '';
          if (result.action === 'uploaded') {
            msg = '✅ 配置已上传到云端';
          } else if (result.action === 'merged') {
            // 合并后的数据是加密的，直接保存加密数据
            await window.electronAPI.session.saveEncrypted(result.sessions);
            
            // 重新加载解密后的数据
            const loadResult = await window.electronAPI.session.load();
            if (loadResult.success) {
              this.savedSessions = loadResult.sessions;
              this.renderSessionList();
            }
            
            msg = `✅ 同步完成！新增: ${result.changes.added}, 更新: ${result.changes.updated}`;
          }
          
          // 显示日志同步结果
          if (result.logSync) {
            if (result.logSync.success) {
              const uploaded = result.logSync.upload?.uploaded || 0;
              const downloaded = result.logSync.download?.downloaded || 0;
              const failed = result.logSync.upload?.failed || 0;
              
              if (uploaded > 0 || downloaded > 0) {
                const logMsg = `\n日志: 上传 ${uploaded}, 下载 ${downloaded}`;
                msg += logMsg;
              }
              
              if (failed > 0) {
                msg += `\n⚠️ ${failed} 个日志上传失败`;
                // 提示用户可能需要手动创建目录
                setTimeout(() => {
                  this.showNotification(
                    `提示: 如果日志上传失败，请在 WebDAV 中手动创建目录: ${document.getElementById('remoteLogsPath').value || 'anotherssh-logs'}`,
                    'info'
                  );
                }, 2000);
              }
            }
          }
          
          this.showNotification(msg, 'success');
          await this.updateSyncStatus();
        } else {
          this.showNotification(`❌ 同步失败: ${result.error}`, 'error');
        }
      } else {
        // 远程文件不存在，直接上传
        const uploadResult = await window.electronAPI.webdav.upload(sessions);
        
        if (uploadResult.success) {
          let msg = '✅ 配置已上传到云端';
          
          // 显示日志上传结果
          if (uploadResult.logUpload) {
            if (uploadResult.logUpload.success) {
              if (uploadResult.logUpload.uploaded > 0) {
                msg += `\n日志: 上传 ${uploadResult.logUpload.uploaded} 个文件`;
              }
              if (uploadResult.logUpload.failed > 0) {
                msg += `\n⚠️ ${uploadResult.logUpload.failed} 个日志上传失败`;
                // 提示用户可能需要手动创建目录
                setTimeout(() => {
                  this.showNotification(
                    `提示: 如果日志上传失败，请在 WebDAV 中手动创建目录: ${document.getElementById('remoteLogsPath').value || 'anotherssh-logs'}`,
                    'info'
                  );
                }, 2000);
              }
            }
          }
          
          this.showNotification(msg, 'success');
          await this.updateSyncStatus();
        } else {
          // 上传失败，可能是文件不存在
          if (uploadResult.error.includes('404')) {
            this.showNotification(
              '❌ 无法创建远程文件。请先在坚果云中手动创建一个空文件，路径为：' + remotePath,
              'error'
            );
          } else {
            this.showNotification(`❌ 同步失败: ${uploadResult.error}`, 'error');
          }
        }
      }
    } catch (error) {
      this.showNotification(`❌ 同步失败: ${error.message}`, 'error');
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = this.t('webdav.syncNow');
    }
  }

  getAllSessions() {
    // 直接返回所有保存的会话
    return this.savedSessions || [];
  }

  // 加载并显示应用版本号
  async loadAppVersion() {
    try {
      const version = await window.electronAPI.getAppVersion();
      const statusVersionText = document.getElementById('statusVersionText');
      if (statusVersionText) {
        statusVersionText.textContent = `v${version}`;
      }
    } catch (error) {
      console.error('Failed to load app version:', error);
    }
  }

  // 自动检查更新（启动时调用）
  async autoCheckUpdates() {
    try {
      // 检查上次检查时间，每天只自动检查一次
      const lastCheck = localStorage.getItem('lastUpdateCheck');
      const now = Date.now();
      
      if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
        return; // 24小时内已检查过，跳过
      }
      
      // 显示检查中状态
      this.setUpdateStatus('checking');
      
      const updateInfo = await window.electronAPI.checkUpdates();
      
      if (updateInfo && updateInfo.hasUpdate) {
        // 发现新版本，显示弹窗
        this.showUpdateDialog(updateInfo);
        this.setUpdateStatus('available', updateInfo);
      } else {
        // 已是最新版本
        this.setUpdateStatus('latest');
      }
      
      localStorage.setItem('lastUpdateCheck', Date.now().toString());
    } catch (error) {
      console.error('Auto check updates failed:', error);
      // 静默失败，不影响用户体验
      this.setUpdateStatus('error');
    }
  }

  // 显示更新对话框
  async showUpdateDialog(updateInfo) {
    const dialog = document.getElementById('updateDialog');
    const currentVersion = await window.electronAPI.getAppVersion();
    
    // 设置版本号
    document.getElementById('updateCurrentVersion').textContent = `v${currentVersion}`;
    document.getElementById('updateLatestVersion').textContent = updateInfo.latestVersion;
    
    // 如果有更新说明，显示
    if (updateInfo.releaseNotes) {
      const notesContainer = document.getElementById('updateNotes');
      const notesContent = document.getElementById('updateNotesContent');
      
      // 简单的 Markdown 转 HTML
      const html = this.markdownToHtml(updateInfo.releaseNotes);
      notesContent.innerHTML = html;
      notesContainer.style.display = 'block';
    } else {
      document.getElementById('updateNotes').style.display = 'none';
    }
    
    // 显示对话框
    dialog.style.display = 'flex';
    
    // 绑定按钮事件（只绑定一次）
    const downloadBtn = document.getElementById('updateDownloadBtn');
    const laterBtn = document.getElementById('updateLaterBtn');
    
    // 移除旧的事件监听器
    const newDownloadBtn = downloadBtn.cloneNode(true);
    const newLaterBtn = laterBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
    laterBtn.parentNode.replaceChild(newLaterBtn, laterBtn);
    
    // 添加新的事件监听器
    newDownloadBtn.addEventListener('click', () => {
      window.electronAPI.openExternal(updateInfo.downloadUrl);
      dialog.style.display = 'none';
    });
    
    newLaterBtn.addEventListener('click', () => {
      dialog.style.display = 'none';
    });
  }

  // 简单的 Markdown 转 HTML（用于更新说明）
  markdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown
      // 转义 HTML 特殊字符
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      
      // 标题
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      
      // 列表项
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      
      // 粗体
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      
      // 代码
      .replace(/`(.+?)`/g, '<code>$1</code>')
      
      // 换行
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // 包装列表项
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 包装段落
    if (!html.startsWith('<h') && !html.startsWith('<ul>')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  }

  // 设置更新状态显示
  setUpdateStatus(status, updateInfo = null) {
    const statusUpdate = document.getElementById('statusUpdate');
    const statusUpdateText = document.getElementById('statusUpdateText');
    
    switch (status) {
      case 'checking':
        statusUpdateText.textContent = this.t('status.checkingUpdates', '检查更新中...');
        statusUpdate.style.display = 'inline-flex';
        statusUpdate.style.cursor = 'default';
        statusUpdate.onclick = null;
        break;
        
      case 'available':
        statusUpdateText.textContent = `🎉 ${this.t('status.newVersionAvailable', '发现新版本')} v${updateInfo.latestVersion}`;
        statusUpdate.style.display = 'inline-flex';
        statusUpdate.style.cursor = 'pointer';
        statusUpdate.onclick = () => {
          this.showUpdateDialog(updateInfo);
        };
        break;
        
      case 'latest':
        // 已是最新版本，隐藏状态（不打扰用户）
        statusUpdate.style.display = 'none';
        break;
        
      case 'error':
        // 检查失败，隐藏状态（不打扰用户）
        statusUpdate.style.display = 'none';
        break;
    }
  }

  // 检查更新（手动触发）
  async checkForUpdates(manual = false) {
    try {
      // 手动检查时显示检查中状态
      if (manual) {
        this.showNotification('notify.checkingUpdates', 'info');
      }
      
      const updateInfo = await window.electronAPI.checkUpdates();
      
      if (updateInfo && updateInfo.hasUpdate) {
        this.setUpdateStatus('available', updateInfo);
        // 手动检查时也显示弹窗
        this.showUpdateDialog(updateInfo);
      } else if (manual) {
        // 手动检查时，如果没有更新则提示
        this.showNotification('notify.alreadyLatest', 'success');
      }
      
      localStorage.setItem('lastUpdateCheck', Date.now().toString());
    } catch (error) {
      console.error('Check updates failed:', error);
      if (manual) {
        this.showNotification('notify.checkUpdateFailed', 'error');
      }
    }
  }

  // ========== 日志管理相关方法 ==========

  async loadLogs() {
    try {
      const result = await window.electronAPI.log.getAll();
      const logsList = document.getElementById('logsList');
      
      if (!result.success || result.logs.length === 0) {
        logsList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">暂无日志</p>';
        return;
      }

      logsList.innerHTML = result.logs.map(log => `
        <div class="log-item">
          <div class="log-info">
            <div class="log-name">${log.name}</div>
            <div class="log-meta">
              <span>大小: ${this.formatSize(log.size)}</span>
              <span>创建: ${new Date(log.created).toLocaleString('zh-CN')}</span>
              <span>修改: ${new Date(log.modified).toLocaleString('zh-CN')}</span>
            </div>
          </div>
          <div class="log-actions">
            <button class="btn-icon log-view-btn" data-log-path="${this.escapeHtml(log.path)}" data-i18n-title="logs.view" title="${this.t('logs.view')}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2C4.5 2 1.5 4.5 0 8c1.5 3.5 4.5 6 8 6s6.5-2.5 8-6c-1.5-3.5-4.5-6-8-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm0-6.5c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5z"/>
              </svg>
            </button>
            <button class="btn-icon log-export-btn" data-log-path="${this.escapeHtml(log.path)}" data-i18n-title="logs.export" title="${this.t('logs.export')}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0L4 4h3v5h2V4h3L8 0zM2 12v2h12v-2H2z"/>
              </svg>
            </button>
            <button class="btn-icon log-delete-btn" data-log-path="${this.escapeHtml(log.path)}" data-i18n-title="logs.delete" title="${this.t('logs.delete')}" style="color: #f44336;">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11 2H9c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1H5c-.55 0-1 .45-1 1v1h8V3c0-.55-.45-1-1-1zM4 5v9c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V5H4z"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('');
      
      // 绑定事件监听器
      document.querySelectorAll('.log-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.showLogViewer(btn.dataset.logPath);
        });
      });
      
      document.querySelectorAll('.log-export-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.exportLog(btn.dataset.logPath);
        });
      });
      
      document.querySelectorAll('.log-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.deleteLog(btn.dataset.logPath);
        });
      });
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.showNotification('notify.loadLogsFailed', 'error');
    }
  }

  async showLogViewer(logPath) {
    try {
      const result = await window.electronAPI.log.read(logPath);
      
      if (!result.success) {
        this.showNotification('notify.readLogFailed', 'error');
        return;
      }

      // 创建日志查看器对话框
      const viewer = document.createElement('div');
      viewer.className = 'log-viewer-overlay';
      viewer.innerHTML = `
        <div class="log-viewer-dialog">
          <div class="log-viewer-header">
            <h3>日志内容</h3>
            <button class="btn-icon" onclick="this.closest('.log-viewer-overlay').remove()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 6.6L13.3 1.3c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4L9.4 8l5.3 5.3c.4.4.4 1 0 1.4-.4.4-1 .4-1.4 0L8 9.4l-5.3 5.3c-.4.4-1 .4-1.4 0-.4-.4-.4-1 0-1.4L6.6 8 1.3 2.7c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0L8 6.6z"/>
              </svg>
            </button>
          </div>
          <div class="log-viewer-content">
            <pre>${this.escapeHtml(result.content)}</pre>
          </div>
          <div class="log-viewer-footer">
            <button class="btn-secondary" onclick="this.closest('.log-viewer-overlay').remove()">关闭</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(viewer);
    } catch (error) {
      console.error('Failed to show log viewer:', error);
      this.showNotification('notify.showLogFailed', 'error');
    }
  }

  async deleteLog(logPath) {
    if (!confirm(this.t('logs.deleteConfirm'))) {
      return;
    }

    try {
      const result = await window.electronAPI.log.delete(logPath);
      
      if (result.success) {
        this.showNotification('notify.logDeleted', 'success');
        await this.loadLogs();
      } else {
        this.showNotification(this.t('notify.deleteLogFailed') + ': ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to delete log:', error);
      this.showNotification('notify.deleteLogFailed', 'error');
    }
  }

  async clearAllLogs() {
    if (!confirm(this.t('logs.clearAllConfirm'))) {
      return;
    }

    try {
      const result = await window.electronAPI.log.clearAll();
      
      if (result.success) {
        this.showNotification('notify.allLogsCleared', 'success');
        await this.loadLogs();
      } else {
        this.showNotification(this.t('notify.clearLogsFailed') + ': ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
      this.showNotification('notify.clearLogsFailed', 'error');
    }
  }

  async exportLog(logPath) {
    try {
      const result = await window.electronAPI.log.export(logPath);
      
      if (result.success) {
        this.showNotification('notify.logExported', 'success');
      } else if (result.cancelled) {
        // 用户取消了，不显示错误
      } else {
        this.showNotification(this.t('notify.exportLogFailed') + ': ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export log:', error);
      this.showNotification('notify.exportLogFailed', 'error');
    }
  }

  async openLogDir() {
    try {
      await window.electronAPI.log.openDir();
    } catch (error) {
      console.error('Failed to open log directory:', error);
      this.showNotification('notify.openLogDirFailed', 'error');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 终端分屏功能 ==========

  splitTerminal(layout = 'horizontal') {
    if (!this.activeSessionId || this.activeSessionId.startsWith('sftp-')) {
      this.showNotification('notify.connectSessionFirst', 'error');
      return;
    }

    // 检查分屏数量限制
    if (this.splitSessions.has(this.activeSessionId)) {
      const splitData = this.splitSessions.get(this.activeSessionId);
      if (splitData.panes.length >= 4) {
        this.showNotification('notify.maxSplitReached', 'info');
        return;
      }
      // 如果已经有分屏，继续添加（保持当前布局或升级为网格）
      layout = this.determineLayout(splitData.panes.length + 1);
    }

    // 显示会话选择对话框
    this.showSplitSessionDialog(layout);
  }

  determineLayout(paneCount) {
    // 根据分屏数量决定布局
    if (paneCount <= 2) {
      // 2 个分屏，保持原有布局（水平或垂直）
      if (this.splitSessions.has(this.activeSessionId)) {
        return this.splitSessions.get(this.activeSessionId).layout;
      }
      return 'horizontal'; // 默认水平
    } else if (paneCount === 3) {
      // 3 个分屏，使用网格布局
      return 'grid-3';
    } else {
      // 4 个分屏，使用 2x2 网格
      return 'grid-4';
    }
  }

  showSplitSessionDialog(layout) {
    // 保存分屏布局信息
    this.pendingSplitLayout = layout;
    
    const dialog = document.getElementById('splitSessionDialog');
    const title = document.getElementById('splitSessionDialogTitle');
    title.textContent = `${this.t('split.selectSession')} (${layout === 'horizontal' ? this.t('connect.titleSplitHorizontal').split('(')[1].replace(')', '') : this.t('connect.titleSplitVertical').split('(')[1].replace(')', '')})`;
    
    // 重置对话框状态
    document.getElementById('savedSessionsList').style.display = 'none';
    document.querySelector('.split-session-options').style.display = 'flex';
    
    dialog.style.display = 'flex';
  }

  showSplitConnectDialog() {
    // 隐藏会话选择对话框
    document.getElementById('splitSessionDialog').style.display = 'none';
    
    // 显示连接对话框
    this.showConnectDialog();
    
    // 修改对话框标题
    const layout = this.pendingSplitLayout;
    document.querySelector('#connectDialog h3').textContent = layout === 'horizontal' ? this.t('connect.titleSplitHorizontal') : this.t('connect.titleSplitVertical');
    document.getElementById('connectSubmitBtn').textContent = this.t('connect.btnConnectAndSplit');
    document.getElementById('saveSession').parentElement.style.display = 'none';
  }

  showSavedSessionsList() {
    // 隐藏选项按钮，显示会话列表
    document.querySelector('.split-session-options').style.display = 'none';
    document.getElementById('savedSessionsList').style.display = 'block';
    
    // 渲染会话列表
    this.renderSplitSessionsList();
  }

  renderSplitSessionsList(filter = '') {
    const container = document.getElementById('splitSessionsContainer');
    const sessions = this.savedSessions.filter(session => {
      if (!filter) return true;
      const searchText = filter.toLowerCase();
      return (
        session.name?.toLowerCase().includes(searchText) ||
        session.host?.toLowerCase().includes(searchText) ||
        session.username?.toLowerCase().includes(searchText) ||
        session.group?.toLowerCase().includes(searchText)
      );
    });

    if (sessions.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">没有找到会话</div>';
      return;
    }

    container.innerHTML = sessions.map(session => `
      <div class="split-session-item" data-session-id="${session.id}">
        <div class="split-session-name">
          ${session.group ? `<span class="split-session-group">${session.group}</span>` : ''}
          ${session.name || `${session.username}@${session.host}`}
        </div>
        <div class="split-session-info">
          ${session.username}@${session.host}:${session.port || 22}
        </div>
      </div>
    `).join('');

    // 添加点击事件
    container.querySelectorAll('.split-session-item').forEach(item => {
      item.addEventListener('click', () => {
        const sessionId = item.dataset.sessionId;
        this.connectSplitWithSavedSession(sessionId);
      });
    });
  }

  filterSplitSessions(query) {
    this.renderSplitSessionsList(query);
  }

  async connectSplitWithSavedSession(sessionId) {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (!session) {
      this.showNotification('notify.sessionNotFound', 'error');
      return;
    }

    // 隐藏对话框
    document.getElementById('splitSessionDialog').style.display = 'none';

    // 创建配置对象
    const config = { ...session };

    // 创建分屏面板
    const layout = this.pendingSplitLayout;
    this.pendingSplitLayout = null;

    const result = await this.createSplitPane(this.activeSessionId, layout, config);

    if (result) {
      this.showNotification('notify.splitCreatedSuccess', 'success');
    }
  }

  async createSplitPane(parentSessionId, layout, config) {
    const paneId = `pane-${Date.now()}`;
    
    try {
      // 连接新的 SSH 会话
      const result = await window.electronAPI.ssh.connect(config);
      
      if (!result.success) {
        this.showNotification(this.t('notify.connectFailed') + ': ' + result.error, 'error');
        return null;
      }

      const sshSessionId = result.sessionId;
      
      // 加载保存的设置
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const themes = this.getPresetThemes();
      
      // 获取当前主题的终端配置
      let terminalConfig;
      if (settings.themeMode === 'custom' && settings.customTheme && settings.customTheme.terminal) {
        terminalConfig = settings.customTheme.terminal;
      } else if (settings.themeMode && themes[settings.themeMode]) {
        terminalConfig = themes[settings.themeMode].terminal;
      } else {
        // 默认使用深色主题的终端配置
        terminalConfig = themes.dark.terminal;
      }
      
      // 如果用户有自定义终端设置，覆盖主题的终端配置
      if (settings.terminal) {
        terminalConfig = {
          ...terminalConfig,
          fontSize: settings.terminal.fontSize || terminalConfig.fontSize,
          fontFamily: settings.terminal.fontFamily || terminalConfig.fontFamily,
          cursorStyle: settings.terminal.cursorStyle || terminalConfig.cursorStyle,
          cursorBlink: settings.terminal.cursorBlink !== undefined ? settings.terminal.cursorBlink : terminalConfig.cursorBlink,
          background: settings.terminal.background || terminalConfig.background,
          foreground: settings.terminal.foreground || terminalConfig.foreground,
          cursor: settings.terminal.cursor || terminalConfig.cursor
        };
      }
      
      // 创建终端实例
      const terminal = new window.Terminal({
        cursorBlink: terminalConfig.cursorBlink,
        fontSize: terminalConfig.fontSize,
        lineHeight: 1.2,
        fontFamily: terminalConfig.fontFamily,
        cursorStyle: terminalConfig.cursorStyle,
        theme: {
          background: terminalConfig.background,
          foreground: terminalConfig.foreground,
          cursor: terminalConfig.cursor,
          cursorAccent: terminalConfig.cursorAccent
        },
        scrollback: 1000,
        allowProposedApi: true,
        // 性能优化选项
        fastScrollModifier: 'shift',
        fastScrollSensitivity: 5,
        scrollSensitivity: 3,
        rendererType: 'canvas',
        disableStdin: false,
        windowsMode: false,
        windowOptions: {
          setWinSizePixels: false,
          setWinSizeChars: false
        },
        // 额外的性能优化
        convertEol: false,
        screenReaderMode: false,
        drawBoldTextInBrightColors: true,
        minimumContrastRatio: 1
      });

      const fitAddon = new window.FitAddon();
      const searchAddon = new window.SearchAddon();
      
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(searchAddon);

      // 监听终端输入
      terminal.onData((data) => {
        this.handleTerminalInput(sshSessionId, data);
      });

      // 添加自定义键盘事件处理器，处理粘贴和复制
      terminal.attachCustomKeyEventHandler((event) => {
        // Ctrl+V / Cmd+V 粘贴
        if ((event.ctrlKey || event.metaKey) && event.key === 'v' && event.type === 'keydown') {
          event.preventDefault();
          // 从剪贴板读取并粘贴
          navigator.clipboard.readText().then(text => {
            terminal.paste(text);
          }).catch(err => {
            console.error('Failed to read clipboard:', err);
          });
          return false; // 阻止默认行为
        }
        
        // Ctrl+C / Cmd+C：如果有选中文本则复制
        if ((event.ctrlKey || event.metaKey) && event.key === 'c' && event.type === 'keydown') {
          if (terminal.hasSelection()) {
            event.preventDefault();
            const selection = terminal.getSelection();
            navigator.clipboard.writeText(selection).catch(err => {
              console.error('Failed to write clipboard:', err);
            });
            return false; // 阻止默认行为
          }
          // 没有选中文本，让终端处理（发送 Ctrl+C）
        }
        
        // 其他按键正常处理
        return true;
      });

      // 保存终端数据
      this.terminals.set(sshSessionId, {
        terminal,
        fitAddon,
        searchAddon,
        config,
        parentSessionId,
        paneId
      });

      // 如果是第一次分屏，需要初始化分屏容器
      if (!this.splitSessions.has(parentSessionId)) {
        await this.initializeSplitContainer(parentSessionId, layout);
      }

      // 添加分屏面板
      const splitData = this.splitSessions.get(parentSessionId);
      splitData.panes.push({
        paneId,
        sshSessionId,
        config,
        terminal,
        fitAddon
      });

      // 根据分屏数量更新布局
      const newLayout = this.determineLayout(splitData.panes.length);
      if (newLayout !== splitData.layout) {
        splitData.layout = newLayout;
      }

      // 渲染分屏界面
      this.renderSplitPanes(parentSessionId);
      
      // 设置活动面板
      this.activePaneId = paneId;
      terminal.focus();

      return { paneId, sshSessionId };
    } catch (error) {
      console.error('Failed to create split pane:', error);
      this.showNotification(this.t('notify.createSplitFailed') + ': ' + error.message, 'error');
      return null;
    }
  }

  async initializeSplitContainer(sessionId, layout) {
    // 获取原始终端
    const originalTerminal = this.terminals.get(sessionId);
    if (!originalTerminal) return;

    // 创建分屏数据结构
    this.splitSessions.set(sessionId, {
      layout,
      panes: [{
        paneId: `pane-${sessionId}`,
        sshSessionId: sessionId,
        config: originalTerminal.config,
        terminal: originalTerminal.terminal,
        fitAddon: originalTerminal.fitAddon
      }]
    });

    // 显示工具栏和关闭分屏按钮
    document.getElementById('terminalToolbar').style.display = 'flex';
    document.getElementById('closeSplitBtn').style.display = 'flex';
  }

  renderSplitPanes(sessionId) {
    const splitData = this.splitSessions.get(sessionId);
    if (!splitData) return;

    const container = document.getElementById('terminalContainer');
    
    // 隐藏所有普通终端
    document.querySelectorAll('.terminal-wrapper').forEach(el => {
      el.classList.remove('active');
    });
    
    // 隐藏所有其他会话的分屏容器
    document.querySelectorAll('.split-container').forEach(el => {
      if (el.id !== `split-${sessionId}`) {
        el.style.display = 'none';
      }
    });
    
    // 移除旧的分屏容器（如果存在）
    const oldSplitContainer = document.getElementById(`split-${sessionId}`);
    if (oldSplitContainer) {
      oldSplitContainer.remove();
    }

    // 创建分屏容器
    const splitContainer = document.createElement('div');
    splitContainer.className = `split-container ${splitData.layout}`;
    splitContainer.id = `split-${sessionId}`;

    // 创建每个分屏面板
    splitData.panes.forEach((pane, index) => {
      const paneElement = document.createElement('div');
      paneElement.className = 'split-pane';
      paneElement.id = pane.paneId;

      // 面板头部
      const header = document.createElement('div');
      header.className = 'split-pane-header';
      
      const title = document.createElement('div');
      title.className = 'split-pane-title';
      const sessionName = pane.config.name || `${pane.config.username}@${pane.config.host}`;
      title.textContent = `${index + 1}. ${sessionName}`;
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'split-pane-close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = this.t('sftp.closePaneTitle');
      closeBtn.onclick = () => this.closeSplitPane(sessionId, pane.paneId);
      
      header.appendChild(title);
      header.appendChild(closeBtn);

      // 面板内容
      const content = document.createElement('div');
      content.className = 'split-pane-content';
      content.id = `${pane.paneId}-content`;

      paneElement.appendChild(header);
      paneElement.appendChild(content);
      splitContainer.appendChild(paneElement);

      // 将终端附加到面板
      setTimeout(() => {
        // 检查终端是否已经有 element
        if (pane.terminal.element) {
          // 终端已经打开过，移动 DOM 元素
          content.appendChild(pane.terminal.element);
        } else {
          // 终端还没打开过，调用 open
          pane.terminal.open(content);
        }
        
        pane.fitAddon.fit();
        
        // fit 之后通知 SSH 终端大小
        setTimeout(() => {
          if (pane.terminal.cols && pane.terminal.rows) {
            window.electronAPI.ssh.resize(
              pane.sshSessionId,
              pane.terminal.cols,
              pane.terminal.rows
            );
          }
        }, 50);
        
        // 添加点击事件，切换活动面板
        content.addEventListener('click', () => {
          this.activePaneId = pane.paneId;
          pane.terminal.focus();
        });
      }, 0);
    });

    // 显示当前分屏容器（使用 flex，不是 grid）
    splitContainer.style.display = 'flex';
    container.appendChild(splitContainer);

    // 监听窗口大小变化
    setTimeout(() => {
      splitData.panes.forEach(pane => {
        pane.fitAddon.fit();
        
        // fit 之后通知 SSH 终端大小
        setTimeout(() => {
          if (pane.terminal.cols && pane.terminal.rows) {
            window.electronAPI.ssh.resize(
              pane.sshSessionId,
              pane.terminal.cols,
              pane.terminal.rows
            );
          }
        }, 50);
      });
    }, 100);
  }

  async closeSplitPane(sessionId, paneId) {
    const splitData = this.splitSessions.get(sessionId);
    if (!splitData) return;

    // 找到要关闭的面板
    const paneIndex = splitData.panes.findIndex(p => p.paneId === paneId);
    if (paneIndex === -1) return;

    const pane = splitData.panes[paneIndex];

    // 断开 SSH 连接
    if (pane.sshSessionId) {
      // 获取实际的 SSH sessionId（可能重连后变了）
      const terminalData = this.terminals.get(pane.sshSessionId);
      const actualSessionId = terminalData ? (terminalData.sessionId || pane.sshSessionId) : pane.sshSessionId;
      
      await window.electronAPI.ssh.disconnect(actualSessionId);
      this.terminals.delete(pane.sshSessionId);
    }

    // 从面板列表中移除
    splitData.panes.splice(paneIndex, 1);

    // 如果只剩一个面板，关闭分屏模式
    if (splitData.panes.length === 1) {
      this.closeSplit();
    } else {
      // 根据剩余面板数量更新布局
      const newLayout = this.determineLayout(splitData.panes.length);
      if (newLayout !== splitData.layout) {
        splitData.layout = newLayout;
      }
      
      // 重新渲染分屏
      this.renderSplitPanes(sessionId);
    }
  }

  closeSplit() {
    if (!this.activeSessionId || !this.splitSessions.has(this.activeSessionId)) {
      return;
    }

    const splitData = this.splitSessions.get(this.activeSessionId);
    
    // 关闭所有额外的面板（保留第一个）
    const panesToClose = splitData.panes.slice(1);
    
    panesToClose.forEach(async (pane) => {
      if (pane.sshSessionId && pane.sshSessionId !== this.activeSessionId) {
        // 获取实际的 SSH sessionId（可能重连后变了）
        const terminalData = this.terminals.get(pane.sshSessionId);
        const actualSessionId = terminalData ? (terminalData.sessionId || pane.sshSessionId) : pane.sshSessionId;
        
        await window.electronAPI.ssh.disconnect(actualSessionId);
        this.terminals.delete(pane.sshSessionId);
      }
    });

    // 删除分屏数据
    this.splitSessions.delete(this.activeSessionId);

    // 显示工具栏但隐藏关闭分屏按钮
    document.getElementById('terminalToolbar').style.display = 'flex';
    document.getElementById('closeSplitBtn').style.display = 'none';

    // 恢复原始终端显示
    const container = document.getElementById('terminalContainer');
    container.innerHTML = '';

    // 重新创建原始终端包装器
    const terminalData = this.terminals.get(this.activeSessionId);
    if (terminalData) {
      const wrapper = document.createElement('div');
      wrapper.className = 'terminal-wrapper active';
      wrapper.id = `terminal-${this.activeSessionId}`;
      container.appendChild(wrapper);

      // 检查终端是否已经有 element
      if (terminalData.terminal.element) {
        // 终端已经打开过，移动 DOM 元素
        wrapper.appendChild(terminalData.terminal.element);
      } else {
        // 终端还没打开过，调用 open
        terminalData.terminal.open(wrapper);
      }
      
      setTimeout(() => {
        terminalData.fitAddon.fit();
        terminalData.terminal.focus();
        
        // fit 之后通知 SSH 终端大小
        setTimeout(() => {
          if (terminalData.terminal.cols && terminalData.terminal.rows) {
            window.electronAPI.ssh.resize(
              this.activeSessionId,
              terminalData.terminal.cols,
              terminalData.terminal.rows
            );
          }
        }, 50);
      }, 100);
    }

    this.showNotification('notify.splitClosed', 'success');
  }

  // ========== 同步输入功能 ==========

  toggleSyncInput() {
    // 循环切换模式: OFF -> ALL -> SPLIT -> OFF
    if (this.syncInputMode === 'OFF') {
      this.syncInputMode = 'ALL';
    } else if (this.syncInputMode === 'ALL') {
      // 只有在分屏模式下才能切换到 SPLIT
      if (this.splitSessions.has(this.activeSessionId)) {
        this.syncInputMode = 'SPLIT';
      } else {
        this.syncInputMode = 'OFF';
      }
    } else {
      this.syncInputMode = 'OFF';
    }

    this.updateSyncInputUI();
  }

  updateSyncInputUI() {
    const btn = document.getElementById('syncInputBtn');
    const text = document.getElementById('syncInputText');

    if (this.syncInputMode === 'OFF') {
      btn.classList.remove('active');
      text.textContent = this.t('syncInput.off');
      btn.title = this.t('syncInput.titleOff');
    } else if (this.syncInputMode === 'ALL') {
      btn.classList.add('active');
      const count = this.terminals.size;
      text.textContent = `${this.t('syncInput.all')} (${count})`;
      btn.title = `${this.t('syncInput.titleAll')} (${count})`;
    } else if (this.syncInputMode === 'SPLIT') {
      btn.classList.add('active');
      const splitData = this.splitSessions.get(this.activeSessionId);
      const count = splitData ? splitData.panes.length : 0;
      text.textContent = `${this.t('syncInput.split')} (${count})`;
      btn.title = `${this.t('syncInput.titleSplit')} (${count})`;
    }
  }

  handleTerminalInput(sessionId, data) {
    const terminalData = this.terminals.get(sessionId);
    
    // 快速路径：最常见的情况 - 单会话，无特殊状态
    if (terminalData && !terminalData.waitingForReconnect && !terminalData.disconnected && this.syncInputMode === 'OFF') {
      const sid = terminalData.sessionId || sessionId;
      window.electronAPI.ssh.send(sid, data);
      return;
    }
    
    // 次快速路径：有 terminalData 但需要同步输入
    if (terminalData && !terminalData.waitingForReconnect && !terminalData.disconnected) {
      const currentSessionId = terminalData.sessionId || sessionId;
      
      if (this.syncInputMode === 'ALL') {
        // 批量发送到所有会话
        for (const [sid, tData] of this.terminals) {
          window.electronAPI.ssh.send(tData.sessionId || sid, data);
        }
      } else if (this.syncInputMode === 'SPLIT') {
        const splitData = this.splitSessions.get(this.activeSessionId);
        if (splitData) {
          // 批量发送到分屏面板
          for (const pane of splitData.panes) {
            const paneTerminalData = this.terminals.get(pane.sshSessionId);
            const sid = paneTerminalData ? (paneTerminalData.sessionId || pane.sshSessionId) : pane.sshSessionId;
            window.electronAPI.ssh.send(sid, data);
          }
        } else {
          window.electronAPI.ssh.send(currentSessionId, data);
        }
      } else {
        window.electronAPI.ssh.send(currentSessionId, data);
      }
      return;
    }
    
    // 慢速路径：处理特殊情况
    if (!terminalData) {
      // 如果找不到，可能是重连后 sessionId 变了
      if (this.terminals.size === 1) {
        const [sid, tData] = this.terminals.entries().next().value;
        if (tData && !tData.waitingForReconnect && !tData.disconnected) {
          window.electronAPI.ssh.send(tData.sessionId || sid, data);
        }
      }
      return;
    }
    
    // 检查是否等待重连
    if (terminalData.waitingForReconnect) {
      if (data === '\r') {
        terminalData.waitingForReconnect = false;
        this.reconnectSession(sessionId);
      }
      return;
    }
  }

  // ========== 终端搜索功能 ==========

  toggleSearch() {
    const searchBox = document.getElementById('terminalSearchBox');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBox.style.display === 'none') {
      searchBox.style.display = 'flex';
      searchInput.focus();
      searchInput.select();
    } else {
      this.closeSearch();
    }
  }

  closeSearch() {
    const searchBox = document.getElementById('terminalSearchBox');
    const searchInput = document.getElementById('searchInput');
    
    searchBox.style.display = 'none';
    searchInput.value = '';
    
    // 清除高亮
    const terminalData = this.terminals.get(this.activeSessionId);
    if (terminalData && terminalData.searchAddon) {
      terminalData.searchAddon.clearDecorations();
    }
    
    // 恢复终端焦点
    if (terminalData) {
      terminalData.terminal.focus();
    }
  }

  performSearch(keyword) {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    const caseSensitiveBtn = document.getElementById('searchCaseSensitiveBtn');
    const regexBtn = document.getElementById('searchRegexBtn');
    
    // 显示/隐藏清除按钮
    clearBtn.style.display = keyword ? 'block' : 'none';
    
    if (!keyword) {
      document.getElementById('searchCount').textContent = '0/0';
      const terminalData = this.terminals.get(this.activeSessionId);
      if (terminalData && terminalData.searchAddon) {
        terminalData.searchAddon.clearDecorations();
      }
      return;
    }
    
    const terminalData = this.terminals.get(this.activeSessionId);
    if (!terminalData || !terminalData.searchAddon) {
      return;
    }
    
    const options = {
      caseSensitive: caseSensitiveBtn.classList.contains('active'),
      regex: regexBtn.classList.contains('active')
    };
    
    try {
      const found = terminalData.searchAddon.findNext(keyword, options);
      // 注意：xterm.js 的 SearchAddon 不直接返回匹配数量
      // 这里简化处理，只显示是否找到
      if (found) {
        document.getElementById('searchCount').textContent = this.t('search.found');
      } else {
        document.getElementById('searchCount').textContent = this.t('search.noMatch');
      }
    } catch (error) {
      console.error('Search error:', error);
      document.getElementById('searchCount').textContent = this.t('search.error');
    }
  }

  searchNext() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword) return;
    
    const terminalData = this.terminals.get(this.activeSessionId);
    if (!terminalData || !terminalData.searchAddon) return;
    
    const caseSensitiveBtn = document.getElementById('searchCaseSensitiveBtn');
    const regexBtn = document.getElementById('searchRegexBtn');
    
    const options = {
      caseSensitive: caseSensitiveBtn.classList.contains('active'),
      regex: regexBtn.classList.contains('active')
    };
    
    terminalData.searchAddon.findNext(keyword, options);
  }

  searchPrevious() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword) return;
    
    const terminalData = this.terminals.get(this.activeSessionId);
    if (!terminalData || !terminalData.searchAddon) return;
    
    const caseSensitiveBtn = document.getElementById('searchCaseSensitiveBtn');
    const regexBtn = document.getElementById('searchRegexBtn');
    
    const options = {
      caseSensitive: caseSensitiveBtn.classList.contains('active'),
      regex: regexBtn.classList.contains('active')
    };
    
    terminalData.searchAddon.findPrevious(keyword, options);
  }

  // ========== 字体大小调整 ==========

  increaseFontSize() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const currentSize = settings.fontSize || 14;
    const newSize = Math.min(currentSize + 1, 24); // 最大 24
    
    if (newSize !== currentSize) {
      settings.fontSize = newSize;
      localStorage.setItem('appSettings', JSON.stringify(settings));
      this.applyFontSizeToAllTerminals(newSize);
      this.showNotification(`字体大小: ${newSize}`, 'success');
    }
  }

  decreaseFontSize() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const currentSize = settings.fontSize || 14;
    const newSize = Math.max(currentSize - 1, 10); // 最小 10
    
    if (newSize !== currentSize) {
      settings.fontSize = newSize;
      localStorage.setItem('appSettings', JSON.stringify(settings));
      this.applyFontSizeToAllTerminals(newSize);
      this.showNotification(`字体大小: ${newSize}`, 'success');
    }
  }

  resetFontSize() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const defaultSize = 14;
    
    if (settings.fontSize !== defaultSize) {
      settings.fontSize = defaultSize;
      localStorage.setItem('appSettings', JSON.stringify(settings));
      this.applyFontSizeToAllTerminals(defaultSize);
      this.showNotification(`字体大小已重置: ${defaultSize}`, 'success');
    }
  }

  applyFontSizeToAllTerminals(fontSize) {
    // 应用到所有已打开的终端
    this.terminals.forEach((terminalData) => {
      if (terminalData.terminal) {
        terminalData.terminal.options.fontSize = fontSize;
        terminalData.terminal.options.lineHeight = 1.2;  // 同时更新行高
        // 重新调整大小以应用新字体
        if (terminalData.fitAddon) {
          setTimeout(() => {
            terminalData.fitAddon.fit();
            
            // fit 之后通知 SSH 终端大小
            setTimeout(() => {
              const sessionId = Array.from(this.terminals.entries())
                .find(([_, data]) => data === terminalData)?.[0];
              
              if (sessionId && terminalData.terminal.cols && terminalData.terminal.rows) {
                window.electronAPI.ssh.resize(
                  sessionId,
                  terminalData.terminal.cols,
                  terminalData.terminal.rows
                );
              }
            }, 50);
          }, 50);
        }
      }
    });
    
    // 应用到分屏终端
    this.splitSessions.forEach((splitData) => {
      splitData.panes.forEach((pane) => {
        if (pane.terminal) {
          pane.terminal.options.fontSize = fontSize;
          pane.terminal.options.lineHeight = 1.2;  // 同时更新行高
          if (pane.fitAddon) {
            setTimeout(() => {
              pane.fitAddon.fit();
              
              // fit 之后通知 SSH 终端大小
              setTimeout(() => {
                if (pane.terminal.cols && pane.terminal.rows) {
                  window.electronAPI.ssh.resize(
                    pane.sshSessionId,
                    pane.terminal.cols,
                    pane.terminal.rows
                  );
                }
              }, 50);
            }, 50);
          }
        }
      });
    });
  }

  // ========== 本地 Shell 功能 ==========

  // 打开本地终端
  async openLocalShell() {
    try {
      const result = await window.electronAPI.localShell.spawn({
        cols: 80,
        rows: 24
      });

      if (!result.success) {
        this.showNotification(`打开本地终端失败: ${result.error}`, 'error');
        return;
      }

      const sessionId = result.sessionId;
      const shellName = result.shell.split('/').pop() || result.shell;
      const config = {
        name: `本地终端 (${shellName})`,
        type: 'local',
        shell: result.shell,
        cwd: result.cwd
      };

      // 创建终端
      this.createLocalTerminal(sessionId, config);
      
      // 监听本地 Shell 数据
      window.electronAPI.localShell.onData((data) => {
        if (data.sessionId === sessionId) {
          const terminalData = this.terminals.get(sessionId);
          if (terminalData && terminalData.terminal) {
            terminalData.terminal.write(data.data);
          }
        }
      });

      // 监听本地 Shell 关闭
      window.electronAPI.localShell.onClosed((data) => {
        if (data.sessionId === sessionId) {
          console.log(`[LocalShell] Closed: ${sessionId}`);
          this.closeSession(sessionId);
        }
      });

      this.showNotification('本地终端已打开', 'success');
    } catch (error) {
      console.error('[LocalShell] Failed to open:', error);
      this.showNotification('打开本地终端失败', 'error');
    }
  }

  // 创建本地终端
  createLocalTerminal(sessionId, config) {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const themes = this.getPresetThemes();
    
    let terminalConfig;
    if (settings.themeMode === 'custom' && settings.customTheme && settings.customTheme.terminal) {
      terminalConfig = settings.customTheme.terminal;
    } else if (settings.themeMode && themes[settings.themeMode]) {
      terminalConfig = themes[settings.themeMode].terminal;
    } else {
      terminalConfig = themes.dark.terminal;
    }
    
    if (settings.terminal) {
      terminalConfig = {
        ...terminalConfig,
        fontSize: settings.terminal.fontSize || terminalConfig.fontSize,
        fontFamily: settings.terminal.fontFamily || terminalConfig.fontFamily,
        cursorStyle: settings.terminal.cursorStyle || terminalConfig.cursorStyle,
        cursorBlink: settings.terminal.cursorBlink !== undefined ? settings.terminal.cursorBlink : terminalConfig.cursorBlink,
        background: settings.terminal.background || terminalConfig.background,
        foreground: settings.terminal.foreground || terminalConfig.foreground,
        cursor: settings.terminal.cursor || terminalConfig.cursor
      };
    }
    
    const terminal = new window.Terminal({
      cursorBlink: terminalConfig.cursorBlink,
      fontSize: terminalConfig.fontSize,
      lineHeight: 1.2,
      fontFamily: terminalConfig.fontFamily,
      cursorStyle: terminalConfig.cursorStyle,
      theme: {
        background: terminalConfig.background,
        foreground: terminalConfig.foreground,
        cursor: terminalConfig.cursor,
        cursorAccent: terminalConfig.cursorAccent
      },
      scrollback: 1000,
      allowProposedApi: true
    });

    const fitAddon = new window.FitAddon();
    const searchAddon = new window.SearchAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';
    wrapper.id = `terminal-${sessionId}`;
    document.getElementById('terminalContainer').appendChild(wrapper);

    terminal.open(wrapper);
    
    setTimeout(() => {
      fitAddon.fit();
      terminal.focus();
      
      setTimeout(() => {
        if (terminal.cols && terminal.rows) {
          window.electronAPI.localShell.resize(sessionId, terminal.cols, terminal.rows);
        }
      }, 100);
    }, 200);

    terminal.onData((data) => {
      window.electronAPI.localShell.write(sessionId, data);
    });

    terminal.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && event.type === 'keydown') {
        event.preventDefault();
        navigator.clipboard.readText().then(text => {
          terminal.paste(text);
        }).catch(err => {
          console.error('Failed to read clipboard:', err);
        });
        return false;
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && event.type === 'keydown') {
        if (terminal.hasSelection()) {
          event.preventDefault();
          const selection = terminal.getSelection();
          navigator.clipboard.writeText(selection).catch(err => {
            console.error('Failed to write clipboard:', err);
          });
          return false;
        }
      }
      
      return true;
    });

    this.terminals.set(sessionId, {
      terminal,
      fitAddon,
      searchAddon,
      sessionId,
      config,
      type: 'local'
    });

    this.createLocalTab(sessionId, config);
    this.switchToSession(sessionId);
    
    document.getElementById('terminalToolbar').style.display = 'flex';
  }

  // 创建本地终端标签页
  createLocalTab(sessionId, config) {
    const tabsContainer = document.getElementById('tabs');
    const tab = document.createElement('div');
    tab.className = 'tab local-shell-tab';
    tab.id = `tab-${sessionId}`;
    
    tab.innerHTML = `
      <span class="tab-status connected" title="本地终端">💻</span>
      <span class="tab-name">${config.name}</span>
      <span class="tab-close" data-session="${sessionId}">✕</span>
    `;

    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.switchToSession(sessionId);
      }
    });

    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeSession(sessionId);
    });

    tabsContainer.appendChild(tab);
  }
}

// 初始化应用
const app = new SSHClient();

// 应用保存的设置
const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
if (Object.keys(savedSettings).length > 0) {
  app.applySettings(savedSettings);
}
