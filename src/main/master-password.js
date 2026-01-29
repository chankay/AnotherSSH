const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

class MasterPassword {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.masterPasswordFile = path.join(this.userDataPath, '.master');
    this.saltFile = path.join(this.userDataPath, '.salt');
    this.promptedFile = path.join(this.userDataPath, '.prompted');
  }

  // 检查是否已设置主密码
  hasPassword() {
    return fs.existsSync(this.masterPasswordFile);
  }

  // 检查是否已提示过用户设置主密码
  hasPrompted() {
    return fs.existsSync(this.promptedFile);
  }

  // 标记已提示过用户
  setPrompted() {
    try {
      fs.writeFileSync(this.promptedFile, 'true', 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 清除提示标记
  clearPrompted() {
    try {
      if (fs.existsSync(this.promptedFile)) {
        fs.unlinkSync(this.promptedFile);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 生成密码哈希
  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  // 设置主密码
  setPassword(password) {
    try {
      // 生成随机盐
      const salt = crypto.randomBytes(32).toString('hex');
      
      // 生成密码哈希
      const hash = this.hashPassword(password, salt);
      
      // 保存盐和哈希
      fs.writeFileSync(this.saltFile, salt, 'utf8');
      fs.writeFileSync(this.masterPasswordFile, hash, 'utf8');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 验证主密码
  verifyPassword(password) {
    try {
      if (!this.hasPassword()) {
        return { success: false, error: 'No master password set' };
      }

      // 读取盐和哈希
      const salt = fs.readFileSync(this.saltFile, 'utf8');
      const storedHash = fs.readFileSync(this.masterPasswordFile, 'utf8');
      
      // 计算输入密码的哈希
      const hash = this.hashPassword(password, salt);
      
      // 比较哈希
      const isValid = hash === storedHash;
      
      return { success: true, valid: isValid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 修改主密码
  changePassword(oldPassword, newPassword) {
    try {
      // 先验证旧密码
      const verifyResult = this.verifyPassword(oldPassword);
      if (!verifyResult.success || !verifyResult.valid) {
        return { success: false, error: 'Invalid old password' };
      }

      // 设置新密码
      return this.setPassword(newPassword);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 重置主密码（删除主密码文件）
  resetPassword() {
    try {
      if (fs.existsSync(this.masterPasswordFile)) {
        fs.unlinkSync(this.masterPasswordFile);
      }
      if (fs.existsSync(this.saltFile)) {
        fs.unlinkSync(this.saltFile);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = MasterPassword;
