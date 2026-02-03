const pty = require('node-pty');
const os = require('os');
const fs = require('fs');

class LocalShellManager {
  constructor() {
    this.shells = new Map(); // sessionId -> pty instance
  }

  // 获取默认 Shell
  getDefaultShell() {
    if (os.platform() === 'win32') {
      return 'powershell.exe';
    }
    
    // macOS/Linux: 尝试多个可能的 shell
    const possibleShells = [
      process.env.SHELL,
      '/bin/zsh',
      '/bin/bash',
      '/bin/sh'
    ];
    
    for (const shell of possibleShells) {
      if (shell && fs.existsSync(shell)) {
        return shell;
      }
    }
    
    return '/bin/bash';
  }

  // 创建本地 Shell
  spawn(sessionId, options = {}) {
    try {
      const shell = this.getDefaultShell();
      const cwd = options.cwd || os.homedir();

      console.log(`[LocalShell] Creating shell: ${shell}, cwd: ${cwd}`);

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });

      this.shells.set(sessionId, {
        pty: ptyProcess,
        shell: shell,
        cwd: cwd
      });

      console.log(`[LocalShell] Created successfully: ${sessionId}`);

      return {
        success: true,
        sessionId,
        shell,
        cwd
      };
    } catch (error) {
      console.error('[LocalShell] Failed to spawn:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 写入数据
  write(sessionId, data) {
    const shell = this.shells.get(sessionId);
    if (shell && shell.pty) {
      shell.pty.write(data);
      return { success: true };
    }
    return { success: false, error: 'Shell not found' };
  }

  // 调整大小
  resize(sessionId, cols, rows) {
    const shell = this.shells.get(sessionId);
    if (shell && shell.pty) {
      shell.pty.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: 'Shell not found' };
  }

  // 关闭 Shell
  kill(sessionId) {
    const shell = this.shells.get(sessionId);
    if (shell && shell.pty) {
      shell.pty.kill();
      this.shells.delete(sessionId);
      console.log(`[LocalShell] Killed: ${sessionId}`);
      return { success: true };
    }
    return { success: false, error: 'Shell not found' };
  }

  // 设置数据监听器
  onData(sessionId, callback) {
    const shell = this.shells.get(sessionId);
    if (shell && shell.pty) {
      shell.pty.onData(callback);
      return { success: true };
    }
    return { success: false, error: 'Shell not found' };
  }

  // 设置退出监听器
  onExit(sessionId, callback) {
    const shell = this.shells.get(sessionId);
    if (shell && shell.pty) {
      shell.pty.onExit(callback);
      return { success: true };
    }
    return { success: false, error: 'Shell not found' };
  }
}

module.exports = LocalShellManager;
