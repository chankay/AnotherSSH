const { Client } = require('ssh2');

class SSHManager {
  constructor() {
    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  connect(config, onData) {
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
            onData(data.toString('utf-8'));
          });

          stream.on('close', () => {
            this.disconnect(sessionId);
          });

          stream.stderr.on('data', (data) => {
            onData(data.toString('utf-8'));
          });

          resolve(sessionId);
        });
      });

      client.on('error', (err) => {
        reject(err);
      });

      // 连接配置
      const connectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username
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
