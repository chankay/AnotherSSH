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
    'sidebar.title': '会话管理',
    'sidebar.newSession': '新建连接',
    'sidebar.newLocalShell': '💻 本地终端',
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
    'sftp.downloadSelected': '下载选中',
    'sftp.downloadSelectedCount': '下载选中 ({count})',
    'sftp.menuDownload': '下载',
    'sftp.menuOpen': '打开',
    'sftp.menuRename': '重命名',
    'sftp.menuDelete': '删除',
    'sftp.mkdirTitle': '新建文件夹',
    'sftp.mkdirPrompt': '请输入文件夹名称:',
    'sftp.mkdirFailed': '创建文件夹失败',
    'sftp.deleteTitle': '删除确认',
    'sftp.deleteMessage': '确定删除 "{name}" 吗？',
    'sftp.deleteFailed': '删除失败',
    'sftp.renameTitle': '重命名',
    'sftp.renamePrompt': '请输入新名称:',
    'sftp.renameFailed': '重命名失败',
    'sftp.closePaneTitle': '关闭此面板',
    
    // 设置
    'settings.title': '设置',
    'settings.tabGeneral': '通用',
    'settings.tabTheme': '主题',
    'settings.tabSecurity': '安全',
    'settings.tabSync': '同步',
    'settings.tabLogs': '日志',
    'settings.theme': '主题',
    'settings.themeMode': '主题模式',
    'settings.themeDark': '深色模式',
    'settings.themeLight': '浅色模式',
    'settings.themeCustom': '自定义',
    'settings.themeDracula': 'Dracula',
    'settings.themeMonokai': 'Monokai',
    'settings.themeSolarizedDark': 'Solarized Dark',
    'settings.themeNord': 'Nord',
    'settings.themeOneDark': 'One Dark',
    'settings.themeGithubDark': 'GitHub Dark',
    'settings.themeTokyoNight': 'Tokyo Night',
    'settings.themeGruvbox': 'Gruvbox Dark',
    'settings.themeMaterial': 'Material',
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
    'settings.masterPasswordRemoveBtn': '移除主密码',
    'settings.masterPasswordRemoveHint': '移除主密码后，应用将不再需要密码验证',
    'settings.language': '语言',
    'settings.languageChinese': '简体中文',
    'settings.languageEnglish': 'English',
    'settings.languageHint': '更改语言后立即生效',
    'settings.resetTheme': '重置主题',
    'settings.apply': '应用',
    'settings.close': '关闭',
    'settings.customTheme': '自定义配色',
    'settings.themePreview': '主题预览',
    'settings.securityTips': '安全建议',
    'settings.securityTip1': '使用至少 8 位的强密码',
    'settings.securityTip2': '包含大小写字母、数字和特殊字符',
    'settings.securityTip3': '不要使用常见密码或个人信息',
    'settings.securityTip4': '定期更换密码',
    'settings.securityTip5': '妥善保管密码，忘记密码将无法恢复数据',
    'settings.syncStatus': '状态',
    'settings.syncStatusNotConfigured': '未配置',
    'settings.syncStatusConfigured': '已配置',
    'settings.syncLastSync': '最后同步',
    'settings.syncNever': '从未',
    'settings.syncHelp': '使用说明',
    'settings.syncHelpJianguoyun': '坚果云配置',
    'settings.syncHelpStep1': '登录坚果云网页版',
    'settings.syncHelpStep2': '进入 账户信息 → 安全选项 → 第三方应用管理',
    'settings.syncHelpStep3': '添加应用密码，名称填 "AnotherSSH"',
    'settings.syncHelpStep4': '服务器地址: https://dav.jianguoyun.com/dav/',
    'settings.syncHelpStep5': '用户名: 你的坚果云账号邮箱',
    'settings.syncHelpStep6': '密码: 刚才生成的应用密码',
    'settings.syncHelpFirstSync': '首次同步',
    'settings.syncHelpFirstSyncDesc': '由于坚果云限制，首次使用需要先在坚果云中手动创建配置文件：',
    'settings.syncHelpFirstSyncStep1': '打开坚果云网页版或客户端',
    'settings.syncHelpFirstSyncStep2': '在根目录创建一个空的文本文件',
    'settings.syncHelpFirstSyncStep3': '文件名与上面"远程文件路径"保持一致',
    'settings.syncHelpFirstSyncStep4': '然后点击"立即同步"即可',
    'settings.webdavUrlHint': '支持坚果云、Nextcloud、Synology NAS 等',
    'settings.webdavPasswordHint': '建议使用应用专用密码，不要使用账号密码',
    'settings.webdavRemotePathHint': '文件将保存在 WebDAV 根目录下，例如：anotherssh-config.json 或 backup/config.json',
    'settings.syncLogsHint': '启用后会将会话日志同步到云端（可能占用较多空间）',
    'settings.remoteLogsPathHint': '日志文件将保存在 WebDAV 根目录下的此文件夹中',
    'settings.masterPasswordHint': '主密码用于保护您的会话数据，防止未授权访问。',
    'settings.masterPasswordSetHint': '设置主密码后，每次启动应用需要输入密码验证',
    
    // 日志管理
    'logs.refresh': '刷新',
    'logs.openDir': '打开日志目录',
    'logs.clearAll': '清除所有日志',
    'logs.noLogs': '暂无日志',
    'logs.view': '查看',
    'logs.export': '导出',
    'logs.delete': '删除',
    'logs.deleteConfirm': '确定要删除这个日志文件吗？',
    'logs.clearAllConfirm': '确定要清除所有日志文件吗？此操作不可恢复！',
    
    // 主题
    'theme.dark': '深色模式',
    'theme.light': '浅色模式',
    
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
    'split.selectSession': '选择分屏会话',
    'split.newSession': '新建连接',
    'split.savedSession': '选择已保存会话',
    'split.searchPlaceholder': '搜索会话...',
    'split.cancel': '取消',
    
    // 状态栏
    'status.connected': '已连接',
    'status.disconnected': '未连接',
    'status.connecting': '连接中',
    'status.reconnecting': '重连中',
    'status.version': '版本',
    'status.checkingUpdates': '检查更新中...',
    'status.newVersionAvailable': '发现新版本',
    
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
    'notify.languageChanged': '语言已更改',
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
    'notify.fileSelectFailed': '选择文件失败',
    'notify.importSuccess': '成功导入 {count} 个会话',
    'notify.importFailed': '导入失败',
    'notify.importError': '导入错误',
    'notify.selectFilesToDownload': '请先选择要下载的文件',
    'notify.connecting': '正在连接...',
    'notify.downloadComplete': '下载完成',
    'notify.downloadFailed': '下载失败',
    'notify.uploadComplete': '上传完成',
    'notify.uploadFailed': '上传失败',
    'notify.masterPasswordRemoved': '主密码已移除',
    'notify.removeFailed': '移除失败',
    'notify.settingsSaved': '设置已保存',
    'notify.webdavConfigIncomplete': '请填写完整的 WebDAV 配置',
    'notify.connectionSuccess': '✅ 连接成功！',
    'notify.webdavNotConfigured': '请先配置 WebDAV 连接',
    'notify.cannotReadSessionData': '❌ 无法读取会话数据',
    'notify.checkingUpdates': '正在检查更新...',
    'notify.alreadyLatest': '当前已是最新版本',
    'notify.checkUpdateFailed': '检查更新失败，请稍后重试',
    'notify.newVersionFound': '发现新版本',
    'notify.loadLogsFailed': '加载日志失败',
    'notify.readLogFailed': '读取日志失败',
    'notify.showLogFailed': '显示日志失败',
    'notify.logDeleted': '日志已删除',
    'notify.deleteLogFailed': '删除日志失败',
    'notify.allLogsCleared': '所有日志已清除',
    'notify.clearLogsFailed': '清除日志失败',
    'notify.logExported': '日志已导出',
    'notify.exportLogFailed': '导出日志失败',
    'notify.openLogDirFailed': '打开日志目录失败',
    'notify.connectSessionFirst': '请先连接一个 SSH 会话',
    'notify.maxSplitReached': '最多支持 4 个分屏',
    'notify.sessionNotFound': '会话不存在',
    'notify.splitCreatedSuccess': '分屏创建成功',
    'notify.createSplitFailed': '创建分屏失败',
    
    // 移除主密码
    'removeMasterPassword.title': '移除主密码',
    'removeMasterPassword.message': '确定要移除主密码吗？移除后应用将不再需要密码验证。',
    
    // 主密码对话框动态文本
    'masterPassword.titleSetOptional': '设置主密码（可选）',
    'masterPassword.hintSetOptional': '主密码用于保护您的会话数据，请妥善保管。您也可以选择暂不设置。',
    
    // 连接对话框动态文本
    'connect.titleNew': '新建 SSH 连接',
    'connect.titleEdit': '编辑 SSH 连接',
    'connect.titleClone': '克隆 SSH 连接',
    'connect.titleSplit': '新建分屏',
    'connect.titleSplitHorizontal': '新建分屏 (水平)',
    'connect.titleSplitVertical': '新建分屏 (垂直)',
    'connect.btnConnect': '连接',
    'connect.btnSaveAndConnect': '保存并连接',
    'connect.btnConnectAndSplit': '连接并分屏',
    
    // 状态文本
    'status.notConnected': '未连接',
    'status.connected': '已连接',
    'status.connecting': '连接中',
    'status.disconnected': '已断开',
    
    // 分组相关
    'group.default': '默认分组',
    'group.empty': '暂无会话',
    'group.rename': '重命名',
    'group.delete': '删除',
    'group.newTitle': '新建分组',
    'group.newPrompt': '请输入分组名称:',
    'group.renameTitle': '重命名分组',
    'group.renamePrompt': '请输入新的分组名称:',
    'group.deleteTitle': '删除分组',
    'group.deleteMessage': '分组 "{name}" 中有 {count} 个会话。\n\n点击"确定"将会话移至默认分组',
    'group.deleteWithSubgroupsMessage': '分组 "{name}" 及其 {subcount} 个子分组中共有 {count} 个会话。\n\n点击"确定"将所有会话移至默认分组',
    'group.alreadyExists': '分组已存在',
    'group.nameExists': '分组名称已存在',
    'group.addSubgroup': '添加子分组',
    'group.addSubgroupTitle': '添加子分组',
    'group.addSubgroupPrompt': '请输入子分组名称:',
    'group.moveSuccess': '已将 "{session}" 从 "{from}" 移动到 "{to}"',
    
    // 会话操作
    'session.deleteTitle': '删除会话',
    'session.deleteMessage': '确定删除会话 "{name}" 吗？',
    'session.exportSuccess': '配置已导出到:\n{path}',
    'session.exportFailed': '导出失败',
    'session.exportError': '导出错误',
    'session.importTitle': '导入配置',
    'session.importMessage': '导入配置将会覆盖当前所有会话和分组，是否继续？',
    
    // SFTP相关
    'sftp.openTitle': '打开 SFTP',
    
    // 同步输入
    'syncInput.off': '同步: 关',
    'syncInput.all': '同步: 所有',
    'syncInput.split': '同步: 分屏',
    'syncInput.titleOff': '同步输入模式: 关闭',
    'syncInput.titleAll': '同步输入模式: 所有会话',
    'syncInput.titleSplit': '同步输入模式: 当前分屏',
    
    // 搜索结果
    'search.found': '已找到',
    'search.noMatch': '无匹配',
    'search.error': '错误',
    
    // WebDAV同步
    'webdav.testing': '测试中...',
    'webdav.testConnection': '测试连接',
    'webdav.syncing': '同步中...',
    'webdav.syncNow': '立即同步',
    'webdav.lastSyncNever': '从未',
    
    // 连接状态
    'connection.statusConnecting': '连接中',
    'connection.failed': '连接失败',
    
    // 其他
    'common.version': '版本',
    'confirm.deleteSession': '确定要删除此会话吗？',
    'confirm.deleteGroup': '确定要删除此分组吗？分组内的会话将移至默认分组。',
    'confirm.resetMasterPassword': '重置主密码将清除所有加密的会话数据，确定要继续吗？',
    'confirm.title': '确认',
    
    // 输入对话框
    'input.groupName': '分组名称',
    'input.folderName': '文件夹名称',
    'input.rename': '重命名',
    
    // 更新对话框
    'update.title': '发现新版本',
    'update.currentVersion': '当前版本',
    'update.latestVersion': '最新版本',
    'update.description': '建议您更新到最新版本以获得更好的体验和新功能。',
    'update.releaseNotes': '更新内容',
    'update.later': '稍后提醒',
    'update.download': '立即下载',
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
    'sidebar.title': 'Session Manager',
    'sidebar.newSession': 'New Connection',
    'sidebar.newLocalShell': '💻 Local Shell',
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
    'sftp.downloadSelected': 'Download Selected',
    'sftp.downloadSelectedCount': 'Download Selected ({count})',
    'sftp.menuDownload': 'Download',
    'sftp.menuOpen': 'Open',
    'sftp.menuRename': 'Rename',
    'sftp.menuDelete': 'Delete',
    'sftp.mkdirTitle': 'New Folder',
    'sftp.mkdirPrompt': 'Enter folder name:',
    'sftp.mkdirFailed': 'Failed to create folder',
    'sftp.deleteTitle': 'Confirm Delete',
    'sftp.deleteMessage': 'Are you sure you want to delete "{name}"?',
    'sftp.deleteFailed': 'Delete failed',
    'sftp.renameTitle': 'Rename',
    'sftp.renamePrompt': 'Enter new name:',
    'sftp.renameFailed': 'Rename failed',
    'sftp.closePaneTitle': 'Close this pane',
    
    // Settings
    'settings.title': 'Settings',
    'settings.tabGeneral': 'General',
    'settings.tabTheme': 'Theme',
    'settings.tabSecurity': 'Security',
    'settings.tabSync': 'Sync',
    'settings.tabLogs': 'Logs',
    'settings.theme': 'Theme',
    'settings.themeMode': 'Theme Mode',
    'settings.themeDark': 'Dark Mode',
    'settings.themeLight': 'Light Mode',
    'settings.themeCustom': 'Custom',
    'settings.themeDracula': 'Dracula',
    'settings.themeMonokai': 'Monokai',
    'settings.themeSolarizedDark': 'Solarized Dark',
    'settings.themeNord': 'Nord',
    'settings.themeOneDark': 'One Dark',
    'settings.themeGithubDark': 'GitHub Dark',
    'settings.themeTokyoNight': 'Tokyo Night',
    'settings.themeGruvbox': 'Gruvbox Dark',
    'settings.themeMaterial': 'Material',
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
    'settings.masterPasswordRemoveBtn': 'Remove Master Password',
    'settings.masterPasswordRemoveHint': 'After removing master password, the app will no longer require password verification',
    'settings.language': 'Language',
    'settings.languageChinese': '简体中文',
    'settings.languageEnglish': 'English',
    'settings.languageHint': 'Changes take effect immediately',
    'settings.resetTheme': 'Reset Theme',
    'settings.apply': 'Apply',
    'settings.close': 'Close',
    'settings.customTheme': 'Custom Colors',
    'settings.themePreview': 'Theme Preview',
    'settings.securityTips': 'Security Tips',
    'settings.securityTip1': 'Use at least 8 characters for strong password',
    'settings.securityTip2': 'Include uppercase, lowercase, numbers and special characters',
    'settings.securityTip3': 'Do not use common passwords or personal information',
    'settings.securityTip4': 'Change password regularly',
    'settings.securityTip5': 'Keep password safe, lost password cannot recover data',
    'settings.syncStatus': 'Status',
    'settings.syncStatusNotConfigured': 'Not Configured',
    'settings.syncStatusConfigured': 'Configured',
    'settings.syncLastSync': 'Last Sync',
    'settings.syncNever': 'Never',
    'settings.syncHelp': 'Help',
    'settings.syncHelpJianguoyun': 'Jianguoyun Configuration',
    'settings.syncHelpStep1': 'Login to Jianguoyun web',
    'settings.syncHelpStep2': 'Go to Account Info → Security → Third-party App Management',
    'settings.syncHelpStep3': 'Add app password, name it "AnotherSSH"',
    'settings.syncHelpStep4': 'Server URL: https://dav.jianguoyun.com/dav/',
    'settings.syncHelpStep5': 'Username: Your Jianguoyun email',
    'settings.syncHelpStep6': 'Password: The app password you just generated',
    'settings.syncHelpFirstSync': 'First Sync',
    'settings.syncHelpFirstSyncDesc': 'Due to Jianguoyun restrictions, you need to manually create config file first:',
    'settings.syncHelpFirstSyncStep1': 'Open Jianguoyun web or client',
    'settings.syncHelpFirstSyncStep2': 'Create an empty text file in root directory',
    'settings.syncHelpFirstSyncStep3': 'File name should match "Remote File Path" above',
    'settings.syncHelpFirstSyncStep4': 'Then click "Sync Now"',
    'settings.webdavUrlHint': 'Supports Jianguoyun, Nextcloud, Synology NAS, etc.',
    'settings.webdavPasswordHint': 'Recommend using app-specific password instead of account password',
    'settings.webdavRemotePathHint': 'File will be saved in WebDAV root directory, e.g.: anotherssh-config.json or backup/config.json',
    'settings.syncLogsHint': 'When enabled, session logs will be synced to cloud (may use more space)',
    'settings.remoteLogsPathHint': 'Log files will be saved in this folder under WebDAV root directory',
    'settings.masterPasswordHint': 'Master password protects your session data from unauthorized access.',
    'settings.masterPasswordSetHint': 'After setting master password, you need to enter password on each app startup',
    
    // Logs
    'logs.refresh': 'Refresh',
    'logs.openDir': 'Open Log Directory',
    'logs.clearAll': 'Clear All Logs',
    'logs.noLogs': 'No logs',
    'logs.view': 'View',
    'logs.export': 'Export',
    'logs.delete': 'Delete',
    'logs.deleteConfirm': 'Are you sure you want to delete this log file?',
    'logs.clearAllConfirm': 'Are you sure you want to clear all log files? This action cannot be undone!',
    
    // Theme
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',
    
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
    
    // 分屏
    'split.selectSession': 'Select Split Session',
    'split.newSession': 'New Connection',
    'split.savedSession': 'Select Saved Session',
    'split.searchPlaceholder': 'Search sessions...',
    'split.cancel': 'Cancel',
    
    // Status Bar
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',
    'status.connecting': 'Connecting',
    'status.reconnecting': 'Reconnecting',
    'status.version': 'Version',
    'status.checkingUpdates': 'Checking for updates...',
    'status.newVersionAvailable': 'New version available',
    
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
    'notify.languageChanged': 'Language changed',
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
    'notify.fileSelectFailed': 'File selection failed',
    'notify.importSuccess': 'Successfully imported {count} sessions',
    'notify.importFailed': 'Import failed',
    'notify.importError': 'Import error',
    'notify.selectFilesToDownload': 'Please select files to download first',
    'notify.connecting': 'Connecting...',
    'notify.downloadComplete': 'Download complete',
    'notify.downloadFailed': 'Download failed',
    'notify.uploadComplete': 'Upload complete',
    'notify.uploadFailed': 'Upload failed',
    'notify.masterPasswordRemoved': 'Master password removed',
    'notify.removeFailed': 'Remove failed',
    'notify.settingsSaved': 'Settings saved',
    'notify.webdavConfigIncomplete': 'Please fill in complete WebDAV configuration',
    'notify.connectionSuccess': '✅ Connection successful!',
    'notify.webdavNotConfigured': 'Please configure WebDAV connection first',
    'notify.cannotReadSessionData': '❌ Cannot read session data',
    'notify.checkingUpdates': 'Checking for updates...',
    'notify.alreadyLatest': 'Already using the latest version',
    'notify.checkUpdateFailed': 'Failed to check for updates, please try again later',
    'notify.newVersionFound': 'New version found',
    'notify.loadLogsFailed': 'Failed to load logs',
    'notify.readLogFailed': 'Failed to read log',
    'notify.showLogFailed': 'Failed to show log',
    'notify.logDeleted': 'Log deleted',
    'notify.deleteLogFailed': 'Failed to delete log',
    'notify.allLogsCleared': 'All logs cleared',
    'notify.clearLogsFailed': 'Failed to clear logs',
    'notify.logExported': 'Log exported',
    'notify.exportLogFailed': 'Failed to export log',
    'notify.openLogDirFailed': 'Failed to open log directory',
    'notify.connectSessionFirst': 'Please connect an SSH session first',
    'notify.maxSplitReached': 'Maximum 4 splits supported',
    'notify.sessionNotFound': 'Session not found',
    'notify.splitCreatedSuccess': 'Split created successfully',
    'notify.createSplitFailed': 'Failed to create split',
    
    // Remove Master Password
    'removeMasterPassword.title': 'Remove Master Password',
    'removeMasterPassword.message': 'Are you sure you want to remove master password? The app will no longer require password verification.',
    
    // Master Password Dialog Dynamic Text
    'masterPassword.titleSetOptional': 'Set Master Password (Optional)',
    'masterPassword.hintSetOptional': 'Master password protects your session data. Please keep it safe. You can also skip this step.',
    
    // Connect Dialog Dynamic Text
    'connect.titleNew': 'New SSH Connection',
    'connect.titleEdit': 'Edit SSH Connection',
    'connect.titleClone': 'Clone SSH Connection',
    'connect.titleSplit': 'New Split',
    'connect.titleSplitHorizontal': 'New Split (Horizontal)',
    'connect.titleSplitVertical': 'New Split (Vertical)',
    'connect.btnConnect': 'Connect',
    'connect.btnSaveAndConnect': 'Save & Connect',
    'connect.btnConnectAndSplit': 'Connect & Split',
    
    // Status Text
    'status.notConnected': 'Not Connected',
    'status.connected': 'Connected',
    'status.connecting': 'Connecting',
    'status.disconnected': 'Disconnected',
    
    // Group Related
    'group.default': 'Default Group',
    'group.empty': 'No sessions',
    'group.rename': 'Rename',
    'group.delete': 'Delete',
    'group.newTitle': 'New Group',
    'group.newPrompt': 'Enter group name:',
    'group.renameTitle': 'Rename Group',
    'group.renamePrompt': 'Enter new group name:',
    'group.deleteTitle': 'Delete Group',
    'group.deleteMessage': 'Group "{name}" has {count} sessions.\n\nClick "OK" to move sessions to default group',
    'group.deleteWithSubgroupsMessage': 'Group "{name}" and its {subcount} subgroups have {count} sessions in total.\n\nClick "OK" to move all sessions to default group',
    'group.alreadyExists': 'Group already exists',
    'group.nameExists': 'Group name already exists',
    'group.addSubgroup': 'Add Subgroup',
    'group.addSubgroupTitle': 'Add Subgroup',
    'group.addSubgroupPrompt': 'Enter subgroup name:',
    'group.moveSuccess': 'Moved "{session}" from "{from}" to "{to}"',
    
    // Session Operations
    'session.deleteTitle': 'Delete Session',
    'session.deleteMessage': 'Are you sure you want to delete session "{name}"?',
    'session.exportSuccess': 'Config exported to:\n{path}',
    'session.exportFailed': 'Export failed',
    'session.exportError': 'Export error',
    'session.importTitle': 'Import Config',
    'session.importMessage': 'Importing config will overwrite all current sessions and groups. Continue?',
    
    // SFTP Related
    'sftp.openTitle': 'Open SFTP',
    
    // Sync Input
    'syncInput.off': 'Sync: Off',
    'syncInput.all': 'Sync: All',
    'syncInput.split': 'Sync: Split',
    'syncInput.titleOff': 'Sync Input Mode: Off',
    'syncInput.titleAll': 'Sync Input Mode: All Sessions',
    'syncInput.titleSplit': 'Sync Input Mode: Current Split',
    
    // Search Results
    'search.found': 'Found',
    'search.noMatch': 'No Match',
    'search.error': 'Error',
    
    // WebDAV Sync
    'webdav.testing': 'Testing...',
    'webdav.testConnection': 'Test Connection',
    'webdav.syncing': 'Syncing...',
    'webdav.syncNow': 'Sync Now',
    'webdav.lastSyncNever': 'Never',
    
    // Connection Status
    'connection.statusConnecting': 'Connecting',
    'connection.failed': 'Connection failed',
    
    // Others
    'common.version': 'Version',
    'confirm.deleteSession': 'Are you sure you want to delete this session?',
    'confirm.deleteGroup': 'Are you sure you want to delete this group? Sessions will be moved to default group.',
    'confirm.resetMasterPassword': 'Resetting master password will clear all encrypted session data. Continue?',
    'confirm.title': 'Confirm',
    
    // Input Dialog
    'input.groupName': 'Group Name',
    'input.folderName': 'Folder Name',
    'input.rename': 'Rename',
    
    // Update Dialog
    'update.title': 'New Version Available',
    'update.currentVersion': 'Current Version',
    'update.latestVersion': 'Latest Version',
    'update.description': 'We recommend updating to the latest version for better experience and new features.',
    'update.releaseNotes': 'Release Notes',
    'update.later': 'Remind Me Later',
    'update.download': 'Download Now',
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

  // 更新页面上所有带 data-i18n 属性的元素
  updatePageLanguage() {
    // 更新所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translated = this.t(key);
      
      // 根据元素类型更新不同的属性
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.placeholder) {
          element.placeholder = translated;
        }
      } else {
        element.textContent = translated;
      }
    });

    // 更新所有带 data-i18n-placeholder 属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });

    // 更新所有带 data-i18n-title 属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
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
