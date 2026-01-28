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
      send: (sessionId, data) => window.ipcRenderer.invoke('ssh:send', { sessionId, data }),
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
      import: () => window.ipcRenderer.invoke('session:import')
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
    getAppVersion: () => window.ipcRenderer.invoke('get-app-version')
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
    this.currentSftpPath = {};
    this.editingSessionId = null;
    this.searchQuery = '';
    this.selectedFiles = new Set();
    this.currentTransferId = null;
    this.settingsDialogInitialized = false; // 标记设置对话框是否已初始化
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSessions();
    
    // 加载并显示版本号
    this.loadAppVersion();
    
    // 检查更新
    this.checkForUpdates();
    
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

    // 监听窗口大小变化，调整所有终端
    let resizeTimeout;
    window.addEventListener('resize', () => {
      // 使用防抖，避免频繁调整
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.terminals.forEach((terminalData) => {
          if (terminalData.fitAddon) {
            terminalData.fitAddon.fit();
            // 通知后端更新终端大小
            if (terminalData.terminal) {
              window.electronAPI.ssh.resize(
                terminalData.sessionId, 
                terminalData.terminal.cols, 
                terminalData.terminal.rows
              );
            }
          }
        });
      }, 100);
    });
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
      this.showNotification('传输已取消', 'info');
      const progressBar = document.getElementById('progressBar');
      if (progressBar) {
        progressBar.remove();
      }
      this.currentTransferId = null;
    }
  }

  setupEventListeners() {
    document.getElementById('newSessionBtn').addEventListener('click', () => {
      this.showConnectDialog();
    });

    document.getElementById('newGroupBtn').addEventListener('click', () => {
      this.createNewGroup();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportConfig();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      this.importConfig();
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

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N: 新建连接
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showConnectDialog();
      }
      // Ctrl/Cmd + F: 聚焦搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('sessionSearch').focus();
      }
      // ESC: 关闭对话框
      if (e.key === 'Escape') {
        const dialogs = document.querySelectorAll('.dialog');
        dialogs.forEach(dialog => {
          if (dialog.style.display === 'flex') {
            dialog.style.display = 'none';
          }
        });
      }
    });

    // 点击版本号检查更新
    document.getElementById('statusVersion').addEventListener('click', () => {
      this.checkForUpdates(true);
    });
  }

  showConnectDialog() {
    // 重置编辑模式
    this.editingSessionId = null;
    document.querySelector('#connectDialog h3').textContent = '新建 SSH 连接';
    document.getElementById('connectSubmitBtn').textContent = '连接';
    document.getElementById('saveSession').parentElement.style.display = 'block';
    
    // 更新分组下拉列表
    const groupSelect = document.getElementById('sessionGroup');
    groupSelect.innerHTML = '<option value="">默认分组</option>';
    this.sessionGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      groupSelect.appendChild(option);
    });

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
      group: document.getElementById('sessionGroup').value
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
        this.hideConnectDialog();
        this.showAlert('会话已更新');
        return;
      }
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
        this.showNotification('连接失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('连接错误: ' + error.message, 'error');
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
      this.showNotification('请填写主机地址和用户名', 'error');
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
        this.showNotification('会话已更新', 'success');
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
    this.showNotification('会话已保存', 'success');
  }

  createTerminal(sessionId, config) {
    // 加载保存的设置
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    
    const terminal = new window.Terminal({
      cursorBlink: settings.cursorBlink !== false,
      fontSize: settings.fontSize || 14,
      fontFamily: settings.fontFamily || 'Menlo, Monaco, "Courier New", monospace',
      cursorStyle: settings.cursorStyle || 'block',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4'
      }
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
    fitAddon.fit();

    // 监听终端输入
    terminal.onData((data) => {
      window.electronAPI.ssh.send(sessionId, data);
    });

    // 初始化终端大小
    window.electronAPI.ssh.resize(sessionId, terminal.cols, terminal.rows);

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
    tab.innerHTML = `
      <span class="tab-status connecting" title="连接中"></span>
      <span class="tab-name">${config.name || config.username + '@' + config.host}</span>
      <button class="tab-sftp-btn" data-session="${sessionId}" title="打开 SFTP">📁</button>
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
    // 隐藏所有终端
    document.querySelectorAll('.terminal-wrapper').forEach(el => {
      el.classList.remove('active');
    });

    // 取消所有标签的激活状态
    document.querySelectorAll('.tab').forEach(el => {
      el.classList.remove('active');
    });

    // 隐藏 SFTP 容器，显示终端容器
    document.getElementById('sftpContainer').style.display = 'none';
    document.getElementById('terminalContainer').style.display = 'block';

    // 激活选中的终端和标签
    const terminalWrapper = document.getElementById(`terminal-${sessionId}`);
    const tab = document.getElementById(`tab-${sessionId}`);
    
    if (terminalWrapper) terminalWrapper.classList.add('active');
    if (tab) tab.classList.add('active');

    this.activeSessionId = sessionId;

    // 更新状态栏
    this.updateStatusBar(sessionId);

    // 重新调整终端大小
    const terminalData = this.terminals.get(sessionId);
    if (terminalData) {
      setTimeout(() => {
        terminalData.fitAddon.fit();
      }, 0);
    }
  }

  updateStatusBar(sessionId) {
    const terminalData = this.terminals.get(sessionId);
    if (!terminalData) {
      // 没有活动会话
      document.getElementById('statusConnectionText').textContent = '未连接';
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
      document.getElementById('statusConnectionText').textContent = '已连接';
      document.querySelector('#statusConnection .status-icon').className = 'status-icon connected';
    } else if (statusSpan?.classList.contains('connecting')) {
      document.getElementById('statusConnectionText').textContent = '连接中';
      document.querySelector('#statusConnection .status-icon').className = 'status-icon connecting';
    } else {
      document.getElementById('statusConnectionText').textContent = '已断开';
      document.querySelector('#statusConnection .status-icon').className = 'status-icon disconnected';
    }

    // 更新会话信息
    const sessionInfo = `${config.username}@${config.host}:${config.port}`;
    document.getElementById('statusSessionText').textContent = sessionInfo;

    // 更新其他信息（可以后续扩展）
    document.getElementById('statusInfoText').textContent = '';
  }

  async closeSession(sessionId, skipStatusUpdate = false) {
    // 更新状态为断开（除非是自动关闭）
    if (!skipStatusUpdate) {
      this.updateTabStatus(sessionId, 'disconnected');
    }
    
    await window.electronAPI.ssh.disconnect(sessionId);
    
    const terminalData = this.terminals.get(sessionId);
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
    const terminalData = this.terminals.get(sessionId);
    
    if (terminalData) {
      terminalData.terminal.write(output);
    }
  }

  handleSSHClosed(data) {
    const { sessionId } = data;
    
    // 更新标签页状态为断开
    this.updateTabStatus(sessionId, 'disconnected');
    
    // 在终端显示断开消息
    const terminalData = this.terminals.get(sessionId);
    if (terminalData) {
      terminalData.terminal.write('\r\n\x1b[31m[连接已断开]\x1b[0m\r\n');
    }
    
    // 3秒后自动关闭标签页
    setTimeout(() => {
      this.closeSession(sessionId, true); // skipStatusUpdate = true
    }, 3000);
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

  renderSessionList() {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = '';

    // 按分组组织会话
    const groupedSessions = {};
    
    // 初始化所有分组（包括空分组）
    this.sessionGroups.forEach(group => {
      groupedSessions[group] = [];
    });
    
    // 添加默认分组
    groupedSessions['默认分组'] = [];
    
    // 分配会话到分组，并应用搜索过滤
    this.savedSessions.forEach(session => {
      // 搜索过滤
      if (this.searchQuery) {
        const searchText = `${session.name} ${session.host} ${session.username} ${session.group}`.toLowerCase();
        if (!searchText.includes(this.searchQuery)) {
          return;
        }
      }

      const group = session.group || '默认分组';
      if (!groupedSessions[group]) {
        groupedSessions[group] = [];
      }
      groupedSessions[group].push(session);
    });

    // 渲染每个分组
    Object.keys(groupedSessions).sort().forEach(groupName => {
      const sessions = groupedSessions[groupName];
      
      // 如果搜索时分组为空，跳过
      if (this.searchQuery && sessions.length === 0) {
        return;
      }

      const isCollapsed = this.collapsedGroups.has(groupName);
      
      const groupDiv = document.createElement('div');
      groupDiv.className = 'session-group';
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.innerHTML = `
        <div class="group-title">
          <span class="group-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
          <span class="group-name">${groupName}</span>
          <span class="group-count">(${sessions.length})</span>
        </div>
        <div class="group-actions">
          ${groupName !== '默认分组' ? '<button class="rename-group-btn">重命名</button>' : ''}
          ${groupName !== '默认分组' ? '<button class="delete-group-btn">删除</button>' : ''}
        </div>
      `;

      // 切换折叠状态
      groupHeader.addEventListener('click', (e) => {
        if (e.target.closest('.group-actions')) return;
        
        if (this.collapsedGroups.has(groupName)) {
          this.collapsedGroups.delete(groupName);
        } else {
          this.collapsedGroups.add(groupName);
        }
        this.renderSessionList();
      });

      // 重命名分组
      const renameBtn = groupHeader.querySelector('.rename-group-btn');
      if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.renameGroup(groupName);
        });
      }

      // 删除分组
      const deleteBtn = groupHeader.querySelector('.delete-group-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteGroup(groupName);
        });
      }

      groupDiv.appendChild(groupHeader);

      // 会话列表
      const sessionsDiv = document.createElement('div');
      sessionsDiv.className = `group-sessions ${isCollapsed ? 'collapsed' : ''}`;
      
      if (sessions.length === 0) {
        // 显示空状态
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-group';
        emptyDiv.textContent = '暂无会话';
        sessionsDiv.appendChild(emptyDiv);
      } else {
        sessions.forEach(session => {
          const item = document.createElement('div');
          item.className = 'session-item';
          
          // 高亮搜索结果
          if (this.searchQuery) {
            item.classList.add('highlight');
          }

          item.innerHTML = `
            <span>${session.name || session.username + '@' + session.host}</span>
          `;

          // 双击快速连接
          item.addEventListener('dblclick', () => {
            this.connectSavedSession(session);
          });

          // 右键菜单
          item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showSessionContextMenu(e, session);
          });

          sessionsDiv.appendChild(item);
        });
      }

      groupDiv.appendChild(sessionsDiv);
      sessionList.appendChild(groupDiv);
    });
  }

  createNewGroup() {
    this.showInputDialog('新建分组', '请输入分组名称:', '', (groupName) => {
      if (!groupName) return;
      
      if (this.sessionGroups.includes(groupName)) {
        this.showAlert('分组已存在');
        return;
      }

      this.sessionGroups.push(groupName);
      this.renderSessionList();
    });
  }

  async renameGroup(oldName) {
    this.showInputDialog('重命名分组', '请输入新的分组名称:', oldName, async (newName) => {
      if (!newName || newName === oldName) return;

      if (this.sessionGroups.includes(newName)) {
        this.showAlert('分组名称已存在');
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
    const sessions = this.savedSessions.filter(s => s.group === groupName);
    
    if (sessions.length > 0) {
      this.showConfirmDialog(
        '删除分组',
        `分组 "${groupName}" 中有 ${sessions.length} 个会话。\n\n点击"确定"将会话移至默认分组`,
        async () => {
          // 将会话移至默认分组
          this.savedSessions.forEach(session => {
            if (session.group === groupName) {
              session.group = '';
            }
          });

          // 删除分组
          const index = this.sessionGroups.indexOf(groupName);
          if (index > -1) {
            this.sessionGroups.splice(index, 1);
          }

          await window.electronAPI.session.save(this.savedSessions);
          this.renderSessionList();
        }
      );
    } else {
      // 直接删除空分组
      const index = this.sessionGroups.indexOf(groupName);
      if (index > -1) {
        this.sessionGroups.splice(index, 1);
      }
      this.renderSessionList();
    }
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
              '删除会话',
              `确定删除会话 "${session.name}" 吗？`,
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
        this.showAlert(`配置已导出到:\n${result.filePath}`);
      } else {
        this.showAlert('导出失败: ' + result.error);
      }
    } catch (error) {
      this.showAlert('导出错误: ' + error.message);
    }
  }

  // 导入配置
  async importConfig() {
    this.showConfirmDialog(
      '导入配置',
      '导入配置将会覆盖当前所有会话和分组，是否继续？',
      async () => {
        try {
          const result = await window.electronAPI.session.import();
          
          if (result.success) {
            // 重新加载会话
            await this.loadSessions();
            this.showNotification(`成功导入 ${result.count} 个会话`, 'success');
          } else if (result.error !== 'User canceled') {
            this.showNotification('导入失败: ' + result.error, 'error');
          }
        } catch (error) {
          this.showNotification('导入错误: ' + error.message, 'error');
        }
      }
    );
  }

  // 通知提示
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // SFTP 批量下载选中文件
  async sftpDownloadSelected() {
    if (this.selectedFiles.size === 0) {
      this.showNotification('请先选择要下载的文件', 'info');
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
      this.showNotification('正在连接...', 'info');
      
      const result = await window.electronAPI.ssh.connect(config);
      
      if (result.success) {
        this.createTerminal(result.sessionId, config);
        this.showNotification('连接成功', 'success');
      } else {
        this.showNotification('连接失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('连接错误: ' + error.message, 'error');
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
    const groupSelect = document.getElementById('sessionGroup');
    groupSelect.innerHTML = '<option value="">默认分组</option>';
    this.sessionGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      if (group === session.group) {
        option.selected = true;
      }
      groupSelect.appendChild(option);
    });

    // 隐藏"保存此会话配置"选项（编辑模式下自动保存）
    document.getElementById('saveSession').parentElement.style.display = 'none';
    document.getElementById('saveSession').checked = true;

    // 显示对话框，标记为编辑模式
    this.editingSessionId = session.id;
    document.querySelector('#connectDialog h3').textContent = '编辑 SSH 连接';
    document.getElementById('connectSubmitBtn').textContent = '保存';
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
    const groupSelect = document.getElementById('sessionGroup');
    groupSelect.innerHTML = '<option value="">默认分组</option>';
    this.sessionGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      if (group === session.group) {
        option.selected = true;
      }
      groupSelect.appendChild(option);
    });

    // 显示"保存此会话配置"选项（默认勾选）
    document.getElementById('saveSession').parentElement.style.display = 'block';
    document.getElementById('saveSession').checked = true;

    // 显示对话框，不设置 editingSessionId（这样会创建新会话）
    this.editingSessionId = null;
    document.querySelector('#connectDialog h3').textContent = '克隆 SSH 连接';
    document.getElementById('connectSubmitBtn').textContent = '连接';
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
      <span class="tab-status connected" title="已连接"></span>
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
      downloadBtn.textContent = count > 0 ? `下载选中 (${count})` : '下载选中';
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
      menuItems.push({ label: '下载', action: () => this.sftpDownload(sftpSessionId, file.name) });
    } else {
      menuItems.push({ label: '打开', action: () => {
        const newPath = this.currentSftpPath[sftpSessionId] === '/' 
          ? `/${file.name}` 
          : `${this.currentSftpPath[sftpSessionId]}/${file.name}`;
        this.sftpList(sftpSessionId, newPath);
      }});
    }

    menuItems.push({ label: '重命名', action: () => this.sftpRename(sftpSessionId, file.name) });
    menuItems.push({ divider: true });
    menuItems.push({ label: '删除', action: () => this.sftpDelete(sftpSessionId, file.name) });

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
      this.showNotification('下载完成', 'success');
    } else if (result.cancelled) {
      // 用户取消，不显示错误
    } else if (result.error !== 'User canceled') {
      this.showNotification('下载失败: ' + result.error, 'error');
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
      this.showNotification('上传完成', 'success');
      this.sftpRefresh();
    } else if (result.cancelled) {
      // 用户取消，不显示错误
    } else if (result.error !== 'User canceled') {
      this.showNotification('上传失败: ' + result.error, 'error');
    }
  }

  async sftpMkdir() {
    if (!this.activeSessionId || !this.activeSessionId.startsWith('sftp-')) return;

    const session = this.sftpSessions.get(this.activeSessionId);
    if (!session) return;

    this.showInputDialog('新建文件夹', '请输入文件夹名称:', '', async (dirName) => {
      if (!dirName) return;

      const remotePath = this.currentSftpPath[this.activeSessionId] === '/' 
        ? `/${dirName}` 
        : `${this.currentSftpPath[this.activeSessionId]}/${dirName}`;

      const result = await window.electronAPI.sftp.mkdir(session.sessionId, remotePath);
      
      if (result.success) {
        this.sftpRefresh();
      } else {
        this.showAlert('创建文件夹失败: ' + result.error);
      }
    });
  }

  async sftpDelete(sftpSessionId, fileName) {
    this.showConfirmDialog(
      '删除确认',
      `确定删除 "${fileName}" 吗？`,
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
          this.showAlert('删除失败: ' + result.error);
        }
      }
    );
  }

  async sftpRename(sftpSessionId, oldName) {
    this.showInputDialog('重命名', '请输入新名称:', oldName, async (newName) => {
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
        this.showAlert('重命名失败: ' + result.error);
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
        name: '深色模式',
        bgColor: '#1e1e1e',
        sidebarBg: '#252526',
        primaryColor: '#0e639c',
        textColor: '#d4d4d4',
        borderColor: '#3e3e42',
        hoverBg: '#3e3e42'
      },
      light: {
        name: '浅色模式',
        bgColor: '#ffffff',
        sidebarBg: '#f3f3f3',
        primaryColor: '#0078d4',
        textColor: '#333333',
        borderColor: '#e0e0e0',
        hoverBg: '#e8e8e8'
      },
      dracula: {
        name: 'Dracula',
        bgColor: '#282a36',
        sidebarBg: '#21222c',
        primaryColor: '#bd93f9',
        textColor: '#f8f8f2',
        borderColor: '#44475a',
        hoverBg: '#44475a'
      },
      monokai: {
        name: 'Monokai',
        bgColor: '#272822',
        sidebarBg: '#1e1f1c',
        primaryColor: '#66d9ef',
        textColor: '#f8f8f2',
        borderColor: '#3e3d32',
        hoverBg: '#3e3d32'
      },
      'solarized-dark': {
        name: 'Solarized Dark',
        bgColor: '#002b36',
        sidebarBg: '#073642',
        primaryColor: '#268bd2',
        textColor: '#839496',
        borderColor: '#586e75',
        hoverBg: '#073642'
      },
      nord: {
        name: 'Nord',
        bgColor: '#2e3440',
        sidebarBg: '#3b4252',
        primaryColor: '#88c0d0',
        textColor: '#eceff4',
        borderColor: '#4c566a',
        hoverBg: '#434c5e'
      },
      'one-dark': {
        name: 'One Dark',
        bgColor: '#282c34',
        sidebarBg: '#21252b',
        primaryColor: '#61afef',
        textColor: '#abb2bf',
        borderColor: '#3e4451',
        hoverBg: '#2c313a'
      },
      'github-dark': {
        name: 'GitHub Dark',
        bgColor: '#0d1117',
        sidebarBg: '#161b22',
        primaryColor: '#58a6ff',
        textColor: '#c9d1d9',
        borderColor: '#30363d',
        hoverBg: '#21262d'
      },
      'tokyo-night': {
        name: 'Tokyo Night',
        bgColor: '#1a1b26',
        sidebarBg: '#16161e',
        primaryColor: '#7aa2f7',
        textColor: '#a9b1d6',
        borderColor: '#292e42',
        hoverBg: '#24283b'
      },
      gruvbox: {
        name: 'Gruvbox Dark',
        bgColor: '#282828',
        sidebarBg: '#1d2021',
        primaryColor: '#83a598',
        textColor: '#ebdbb2',
        borderColor: '#504945',
        hoverBg: '#3c3836'
      },
      material: {
        name: 'Material',
        bgColor: '#263238',
        sidebarBg: '#1e272c',
        primaryColor: '#80cbc4',
        textColor: '#eeffff',
        borderColor: '#37474f',
        hoverBg: '#314549'
      }
    };
  }

  showSettingsDialog() {
    this.loadSettings();
    this.loadWebDAVConfig(); // 加载 WebDAV 配置
    document.getElementById('settingsDialog').style.display = 'flex';
    
    // 只在第一次打开时初始化事件监听器
    if (!this.settingsDialogInitialized) {
      this.initializeSettingsDialog();
      this.settingsDialogInitialized = true;
    }
    
    // 初始预览
    this.updateThemePreview(document.getElementById('themeMode').value);
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

    // 测试连接按钮
    document.getElementById('testWebdavBtn').addEventListener('click', async () => {
      await this.testWebDAVConnection();
    });

    // 立即同步按钮
    document.getElementById('syncNowBtn').addEventListener('click', async () => {
      await this.syncNow();
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
    document.getElementById('fontSize').value = settings.fontSize || 14;
    document.getElementById('fontFamily').value = settings.fontFamily || "'Courier New', monospace";
    document.getElementById('cursorStyle').value = settings.cursorStyle || 'block';
    document.getElementById('cursorBlink').checked = settings.cursorBlink !== false;
  }

  saveSettings() {
    const themeMode = document.getElementById('themeMode').value;
    
    const settings = {
      themeMode,
      fontSize: parseInt(document.getElementById('fontSize').value),
      fontFamily: document.getElementById('fontFamily').value,
      cursorStyle: document.getElementById('cursorStyle').value,
      cursorBlink: document.getElementById('cursorBlink').checked
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
    
    this.showNotification('设置已保存', 'success');
  }

  async saveWebDAVConfig() {
    const url = document.getElementById('webdavUrl').value.trim();
    const username = document.getElementById('webdavUsername').value.trim();
    const password = document.getElementById('webdavPassword').value;
    const remotePath = document.getElementById('webdavRemotePath').value.trim() || 'anotherssh-config.json';
    const autoSync = document.getElementById('autoSyncEnabled').checked;
    const syncInterval = parseInt(document.getElementById('autoSyncInterval').value);

    if (url && username && password) {
      const config = {
        url,
        username,
        password,
        remotePath,
        autoSync,
        syncInterval
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
    }

    // 应用终端设置到所有现有终端
    this.terminals.forEach((terminalData) => {
      const terminal = terminalData.terminal;
      
      // 更新字体设置
      if (settings.fontSize) {
        terminal.options.fontSize = settings.fontSize;
      }
      if (settings.fontFamily) {
        terminal.options.fontFamily = settings.fontFamily;
      }
      if (settings.cursorStyle) {
        terminal.options.cursorStyle = settings.cursorStyle;
      }
      terminal.options.cursorBlink = settings.cursorBlink !== false;
      
      terminalData.fitAddon.fit();
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
      connecting: '连接中',
      connected: '已连接',
      disconnected: '已断开'
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
        document.getElementById('autoSyncIntervalGroup').style.display = 
          result.config.autoSync ? 'block' : 'none';

        // 初始化客户端
        if (result.config.url && result.config.username && result.config.password) {
          await window.electronAPI.webdav.initClient(result.config);
        }
      } else {
        // 设置默认值
        document.getElementById('webdavRemotePath').value = 'anotherssh-config.json';
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
          lastSyncTime.textContent = '从未';
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
      this.showNotification('请填写完整的 WebDAV 配置', 'error');
      return;
    }

    const testBtn = document.getElementById('testWebdavBtn');
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';

    try {
      const result = await window.electronAPI.webdav.testConnection({
        url,
        username,
        password
      });

      if (result.success) {
        this.showNotification('✅ 连接成功！', 'success');
        
        // 保存配置并初始化客户端
        const config = {
          url,
          username,
          password,
          remotePath,
          autoSync: document.getElementById('autoSyncEnabled').checked,
          syncInterval: parseInt(document.getElementById('autoSyncInterval').value)
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
      testBtn.textContent = '测试连接';
    }
  }

  async syncNow() {
    const syncBtn = document.getElementById('syncNowBtn');
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';

    try {
      // 确保使用最新的配置重新初始化客户端
      const url = document.getElementById('webdavUrl').value.trim();
      const username = document.getElementById('webdavUsername').value.trim();
      const password = document.getElementById('webdavPassword').value;
      const remotePath = document.getElementById('webdavRemotePath').value.trim() || 'anotherssh-config.json';
      
      if (!url || !username || !password) {
        this.showNotification('请先配置 WebDAV 连接', 'error');
        syncBtn.disabled = false;
        syncBtn.textContent = '立即同步';
        return;
      }

      const config = {
        url,
        username,
        password,
        remotePath,
        autoSync: document.getElementById('autoSyncEnabled').checked,
        syncInterval: parseInt(document.getElementById('autoSyncInterval').value)
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
        this.showNotification('❌ 无法读取会话数据', 'error');
        syncBtn.disabled = false;
        syncBtn.textContent = '立即同步';
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
          if (result.action === 'uploaded') {
            this.showNotification('✅ 配置已上传到云端', 'success');
          } else if (result.action === 'merged') {
            // 合并后的数据是加密的，直接保存加密数据
            await window.electronAPI.session.saveEncrypted(result.sessions);
            
            // 重新加载解密后的数据
            const loadResult = await window.electronAPI.session.load();
            if (loadResult.success) {
              this.savedSessions = loadResult.sessions;
              this.renderSessionList();
            }
            
            const msg = `✅ 同步完成！新增: ${result.changes.added}, 更新: ${result.changes.updated}`;
            this.showNotification(msg, 'success');
          }
          
          await this.updateSyncStatus();
        } else {
          this.showNotification(`❌ 同步失败: ${result.error}`, 'error');
        }
      } else {
        // 远程文件不存在，直接上传
        const uploadResult = await window.electronAPI.webdav.upload(sessions);
        
        if (uploadResult.success) {
          this.showNotification('✅ 配置已上传到云端', 'success');
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
      syncBtn.textContent = '立即同步';
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

  // 检查更新
  async checkForUpdates(manual = false) {
    try {
      // 如果不是手动检查，则检查上次检查时间，每天只检查一次
      if (!manual) {
        const lastCheck = localStorage.getItem('lastUpdateCheck');
        const now = Date.now();
        
        if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
          return;
        }
      }
      
      // 手动检查时显示检查中状态
      if (manual) {
        this.showNotification('正在检查更新...', 'info');
      }
      
      const updateInfo = await window.electronAPI.checkUpdates();
      
      if (updateInfo && updateInfo.hasUpdate) {
        this.showUpdateNotification(updateInfo);
        if (manual) {
          this.showNotification(`发现新版本 v${updateInfo.latestVersion}`, 'success');
        }
      } else if (manual) {
        // 手动检查时，如果没有更新则提示
        this.showNotification('当前已是最新版本', 'success');
      }
      
      localStorage.setItem('lastUpdateCheck', Date.now().toString());
    } catch (error) {
      console.error('Check updates failed:', error);
      if (manual) {
        this.showNotification('检查更新失败，请稍后重试', 'error');
      }
    }
  }

  // 显示更新提示
  showUpdateNotification(updateInfo) {
    const statusUpdate = document.getElementById('statusUpdate');
    const statusUpdateText = document.getElementById('statusUpdateText');
    
    statusUpdateText.textContent = `🎉 发现新版本 v${updateInfo.latestVersion}`;
    statusUpdate.style.display = 'inline-flex';
    
    // 点击打开下载页面
    statusUpdate.style.cursor = 'pointer';
    statusUpdate.onclick = () => {
      window.electronAPI.openExternal(updateInfo.downloadUrl);
    };
  }
}

// 初始化应用
const app = new SSHClient();

// 应用保存的设置
const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
if (Object.keys(savedSettings).length > 0) {
  app.applySettings(savedSettings);
}
