// 国际化语言配置

const translations = {
  'zh-CN': {
    // 通用
    'common.ok': '确定',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.close': '关闭',
    'common.search': '搜索',
    'common.refresh': '刷新',
    'common.connect': '连接',
    'common.disconnect': '断开',
    'common.copy': '复制',
    'common.paste': '粘贴',
    'common.selectAll': '全选',
    'common.clear': '清屏',
    
    // 侧边栏
    'sidebar.newSession': '新建连接',
    'sidebar.newGroup': '新建分组',
    'sidebar.export': '导出配置',
    'sidebar.import': '导入配置',
    'sidebar.settings': '设置',
    'sidebar.searchPlaceholder': '搜索会话...',
    'sidebar.defaultGroup': '默认分组',
    'sidebar.emptyGroup': '暂无会话',
    
    // 连接对话框
    'connect.title': '新建 SSH 连接',
    'connect.editTitle': '编辑 SSH 连接',
    'connect.host': '主机地址',
    'connect.hostPlaceholder': '192.168.1.1',
    'connect.port': '端口',
    'connect.username': '用户名',
    'connect.usernamePlaceholder': 'root',
    'connect.sessionName': '会话名称（可选）',
    'connect.sessionNamePlaceholder': '自动生成',
    'connect.group': '分组',
    'connect.tagColor': '标签颜色',
    'connect.authType': '认证方式',
    'connect.authPassword': '密码',
    'connect.authKey': '密钥',
    'connect.password': '密码',
    'connect.passwordPlaceholder': '请输入密码',
    'connect.privateKey': '私钥路径',
    'connect.privateKeyPlaceholder': '~/.ssh/id_rsa',
    'connect.passphrase': '密钥密码（可选）',
    'connect.passphrasePlaceholder': '如果密钥有密码',
    'connect.browseKey': '浏览',
    'connect.saveSession': '保存会话',
    'connect.connectBtn': '连接',
    'connect.saveOnlyBtn': '仅保存',
    'connect.saveAndConnectBtn': '保存并连接',
    'connect.cancelBtn': '取消',
    
    // 标签颜色
    'color.default': '默认',
    'color.green': '绿色 - 开发环境',
    'color.orange': '橙色 - 测试环境',
    'color.red': '红色 - 生产环境',
    'color.blue': '蓝色',
    'color.purple': '紫色',
    'color.yellow': '黄色',
    
    // 终端工具栏
    'terminal.splitHorizontal': '水平分屏',
    'terminal.splitVertical': '垂直分屏',
    'terminal.closeSplit': '关闭分屏',
    'terminal.syncInput': '同步输入',
    'terminal.syncOff': '关闭',
    'terminal.syncAll': '所有会话',
    'terminal.syncSplit': '当前分屏',
    'terminal.search': '搜索',
    
    // 搜索
    'search.placeholder': '搜索...',
    'search.caseSensitive': '区分大小写',
    'search.regex': '正则表达式',
    'search.previous': '上一个',
    'search.next': '下一个',
    'search.close': '关闭',
    
    // SFTP
    'sftp.title': 'SFTP 文件管理',
    'sftp.back': '返回上级',
    'sftp.refresh': '刷新',
    'sftp.upload': '上传',
    'sftp.mkdir': '新建文件夹',
    'sftp.download': '下载',
    'sftp.selectAll': '全选',
    'sftp.currentPath': '当前路径',
    'sftp.fileName': '文件名',
    'sftp.size': '大小',
    'sftp.modifyTime': '修改时间',
    'sftp.permissions': '权限',
    
    // 设置
    'settings.title': '设置',
    'settings.theme': '主题',
    'settings.themeMode': '主题模式',
    'settings.themeDark': '深色',
    'settings.themeLight': '浅色',
    'settings.themeCustom': '自定义',
    'settings.bgColor': '背景色',
    'settings.sidebarBgColor': '侧边栏背景色',
    'settings.primaryColor': '主题色',
    'settings.terminal': '终端',
    'settings.terminalBgColor': '终端背景色',
    'settings.terminalFgColor': '终端前景色',
    'settings.terminalCursorColor': '光标颜色',
    'settings.fontSize': '字体大小',
    'settings.fontFamily': '字体',
    'settings.cursorStyle': '光标样式',
    'settings.cursorBlock': '方块',
    'settings.cursorUnderline': '下划线',
    'settings.cursorBar': '竖线',
    'settings.cursorBlink': '光标闪烁',
    'settings.reconnect': '自动重连',
    'settings.enableReconnect': '启用自动重连',
    'settings.maxReconnectAttempts': '最大重连次数',
    'settings.reconnectInterval': '重连间隔（毫秒）',
    'settings.maxReconnectInterval': '最大重连间隔（毫秒）',
    'settings.webdav': 'WebDAV 同步',
    'settings.webdavUrl': 'WebDAV 地址',
    'settings.webdavUsername': '用户名',
    'settings.webdavPassword': '密码',
    'settings.webdavTest': '测试连接',
    'settings.webdavAutoSync': '自动同步',
    'settings.webdavSyncInterval': '同步间隔（分钟）',
    'settings.webdavUpload': '上传到云端',
    'settings.webdavDownload': '从云端下载',
    'settings.webdavSmartSync': '智能同步',
    'settings.masterPassword': '主密码',
    'settings.masterPasswordStatus': '状态',
    'settings.masterPasswordSet': '已设置',
    'settings.masterPasswordNotSet': '未设置',
    'settings.masterPasswordSetBtn': '设置主密码',
    'settings.masterPasswordChangeBtn': '修改主密码',
    'settings.masterPasswordResetBtn': '重置主密码',
    'settings.language': '语言',
    'settings.languageChinese': '简体中文',
    'settings.languageEnglish': 'English',
    'settings.resetTheme': '重置主题',
    'settings.apply': '应用',
    'settings.close': '关闭',
    
    // 主密码
    'masterPassword.title': '设置主密码',
    'masterPassword.titleVerify': '输入主密码',
    'masterPassword.titleChange': '修改主密码',
    'masterPassword.password': '主密码',
    'masterPassword.passwordPlaceholder': '请输入主密码',
    'masterPassword.newPassword': '新密码',
    'masterPassword.newPasswordPlaceholder': '请输入新密码',
    'masterPassword.oldPassword': '旧密码',
    'masterPassword.oldPasswordPlaceholder': '请输入旧密码',
    'masterPassword.confirmPassword': '确认密码',
    'masterPassword.confirmPasswordPlaceholder': '请再次输入密码',
    'masterPassword.hint': '主密码用于保护您的会话数据，请妥善保管。',
    'masterPassword.hintVerify': '请输入主密码以解锁应用。',
    'masterPassword.hintChange': '请输入新的主密码。',
    'masterPassword.skip': '暂不设置',
    'masterPassword.submit': '确定',
    'masterPassword.cancel': '取消',
    
    // 分屏
    'split.selectSession': '选择会话',
    'split.newSession': '新建连接',
    'split.savedSession': '已保存的会话',
    'split.searchPlaceholder': '搜索会话...',
    
    // 状态栏
    'status.connected': '已连接',
    'status.disconnected': '未连接',
    'status.connecting': '连接中',
    'status.reconnecting': '重连中',
    'status.version': '版本',
    
    // 通知消息
    'notify.connectSuccess': '连接成功',
    'notify.connectFailed': '连接失败',
    'notify.disconnected': '连接已断开',
    'notify.reconnectSuccess': '重连成功',
    'notify.reconnectFailed': '重连失败',
    'notify.sessionSaved': '会话已保存',
    'notify.sessionDeleted': '会话已删除',
    'notify.sessionUpdated': '会话已更新',
    'notify.configExported': '配置已导出',
    'notify.configImported': '配置已导入',
    'notify.splitCreated': '分屏已创建',
    'notify.splitClosed': '已关闭分屏',
    'notify.transferCancelled': '传输已取消',
    'notify.masterPasswordSet': '主密码设置成功',
    'notify.masterPasswordChanged': '主密码修改成功',
    'notify.masterPasswordWrong': '密码错误，请重试',
    'notify.passwordMismatch': '两次输入的密码不一致',
    'notify.passwordTooShort': '密码长度至少为 6 位',
    'notify.webdavTestSuccess': 'WebDAV 连接测试成功',
    'notify.webdavTestFailed': 'WebDAV 连接测试失败',
    'notify.languageChanged': '语言已更改，重启应用后生效',
    'notify.passwordRequired': '请输入密码',
    'notify.operationFailed': '操作失败',
    'notify.oldPasswordRequired': '请输入旧密码',
    'notify.newPasswordRequired': '请输入新密码',
    'notify.sessionUpdatedAndConnected': '会话已更新并连接成功',
    'notify.sessionUpdatedButConnectFailed': '会话已更新，但连接失败',
    'notify.sessionUpdatedButConnectError': '会话已更新，但连接错误',
    'notify.connectError': '连接错误',
    'notify.requiredFieldsMissing': '请填写主机地址和用户名',
    'notify.reconnectMaxAttempts': '重连失败，已达到最大尝试次数',
    
    // 确认对话框
    'confirm.deleteSession': '确定要删除此会话吗？',
    'confirm.deleteGroup': '确定要删除此分组吗？分组内的会话将移至默认分组。',
    'confirm.resetMasterPassword': '重置主密码将清除所有加密的会话数据，确定要继续吗？',
    'confirm.title': '确认',
    
    // 输入对话框
    'input.groupName': '分组名称',
    'input.folderName': '文件夹名称',
    'input.rename': '重命名',
  },
  
  'en-US': {
    // Common
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.refresh': 'Refresh',
    'common.connect': 'Connect',
    'common.disconnect': 'Disconnect',
    'common.copy': 'Copy',
    'common.paste': 'Paste',
    'common.selectAll': 'Select All',
    'common.clear': 'Clear',
    
    // Sidebar
    'sidebar.newSession': 'New Connection',
    'sidebar.newGroup': 'New Group',
    'sidebar.export': 'Export Config',
    'sidebar.import': 'Import Config',
    'sidebar.settings': 'Settings',
    'sidebar.searchPlaceholder': 'Search sessions...',
    'sidebar.defaultGroup': 'Default Group',
    'sidebar.emptyGroup': 'No sessions',
    
    // Connect Dialog
    'connect.title': 'New SSH Connection',
    'connect.editTitle': 'Edit SSH Connection',
    'connect.host': 'Host',
    'connect.hostPlaceholder': '192.168.1.1',
    'connect.port': 'Port',
    'connect.username': 'Username',
    'connect.usernamePlaceholder': 'root',
    'connect.sessionName': 'Session Name (Optional)',
    'connect.sessionNamePlaceholder': 'Auto-generated',
    'connect.group': 'Group',
    'connect.tagColor': 'Tag Color',
    'connect.authType': 'Authentication',
    'connect.authPassword': 'Password',
    'connect.authKey': 'Private Key',
    'connect.password': 'Password',
    'connect.passwordPlaceholder': 'Enter password',
    'connect.privateKey': 'Private Key Path',
    'connect.privateKeyPlaceholder': '~/.ssh/id_rsa',
    'connect.passphrase': 'Passphrase (Optional)',
    'connect.passphrasePlaceholder': 'If key is encrypted',
    'connect.browseKey': 'Browse',
    'connect.saveSession': 'Save Session',
    'connect.connectBtn': 'Connect',
    'connect.saveOnlyBtn': 'Save Only',
    'connect.saveAndConnectBtn': 'Save & Connect',
    'connect.cancelBtn': 'Cancel',
    
    // Tag Colors
    'color.default': 'Default',
    'color.green': 'Green - Development',
    'color.orange': 'Orange - Testing',
    'color.red': 'Red - Production',
    'color.blue': 'Blue',
    'color.purple': 'Purple',
    'color.yellow': 'Yellow',
    
    // Terminal Toolbar
    'terminal.splitHorizontal': 'Split Horizontal',
    'terminal.splitVertical': 'Split Vertical',
    'terminal.closeSplit': 'Close Split',
    'terminal.syncInput': 'Sync Input',
    'terminal.syncOff': 'Off',
    'terminal.syncAll': 'All Sessions',
    'terminal.syncSplit': 'Current Split',
    'terminal.search': 'Search',
    
    // Search
    'search.placeholder': 'Search...',
    'search.caseSensitive': 'Case Sensitive',
    'search.regex': 'Regular Expression',
    'search.previous': 'Previous',
    'search.next': 'Next',
    'search.close': 'Close',
    
    // SFTP
    'sftp.title': 'SFTP File Manager',
    'sftp.back': 'Back',
    'sftp.refresh': 'Refresh',
    'sftp.upload': 'Upload',
    'sftp.mkdir': 'New Folder',
    'sftp.download': 'Download',
    'sftp.selectAll': 'Select All',
    'sftp.currentPath': 'Current Path',
    'sftp.fileName': 'Name',
    'sftp.size': 'Size',
    'sftp.modifyTime': 'Modified',
    'sftp.permissions': 'Permissions',
    
    // Settings
    'settings.title': 'Settings',
    'settings.theme': 'Theme',
    'settings.themeMode': 'Theme Mode',
    'settings.themeDark': 'Dark',
    'settings.themeLight': 'Light',
    'settings.themeCustom': 'Custom',
    'settings.bgColor': 'Background Color',
    'settings.sidebarBgColor': 'Sidebar Background',
    'settings.primaryColor': 'Primary Color',
    'settings.terminal': 'Terminal',
    'settings.terminalBgColor': 'Terminal Background',
    'settings.terminalFgColor': 'Terminal Foreground',
    'settings.terminalCursorColor': 'Cursor Color',
    'settings.fontSize': 'Font Size',
    'settings.fontFamily': 'Font Family',
    'settings.cursorStyle': 'Cursor Style',
    'settings.cursorBlock': 'Block',
    'settings.cursorUnderline': 'Underline',
    'settings.cursorBar': 'Bar',
    'settings.cursorBlink': 'Cursor Blink',
    'settings.reconnect': 'Auto Reconnect',
    'settings.enableReconnect': 'Enable Auto Reconnect',
    'settings.maxReconnectAttempts': 'Max Reconnect Attempts',
    'settings.reconnectInterval': 'Reconnect Interval (ms)',
    'settings.maxReconnectInterval': 'Max Reconnect Interval (ms)',
    'settings.webdav': 'WebDAV Sync',
    'settings.webdavUrl': 'WebDAV URL',
    'settings.webdavUsername': 'Username',
    'settings.webdavPassword': 'Password',
    'settings.webdavTest': 'Test Connection',
    'settings.webdavAutoSync': 'Auto Sync',
    'settings.webdavSyncInterval': 'Sync Interval (minutes)',
    'settings.webdavUpload': 'Upload to Cloud',
    'settings.webdavDownload': 'Download from Cloud',
    'settings.webdavSmartSync': 'Smart Sync',
    'settings.masterPassword': 'Master Password',
    'settings.masterPasswordStatus': 'Status',
    'settings.masterPasswordSet': 'Set',
    'settings.masterPasswordNotSet': 'Not Set',
    'settings.masterPasswordSetBtn': 'Set Master Password',
    'settings.masterPasswordChangeBtn': 'Change Master Password',
    'settings.masterPasswordResetBtn': 'Reset Master Password',
    'settings.language': 'Language',
    'settings.languageChinese': '简体中文',
    'settings.languageEnglish': 'English',
    'settings.resetTheme': 'Reset Theme',
    'settings.apply': 'Apply',
    'settings.close': 'Close',
    
    // Master Password
    'masterPassword.title': 'Set Master Password',
    'masterPassword.titleVerify': 'Enter Master Password',
    'masterPassword.titleChange': 'Change Master Password',
    'masterPassword.password': 'Master Password',
    'masterPassword.passwordPlaceholder': 'Enter master password',
    'masterPassword.newPassword': 'New Password',
    'masterPassword.newPasswordPlaceholder': 'Enter new password',
    'masterPassword.oldPassword': 'Old Password',
    'masterPassword.oldPasswordPlaceholder': 'Enter old password',
    'masterPassword.confirmPassword': 'Confirm Password',
    'masterPassword.confirmPasswordPlaceholder': 'Enter password again',
    'masterPassword.hint': 'Master password protects your session data. Please keep it safe.',
    'masterPassword.hintVerify': 'Please enter master password to unlock the application.',
    'masterPassword.hintChange': 'Please enter new master password.',
    'masterPassword.skip': 'Skip',
    'masterPassword.submit': 'OK',
    'masterPassword.cancel': 'Cancel',
    
    // Split
    'split.selectSession': 'Select Session',
    'split.newSession': 'New Connection',
    'split.savedSession': 'Saved Sessions',
    'split.searchPlaceholder': 'Search sessions...',
    
    // Status Bar
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',
    'status.connecting': 'Connecting',
    'status.reconnecting': 'Reconnecting',
    'status.version': 'Version',
    
    // Notifications
    'notify.connectSuccess': 'Connected successfully',
    'notify.connectFailed': 'Connection failed',
    'notify.disconnected': 'Connection closed',
    'notify.reconnectSuccess': 'Reconnected successfully',
    'notify.reconnectFailed': 'Reconnection failed',
    'notify.sessionSaved': 'Session saved',
    'notify.sessionDeleted': 'Session deleted',
    'notify.sessionUpdated': 'Session updated',
    'notify.configExported': 'Config exported',
    'notify.configImported': 'Config imported',
    'notify.splitCreated': 'Split created',
    'notify.splitClosed': 'Split closed',
    'notify.transferCancelled': 'Transfer cancelled',
    'notify.masterPasswordSet': 'Master password set successfully',
    'notify.masterPasswordChanged': 'Master password changed successfully',
    'notify.masterPasswordWrong': 'Wrong password, please try again',
    'notify.passwordMismatch': 'Passwords do not match',
    'notify.passwordTooShort': 'Password must be at least 6 characters',
    'notify.webdavTestSuccess': 'WebDAV connection test successful',
    'notify.webdavTestFailed': 'WebDAV connection test failed',
    'notify.languageChanged': 'Language changed, restart to take effect',
    'notify.passwordRequired': 'Please enter password',
    'notify.operationFailed': 'Operation failed',
    'notify.oldPasswordRequired': 'Please enter old password',
    'notify.newPasswordRequired': 'Please enter new password',
    'notify.sessionUpdatedAndConnected': 'Session updated and connected successfully',
    'notify.sessionUpdatedButConnectFailed': 'Session updated but connection failed',
    'notify.sessionUpdatedButConnectError': 'Session updated but connection error',
    'notify.connectError': 'Connection error',
    'notify.requiredFieldsMissing': 'Please fill in host and username',
    'notify.reconnectMaxAttempts': 'Reconnection failed, max attempts reached',
    
    // Confirm Dialog
    'confirm.deleteSession': 'Are you sure you want to delete this session?',
    'confirm.deleteGroup': 'Are you sure you want to delete this group? Sessions will be moved to default group.',
    'confirm.resetMasterPassword': 'Resetting master password will clear all encrypted session data. Continue?',
    'confirm.title': 'Confirm',
    
    // Input Dialog
    'input.groupName': 'Group Name',
    'input.folderName': 'Folder Name',
    'input.rename': 'Rename',
  }
};

// 国际化类
class I18n {
  constructor() {
    this.currentLang = this.getDefaultLanguage();
    this.translations = translations;
  }

  // 获取默认语言
  getDefaultLanguage() {
    // 从 localStorage 读取
    const saved = localStorage.getItem('appLanguage');
    if (saved && translations[saved]) {
      return saved;
    }
    
    // 从系统语言判断
    const systemLang = navigator.language || navigator.userLanguage;
    if (systemLang.startsWith('zh')) {
      return 'zh-CN';
    }
    
    return 'en-US';
  }

  // 设置语言
  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('appLanguage', lang);
      return true;
    }
    return false;
  }

  // 获取翻译
  t(key, defaultValue = key) {
    const lang = this.translations[this.currentLang];
    return lang && lang[key] ? lang[key] : defaultValue;
  }

  // 获取当前语言
  getCurrentLanguage() {
    return this.currentLang;
  }

  // 获取所有支持的语言
  getSupportedLanguages() {
    return Object.keys(this.translations);
  }
}

// 导出单例
const i18n = new I18n();

// 如果在浏览器环境，挂载到 window
if (typeof window !== 'undefined') {
  window.i18n = i18n;
}

// 如果是 Node.js 环境，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}
