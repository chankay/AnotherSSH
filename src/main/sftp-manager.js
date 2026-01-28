const Client = require('ssh2-sftp-client');

class SFTPManager {
  constructor() {
    this.clients = new Map();
    this.activeTransfers = new Map(); // 存储活动的传输任务
  }

  async connect(sessionId, config) {
    try {
      const sftp = new Client();
      
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

      await sftp.connect(connectConfig);
      this.clients.set(sessionId, sftp);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async list(sessionId, remotePath) {
    try {
      const sftp = this.clients.get(sessionId);
      if (!sftp) {
        throw new Error('SFTP client not found');
      }

      const list = await sftp.list(remotePath);
      return { 
        success: true, 
        files: list.map(item => ({
          name: item.name,
          type: item.type,
          size: item.size,
          modifyTime: item.modifyTime,
          accessTime: item.accessTime,
          rights: item.rights,
          owner: item.owner,
          group: item.group
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async download(sessionId, remotePath, localPath, onProgress) {
    const transferId = `${sessionId}-${Date.now()}`;
    
    try {
      const sftp = this.clients.get(sessionId);
      if (!sftp) {
        throw new Error('SFTP client not found');
      }

      let cancelled = false;

      // 存储传输任务
      this.activeTransfers.set(transferId, {
        type: 'download',
        cancel: () => { cancelled = true; }
      });

      // 使用 Promise 包装以便可以中断
      const downloadPromise = new Promise((resolve, reject) => {
        const stream = sftp.createReadStream(remotePath);
        const fs = require('fs');
        const writeStream = fs.createWriteStream(localPath);
        
        let transferred = 0;
        let total = 0;
        let streamDestroyed = false;

        // 获取文件大小
        sftp.stat(remotePath).then(stats => {
          total = stats.size;
        }).catch(() => {
          total = 0;
        });

        const cleanup = () => {
          if (!streamDestroyed) {
            streamDestroyed = true;
            
            // 立即停止读取
            stream.unpipe(writeStream);
            stream.pause();
            stream.destroy();
            writeStream.end();
            writeStream.destroy();
            
            // 删除未完成的文件
            try {
              fs.unlinkSync(localPath);
            } catch (e) {
              // 忽略删除错误
            }
          }
        };

        // 定期检查取消标志
        const checkInterval = setInterval(() => {
          if (cancelled) {
            clearInterval(checkInterval);
            cleanup();
            reject(new Error('cancelled'));
          }
        }, 100);

        stream.on('data', (chunk) => {
          if (cancelled) {
            clearInterval(checkInterval);
            cleanup();
            reject(new Error('cancelled'));
            return;
          }

          transferred += chunk.length;
          if (onProgress && total > 0) {
            onProgress({ 
              transferred, 
              total, 
              percent: (transferred / total * 100).toFixed(2), 
              transferId 
            });
          }
        });

        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          clearInterval(checkInterval);
          if (!cancelled) {
            resolve();
          }
        });

        stream.on('error', (err) => {
          clearInterval(checkInterval);
          cleanup();
          if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            reject(err);
          }
        });

        writeStream.on('error', (err) => {
          clearInterval(checkInterval);
          cleanup();
          if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            reject(err);
          }
        });

        // 监听取消事件
        stream.on('close', () => {
          clearInterval(checkInterval);
        });
      });

      await downloadPromise;
      this.activeTransfers.delete(transferId);
      return { success: true, transferId };
    } catch (error) {
      this.activeTransfers.delete(transferId);
      if (error.message === 'cancelled') {
        return { success: false, error: 'Transfer cancelled', cancelled: true, transferId };
      }
      return { success: false, error: error.message, transferId };
    }
  }

  async upload(sessionId, localPath, remotePath, onProgress) {
    const transferId = `${sessionId}-${Date.now()}`;
    
    try {
      const sftp = this.clients.get(sessionId);
      if (!sftp) {
        throw new Error('SFTP client not found');
      }

      let cancelled = false;

      // 存储传输任务
      this.activeTransfers.set(transferId, {
        type: 'upload',
        cancel: () => { cancelled = true; }
      });

      // 使用 Promise 包装以便可以中断
      const uploadPromise = new Promise((resolve, reject) => {
        const fs = require('fs');
        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);
        
        let transferred = 0;
        let total = 0;
        let streamDestroyed = false;

        // 获取文件大小
        try {
          const stats = fs.statSync(localPath);
          total = stats.size;
        } catch (err) {
          total = 0;
        }

        const cleanup = async () => {
          if (!streamDestroyed) {
            streamDestroyed = true;
            
            // 立即停止读取
            readStream.unpipe(writeStream);
            readStream.pause();
            readStream.destroy();
            writeStream.end();
            writeStream.destroy();
            
            // 尝试删除远程未完成的文件
            try {
              await sftp.delete(remotePath);
            } catch (e) {
              // 忽略删除错误
            }
          }
        };

        // 定期检查取消标志
        const checkInterval = setInterval(() => {
          if (cancelled) {
            clearInterval(checkInterval);
            cleanup().then(() => {
              reject(new Error('cancelled'));
            });
          }
        }, 100);

        readStream.on('data', (chunk) => {
          if (cancelled) {
            clearInterval(checkInterval);
            cleanup().then(() => {
              reject(new Error('cancelled'));
            });
            return;
          }

          transferred += chunk.length;
          if (onProgress && total > 0) {
            onProgress({ 
              transferred, 
              total, 
              percent: (transferred / total * 100).toFixed(2), 
              transferId 
            });
          }
        });

        readStream.pipe(writeStream);

        let resolved = false;
        const resolveOnce = () => {
          if (!resolved && !cancelled) {
            resolved = true;
            clearInterval(checkInterval);
            resolve();
          }
        };

        writeStream.on('finish', () => {
          resolveOnce();
        });

        writeStream.on('close', () => {
          resolveOnce();
        });

        readStream.on('error', (err) => {
          console.error('Upload readStream error:', err);
          clearInterval(checkInterval);
          cleanup().then(() => {
            if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
              reject(err);
            }
          });
        });

        writeStream.on('error', (err) => {
          console.error('Upload writeStream error:', err);
          clearInterval(checkInterval);
          cleanup().then(() => {
            if (err.message !== 'Premature close' && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
              reject(err);
            }
          });
        });

        // 监听取消事件
        readStream.on('close', () => {
          clearInterval(checkInterval);
        });
      });

      await uploadPromise;
      this.activeTransfers.delete(transferId);
      return { success: true, transferId };
    } catch (error) {
      console.error('Upload error:', error);
      this.activeTransfers.delete(transferId);
      if (error.message === 'cancelled') {
        return { success: false, error: 'Transfer cancelled', cancelled: true, transferId };
      }
      return { success: false, error: error.message, transferId };
    }
  }

  cancelTransfer(transferId) {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.cancel();
      this.activeTransfers.delete(transferId);
      return { success: true };
    }
    return { success: false, error: 'Transfer not found' };
  }

  async mkdir(sessionId, remotePath) {
    try {
      const sftp = this.clients.get(sessionId);
      if (!sftp) {
        throw new Error('SFTP client not found');
      }

      await sftp.mkdir(remotePath, true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async delete(sessionId, remotePath) {
    try {
      const sftp = this.clients.get(sessionId);
      if (!sftp) {
        throw new Error('SFTP client not found');
      }

      const stat = await sftp.stat(remotePath);
      if (stat.isDirectory) {
        await sftp.rmdir(remotePath, true);
      } else {
        await sftp.delete(remotePath);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async rename(sessionId, oldPath, newPath) {
    try {
      const sftp = this.clients.get(sessionId);
      if (!sftp) {
        throw new Error('SFTP client not found');
      }

      await sftp.rename(oldPath, newPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async disconnect(sessionId) {
    try {
      const sftp = this.clients.get(sessionId);
      if (sftp) {
        await sftp.end();
        this.clients.delete(sessionId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = SFTPManager;
