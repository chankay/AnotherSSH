const { Client } = require('ssh2');

class SSHManager {
  constructor() {
    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  connect(config, onData, onClose) {
    return new Promise((resolve, reject) => {
      const sessionId = `session_${++this.sessionCounter}`;
      const client = new Client();
      
      const session = {
        id: sessionId,
        client,
        stream: null,
        config
      };

      client.on('ready', () => {
        client.shell({ term: 'xterm-256color' }, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          session.stream = stream;
          this.sessions.set(sessionId, session);

          stream.on('data', (data) => {
            onData(data.toString());
          });

          stream.on('close', () => {
            this.disconnect(sessionId);
            if (onClose) {
              onClose(sessionId);
            }
          });

          stream.on('error', (err) => {
            console.error('Stream error:', err);
            this.disconnect(sessionId);
            if (onClose) {
              onClose(sessionId);
            }
          });

          stream.stderr.on('data', (data) => {
            onData(data.toString());
          });

          resolve(sessionId);
        });
      });

      client.on('error', (err) => {
        console.error('SSH client error:', err);
        reject(err);
        // 如果已经建立了会话，触发关闭回调
        if (this.sessions.has(sessionId)) {
          this.disconnect(sessionId);
          if (onClose) {
            onClose(sessionId);
          }
        }
      });

      client.on('close', () => {
        console.log('SSH client closed');
        if (this.sessions.has(sessionId)) {
          this.disconnect(sessionId);
          if (onClose) {
            onClose(sessionId);
          }
        }
      });

      client.on('end', () => {
        console.log('SSH client ended');
        if (this.sessions.has(sessionId)) {
          this.disconnect(sessionId);
          if (onClose) {
            onClose(sessionId);
          }
        }
      });

      // 连接配置
      const connectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
        // 添加 keepalive 配置，检测连接断开
        keepaliveInterval: 30000,  // 每 30 秒发送一次心跳
        keepaliveCountMax: 3,      // 3 次心跳失败后判定断开（90秒）
        readyTimeout: 20000        // 连接超时 20 秒
      };

      if (config.password) {
        connectConfig.password = config.password;
      } else if (config.privateKey) {
        connectConfig.privateKey = config.privateKey;
        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase;
        }
      }

      client.connect(connectConfig);
    });
  }

  send(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      throw new Error('Session not found or not connected');
    }

    return new Promise((resolve, reject) => {
      session.stream.write(data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      throw new Error('Session not found or not connected');
    }

    session.stream.setWindow(rows, cols);
    return Promise.resolve();
  }

  disconnect(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.stream) {
        session.stream.end();
      }
      if (session.client) {
        session.client.end();
      }
      this.sessions.delete(sessionId);
    }
    return Promise.resolve();
  }
}

module.exports = SSHManager;
