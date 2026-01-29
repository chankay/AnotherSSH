const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LogManager {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.sessions = new Map(); // sessionId -> log file path
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // 开始记录会话日志
  startSession(sessionId, sessionName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${sessionName}_${timestamp}.log`;
    const logPath = path.join(this.logDir, fileName);
    
    this.sessions.set(sessionId, {
      path: logPath,
      name: sessionName,
      startTime: new Date(),
      stream: fs.createWriteStream(logPath, { flags: 'a' })
    });

    this.writeLog(sessionId, `=== Session Started: ${sessionName} ===\n`);
    this.writeLog(sessionId, `Time: ${new Date().toLocaleString()}\n\n`);
  }

  // 写入日志
  writeLog(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session && session.stream) {
      try {
        // 清理 ANSI 控制字符
        const cleanData = this.stripAnsiCodes(data);
        session.stream.write(cleanData);
      } catch (error) {
        console.error('Failed to write log:', error);
      }
    }
  }

  // 移除 ANSI 控制字符
  stripAnsiCodes(str) {
    // 移除 ANSI escape codes
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
              .replace(/\x1b\][0-9];[^\x07]*\x07/g, '')
              .replace(/\x1b\][0-9];[^\x1b]*\x1b\\/g, '')
              .replace(/\x1b[=>]/g, '')
              .replace(/\x1b\[[?]?[0-9;]*[hlABCDEFGHJKSTfmsu]/g, '');
  }

  // 结束会话日志
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.writeLog(sessionId, `\n=== Session Ended ===\n`);
      this.writeLog(sessionId, `Time: ${new Date().toLocaleString()}\n`);
      this.writeLog(sessionId, `Duration: ${this.getDuration(session.startTime)}\n`);
      
      if (session.stream) {
        session.stream.end();
      }
      this.sessions.delete(sessionId);
    }
  }

  // 获取持续时间
  getDuration(startTime) {
    const duration = Date.now() - startTime.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // 获取所有日志文件
  getAllLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      return files
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified - a.modified);
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  // 读取日志内容
  readLog(logPath) {
    try {
      return fs.readFileSync(logPath, 'utf-8');
    } catch (error) {
      console.error('Failed to read log:', error);
      return null;
    }
  }

  // 删除日志文件
  deleteLog(logPath) {
    try {
      fs.unlinkSync(logPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete log:', error);
      return { success: false, error: error.message };
    }
  }

  // 清除所有日志
  clearAllLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      files.forEach(file => {
        if (file.endsWith('.log')) {
          fs.unlinkSync(path.join(this.logDir, file));
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return { success: false, error: error.message };
    }
  }

  // 导出日志
  exportLog(logPath, exportPath) {
    try {
      fs.copyFileSync(logPath, exportPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to export log:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取日志目录路径
  getLogDir() {
    return this.logDir;
  }
}

module.exports = LogManager;
