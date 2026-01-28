const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

class SessionStore {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.sessionsFile = path.join(this.userDataPath, 'sessions.json');
    this.encryptionKey = this.getOrCreateKey();
  }

  getOrCreateKey() {
    const keyFile = path.join(this.userDataPath, '.key');
    
    if (fs.existsSync(keyFile)) {
      return fs.readFileSync(keyFile, 'utf8');
    }
    
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyFile, key, 'utf8');
    return key;
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  saveSessions(sessions) {
    try {
      // 加密敏感信息
      const encryptedSessions = sessions.map(session => {
        const encrypted = { ...session };
        
        // 检查密码是否已经加密（加密后的格式是32位hex:加密数据）
        if (session.password) {
          const isEncrypted = /^[0-9a-f]{32}:[0-9a-f]+$/.test(session.password);
          if (!isEncrypted) {
            encrypted.password = this.encrypt(session.password);
          }
        }
        
        // 检查私钥是否已经加密
        if (session.privateKey) {
          const isEncrypted = /^[0-9a-f]{32}:[0-9a-f]+$/.test(session.privateKey);
          if (!isEncrypted) {
            encrypted.privateKey = this.encrypt(session.privateKey);
          }
        }
        
        return encrypted;
      });

      fs.writeFileSync(this.sessionsFile, JSON.stringify(encryptedSessions, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  loadSessions() {
    try {
      if (!fs.existsSync(this.sessionsFile)) {
        return { success: true, sessions: [] };
      }

      const data = fs.readFileSync(this.sessionsFile, 'utf8');
      const sessions = JSON.parse(data);

      // 解密敏感信息
      const decryptedSessions = sessions.map(session => {
        const decrypted = { ...session };
        if (session.password) {
          try {
            decrypted.password = this.decrypt(session.password);
          } catch (e) {
            decrypted.password = '';
          }
        }
        if (session.privateKey) {
          try {
            decrypted.privateKey = this.decrypt(session.privateKey);
          } catch (e) {
            decrypted.privateKey = '';
          }
        }
        return decrypted;
      });

      return { success: true, sessions: decryptedSessions };
    } catch (error) {
      return { success: false, error: error.message, sessions: [] };
    }
  }

  deleteSession(sessionId) {
    try {
      const result = this.loadSessions();
      if (!result.success) return result;

      const sessions = result.sessions.filter(s => s.id !== sessionId);
      return this.saveSessions(sessions);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  exportSessions(filePath) {
    try {
      // 直接读取加密的原始数据
      if (!fs.existsSync(this.sessionsFile)) {
        return { success: false, error: 'No sessions to export' };
      }

      const data = fs.readFileSync(this.sessionsFile, 'utf8');
      const encryptedSessions = JSON.parse(data);

      // 导出时保持加密状态
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        encrypted: true,
        sessions: encryptedSessions
      };

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  importSessions(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(data);

      // 验证数据格式
      if (!importData.sessions || !Array.isArray(importData.sessions)) {
        return { success: false, error: 'Invalid file format' };
      }

      // 检查是否是加密的数据
      if (!importData.encrypted) {
        return { success: false, error: 'Unsupported format: sessions must be encrypted' };
      }

      // 直接保存加密的数据（不经过加密流程）
      fs.writeFileSync(this.sessionsFile, JSON.stringify(importData.sessions, null, 2), 'utf8');
      
      return { success: true, count: importData.sessions.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = SessionStore;
