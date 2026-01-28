const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

class WebDAVSync {
  constructor() {
    this.client = null;
    this.config = null;
    this.syncInterval = null;
    this.userDataPath = app.getPath('userData');
    this.configFile = path.join(this.userDataPath, 'webdav-config.json');
    this.remoteFileName = 'anotherssh-config.json'; // 默认文件名
    this.lastSyncTime = null;
    this.isSyncing = false;
    this.webdavModule = null;
  }

  // 动态加载 webdav 模块
  async loadWebDAVModule() {
    if (!this.webdavModule) {
      this.webdavModule = await import('webdav');
    }
    return this.webdavModule;
  }

  // 加载 WebDAV 配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        this.config = JSON.parse(data);
        return { success: true, config: this.config };
      }
      return { success: true, config: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 保存 WebDAV 配置
  saveConfig(config) {
    try {
      this.config = config;
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 初始化 WebDAV 客户端
  async initClient(config) {
    try {
      const { createClient } = await this.loadWebDAVModule();
      this.client = createClient(config.url, {
        username: config.username,
        password: config.password
      });
      this.config = config;
      
      // 设置远程文件路径
      if (config.remotePath) {
        this.remoteFileName = config.remotePath;
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 测试连接
  async testConnection(config) {
    try {
      const { createClient } = await this.loadWebDAVModule();
      const testClient = createClient(config.url, {
        username: config.username,
        password: config.password
      });
      
      // 尝试列出根目录
      await testClient.getDirectoryContents('/');
      return { success: true };
    } catch (error) {
      console.error('WebDAV test connection error:', error);
      return { success: false, error: error.message };
    }
  }

  // 确保远程目录存在
  async ensureRemoteDir() {
    if (!this.client) {
      return { success: false, error: 'WebDAV client not initialized' };
    }

    try {
      // 从文件路径中提取目录路径
      const dirPath = this.remoteFileName.includes('/') 
        ? this.remoteFileName.substring(0, this.remoteFileName.lastIndexOf('/'))
        : null;
      
      if (!dirPath) {
        // 文件在根目录，不需要创建目录
        return { success: true };
      }
      
      // 检查目录是否存在
      try {
        const exists = await this.client.exists(dirPath);
        
        if (!exists) {
          await this.client.createDirectory(dirPath, { recursive: true });
        }
      } catch (checkError) {
        console.warn('Directory check/create error:', checkError.message);
        // 忽略错误，继续尝试上传
      }
      
      return { success: true };
    } catch (error) {
      console.error('Ensure directory error:', error);
      // 忽略目录创建错误，继续尝试上传
      return { success: true };
    }
  }

  // 上传会话数据到 WebDAV
  async uploadSessions(sessionsData) {
    if (!this.client) {
      return { success: false, error: 'WebDAV client not initialized' };
    }

    try {
      // 先确保目录存在
      const dirResult = await this.ensureRemoteDir();
      if (!dirResult.success) {
        console.warn('Directory check failed, but continuing:', dirResult.error);
      }

      const data = JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString(),
        sessions: sessionsData
      }, null, 2);

      console.log('Uploading to:', this.remoteFileName);
      console.log('Data size:', data.length, 'bytes');

      // 尝试多种方式上传
      try {
        // 方式1: 使用 Buffer
        await this.client.putFileContents(this.remoteFileName, Buffer.from(data, 'utf-8'), {
          overwrite: true
        });
      } catch (e1) {
        console.error('Upload failed with Buffer:', e1.message);
        
        // 方式2: 使用字符串
        try {
          await this.client.putFileContents(this.remoteFileName, data, {
            overwrite: true
          });
        } catch (e2) {
          console.error('Upload failed with String:', e2.message);
          throw e2; // 抛出最后一个错误
        }
      }

      this.lastSyncTime = new Date();
      return { success: true, timestamp: this.lastSyncTime };
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error details:', {
        status: error.status,
        message: error.message,
        url: error.response?.url
      });
      return { success: false, error: error.message };
    }
  }

  // 从 WebDAV 下载会话数据
  async downloadSessions() {
    if (!this.client) {
      return { success: false, error: 'WebDAV client not initialized' };
    }

    try {
      // 直接尝试获取文件内容，如果不存在会抛出 404
      const content = await this.client.getFileContents(this.remoteFileName, { format: 'text' });
      const data = JSON.parse(content);

      this.lastSyncTime = new Date();
      return { 
        success: true, 
        sessions: data.sessions || [],
        timestamp: data.timestamp 
      };
    } catch (error) {
      console.error('Download error:', error);
      // 如果是 404 错误，说明文件不存在，返回空数组
      if (error.response && error.response.status === 404) {
        return { success: true, sessions: [], message: 'No remote data found' };
      }
      if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
        return { success: true, sessions: [], message: 'No remote data found' };
      }
      return { success: false, error: error.message };
    }
  }

  // 获取远程文件信息
  async getRemoteInfo() {
    if (!this.client) {
      return { success: false, error: 'WebDAV client not initialized' };
    }

    try {
      const stat = await this.client.stat(this.remoteFileName);
      return {
        success: true,
        exists: true,
        lastModified: stat.lastmod,
        size: stat.size
      };
    } catch (error) {
      // 如果是 404 错误，说明文件不存在
      if (error.response && error.response.status === 404) {
        return { success: true, exists: false };
      }
      if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
        return { success: true, exists: false };
      }
      // 如果是 409 冲突，也当作文件不存在处理
      if (error.status === 409 || error.message.includes('409') || error.message.includes('Conflict')) {
        return { success: true, exists: false };
      }
      return { success: false, error: error.message };
    }
  }

  // 智能同步：比较本地和远程，选择最新的
  async smartSync(localSessions) {
    if (!this.client) {
      return { success: false, error: 'WebDAV client not initialized' };
    }

    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;

    try {
      const remoteInfo = await this.getRemoteInfo();
      console.log('Remote info:', remoteInfo);
      
      if (!remoteInfo.success) {
        this.isSyncing = false;
        return remoteInfo;
      }

      // 如果远程不存在，直接上传
      if (!remoteInfo.exists) {
        const result = await this.uploadSessions(localSessions);
        this.isSyncing = false;
        return { ...result, action: 'uploaded' };
      }

      // 下载远程数据
      const downloadResult = await this.downloadSessions();
      
      if (!downloadResult.success) {
        this.isSyncing = false;
        return downloadResult;
      }

      const remoteSessions = downloadResult.sessions || [];
      
      // 如果远程没有数据，直接上传本地数据
      if (remoteSessions.length === 0) {
        const result = await this.uploadSessions(localSessions);
        this.isSyncing = false;
        return { ...result, action: 'uploaded' };
      }

      const remoteTime = new Date(downloadResult.timestamp);
      
      // 合并会话：使用 ID 作为唯一标识
      const merged = this.mergeSessions(localSessions, remoteSessions, remoteTime);
      
      // 上传合并后的数据
      await this.uploadSessions(merged.sessions);
      
      this.isSyncing = false;
      return {
        success: true,
        action: 'merged',
        sessions: merged.sessions,
        changes: merged.changes
      };
    } catch (error) {
      console.error('Smart sync error:', error);
      this.isSyncing = false;
      return { success: false, error: error.message };
    }
  }

  // 合并本地和远程会话
  mergeSessions(localSessions, remoteSessions, remoteTime) {
    const sessionMap = new Map();
    const changes = {
      added: 0,
      updated: 0,
      unchanged: 0
    };

    // 先添加本地会话
    localSessions.forEach(session => {
      sessionMap.set(session.id, { ...session, source: 'local' });
    });

    // 合并远程会话
    remoteSessions.forEach(remoteSession => {
      const localSession = sessionMap.get(remoteSession.id);
      
      if (!localSession) {
        // 远程有，本地没有 -> 添加
        sessionMap.set(remoteSession.id, { ...remoteSession, source: 'remote' });
        changes.added++;
      } else {
        // 两边都有 -> 比较更新时间（如果有的话）
        // 这里简单处理：保留本地的，因为用户可能正在编辑
        // 实际应用中可以添加更复杂的冲突解决策略
        changes.unchanged++;
      }
    });

    return {
      sessions: Array.from(sessionMap.values()),
      changes
    };
  }

  // 启动自动同步
  startAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      // 这里需要从外部传入当前会话数据
      // 实际使用时会通过回调函数获取
    }, intervalMinutes * 60 * 1000);

    return { success: true };
  }

  // 停止自动同步
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    return { success: true };
  }

  // 获取同步状态
  getStatus() {
    return {
      success: true,
      configured: !!this.config,
      connected: !!this.client,
      lastSyncTime: this.lastSyncTime,
      autoSyncEnabled: !!this.syncInterval,
      isSyncing: this.isSyncing
    };
  }
}

module.exports = WebDAVSync;
