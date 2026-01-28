# AnotherSSH

> Another way to connect - 一个现代化的跨平台 SSH 客户端

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28-blue.svg)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com)
[![Release](https://img.shields.io/github/v/release/chankay/anotherssh)](https://github.com/chankay/anotherssh/releases)

一个基于 Electron + Node.js 开发的现代化 SSH 客户端，提供直观的图形界面和强大的功能，让远程服务器管理变得简单高效。

## 📥 下载

访问 [Releases 页面](https://github.com/chankay/anotherssh/releases) 下载最新版本：

- **macOS**: `AnotherSSH-{version}-mac-arm64.dmg` (Apple Silicon) 或 `AnotherSSH-{version}-mac-x64.dmg` (Intel)
- **Windows**: `AnotherSSH-{version}-win-x64.exe` (Intel/AMD 64位) 或 `AnotherSSH-{version}-win-arm64.exe` (ARM64)
- **Linux**: `AnotherSSH-{version}-linux-x64.AppImage` (Intel/AMD 64位) 或 `AnotherSSH-{version}-linux-arm64.AppImage` (ARM64)

### macOS 用户注意 ⚠️

由于应用未经过 Apple 签名，首次打开时会提示"已损坏"。请使用以下方法之一：

**方法 1: 右键打开（推荐）**
1. 右键点击应用
2. 选择"打开"
3. 点击"打开"确认

**方法 2: 终端命令**
```bash
xattr -cr /Applications/AnotherSSH.app
```

详细说明请查看 [CODE_SIGNING.md](CODE_SIGNING.md)。

## ✨ 功能特性

### SSH 连接管理
- ✅ SSH2 协议支持
- ✅ 密码和密钥认证
- ✅ 多标签页终端
- ✅ 会话保存和管理
- ✅ 会话分组管理
- ✅ 会话配置加密存储
- ✅ 会话搜索功能
- ✅ 会话导入/导出
- ✅ 连接状态可视化指示器

### 终端功能
- ✅ 完整的终端模拟（基于 xterm.js）
- ✅ 支持中文等多语言字符集（UTF-8）
- ✅ 终端大小自适应
- ✅ 复制粘贴支持
- ✅ 多会话同时运行

### SFTP 文件传输
- ✅ 图形化文件管理器
- ✅ 文件上传/下载
- ✅ 拖拽上传支持
- ✅ 批量文件下载
- ✅ 文件/文件夹操作（重命名、删除、新建）
- ✅ 传输进度显示
- ✅ 传输取消功能
- ✅ 右键菜单支持

### 用户体验
- ✅ 现代化深色主题
- ✅ 浅色主题支持
- ✅ 自定义主题和配色
- ✅ 终端字体和样式自定义
- ✅ 快捷键支持（Ctrl/Cmd + N, Ctrl/Cmd + F）
- ✅ 实时通知提示
- ✅ 双击快速连接
- ✅ 连接状态反馈
- ✅ 响应式界面设计

### 配置同步
- ✅ WebDAV 云端同步
- ✅ 支持坚果云、Nextcloud、Synology NAS
- ✅ 智能合并策略
- ✅ 自动同步支持
- ✅ 加密数据传输

### 版本更新
- ✅ 自动检查更新
- ✅ 手动检查更新
- ✅ 版本号显示
- ✅ 一键跳转下载

## 🚀 技术栈

- **Electron 28** - 跨平台桌面应用框架
- **Node.js** - JavaScript 运行时
- **ssh2** - SSH 连接库
- **ssh2-sftp-client** - SFTP 文件传输
- **@xterm/xterm** - 终端模拟器
- **webdav** - WebDAV 客户端（配置同步）

## 📦 开发者指南

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
# 开发模式（带开发者工具）
npm run dev

# 生产模式
npm start
```

### 本地打包

```bash
# 打包所有平台
npm run build

# 仅打包 macOS
npm run build:mac

# 仅打包 Windows
npm run build:win

# 仅打包 Linux
npm run build:linux
```

### 发布新版本

查看 [RELEASE.md](RELEASE.md) 了解如何使用 GitHub Actions 自动发布。

快速发布：
```bash
# 1. 更新 package.json 中的版本号
# 2. 提交更改
git commit -am "chore: bump version to x.x.x"

# 3. 创建并推送标签
git tag vx.x.x
git push && git push origin vx.x.x
```

GitHub Actions 会自动构建并发布到 Releases。

## 📖 使用指南

### 新建 SSH 连接

1. 点击左侧边栏的"新建连接"按钮
2. 填写连接信息：
   - 主机地址
   - 端口（默认 22）
   - 用户名
   - 认证方式（密码或密钥）
   - 会话名称（可选）
   - 分组（可选）
3. 勾选"保存此会话配置"以便下次快速连接
4. 点击"连接"

### 会话管理

**分组管理：**
- 点击"新建分组"创建分组
- 拖拽会话到不同分组
- 点击分组标题折叠/展开
- 右键分组进行重命名或删除

**搜索会话：**
- 使用顶部搜索框快速查找会话
- 支持搜索名称、主机、用户名、分组
- 快捷键：`Ctrl/Cmd + F`

**导入/导出：**
- 点击"导出配置"备份所有会话
- 点击"导入配置"从备份恢复
- 配置文件包含加密的密码信息

### SFTP 文件传输

**打开 SFTP：**
- 连接 SSH 后，点击标签页上的 📁 图标
- 或右键点击标签页选择"打开 SFTP"

**文件操作：**
- **上传**：点击"上传"按钮或拖拽文件到文件列表
- **下载**：双击文件或勾选后点击"下载选中"
- **重命名**：右键文件选择"重命名"
- **删除**：右键文件选择"删除"
- **新建文件夹**：点击"新建文件夹"按钮

**批量操作：**
- 勾选多个文件
- 点击"下载选中"批量下载
- 点击"全选"快速选择所有文件

**传输控制：**
- 传输时右下角显示进度条
- 点击进度条上的 ✕ 按钮取消传输
- 支持大文件传输

### 快捷键

- `Ctrl/Cmd + N` - 新建连接
- `Ctrl/Cmd + F` - 聚焦搜索框
- `ESC` - 关闭对话框
- 双击会话 - 快速连接
- 双击文件 - 下载文件
- 双击文件夹 - 进入文件夹

### 主题和配色

点击侧边栏顶部的 ⚙️ 图标打开设置：

**11 款内置主题：**
- 深色模式（默认）
- 浅色模式
- Dracula（紫色系）
- Monokai（经典高对比）
- Solarized Dark（护眼配色）
- Nord（北欧冷色调）
- One Dark（Atom 风格）
- GitHub Dark（GitHub 官方）
- Tokyo Night（深蓝色）
- Gruvbox Dark（复古温暖）
- Material（Google 设计）

**自定义主题：**
- 自定义背景色
- 自定义侧边栏颜色
- 自定义主色调
- 自定义文字和边框颜色
- 实时预览效果

**终端设置：**
- 字体大小（10-24）
- 字体选择（Courier New, Monaco, Menlo, Consolas）
- 光标样式（方块、下划线、竖线）
- 光标闪烁开关

详细说明请查看 [THEMES.md](THEMES.md)。

### 配置同步

点击侧边栏顶部的 ⚙️ 图标，切换到"同步"标签页：

**支持的服务：**
- 坚果云（推荐，国内访问快）
- Nextcloud（开源自建）
- Synology NAS（群晖）
- 其他 WebDAV 服务

**配置步骤：**
1. 填写 WebDAV 服务器地址
2. 输入用户名和密码（建议使用应用专用密码）
3. 点击"测试连接"验证配置
4. 启用"自动同步"（可选）
5. 点击"立即同步"开始同步

**同步功能：**
- 智能合并本地和云端配置
- 自动同步（可设置间隔）
- 加密数据传输
- 多设备配置共享

详细说明请查看 [WEBDAV_SYNC.md](WEBDAV_SYNC.md)。

### 版本更新

**自动检查：**
- 应用启动时自动检查更新（每天一次）
- 有新版本时在底部状态栏显示提示
- 点击提示跳转到下载页面

**手动检查：**
- 点击底部状态栏的版本号（如 v1.0.3）
- 立即检查是否有新版本
- 显示检查结果通知

## 🗂️ 项目结构

```
ssh-client/
├── src/
│   ├── main/                 # 主进程
│   │   ├── main.js          # Electron 主入口
│   │   ├── ssh-manager.js   # SSH 连接管理
│   │   ├── sftp-manager.js  # SFTP 文件传输
│   │   └── session-store.js # 会话存储（加密）
│   └── renderer/            # 渲染进程
│       ├── index.html       # 主界面
│       ├── styles.css       # 样式
│       └── app.js          # 前端逻辑
├── package.json
└── README.md
```

## 🔐 安全特性

- **密码加密**：使用 AES-256-CBC 加密存储
- **密钥保护**：加密密钥存储在本地
- **安全传输**：SSH2 协议加密通信
- **会话隔离**：每个会话独立运行

## 🎨 界面预览

- **深色主题**：护眼的深色配色方案
- **分组管理**：清晰的会话组织结构
- **多标签页**：同时管理多个连接
- **SFTP 管理器**：直观的文件操作界面

## 📝 配置文件位置

- **macOS**: `~/Library/Application Support/anotherssh/`
- **Windows**: `%APPDATA%/anotherssh/`
- **Linux**: `~/.config/anotherssh/`

配置文件：
- `sessions.json` - 会话配置（加密）
- `.key` - 加密密钥
- `webdav-config.json` - WebDAV 同步配置

## 🐛 故障排除

**连接失败：**
- 检查主机地址和端口是否正确
- 确认用户名和密码/密钥是否正确
- 检查网络连接和防火墙设置

**SFTP 无法使用：**
- 确保 SSH 连接正常
- 检查服务器是否支持 SFTP
- 尝试重新连接

**传输中断：**
- 检查网络连接
- 大文件传输建议使用有线网络
- 可以点击取消后重新传输

## 🔄 后续开发计划

- [x] 自定义主题和配色
- [x] WebDAV 配置同步
- [x] 多架构支持（x64/ARM64）
- [x] 版本更新检查
- [ ] 对象存储同步（阿里云 OSS、腾讯云 COS、AWS S3）
- [ ] 更智能的冲突解决策略
- [ ] 更多预设主题
- [ ] 日志记录和导出
- [ ] SSH 隧道/端口转发
- [ ] 批量命令执行
- [ ] 脚本录制和回放
- [ ] 终端分屏功能
- [ ] 文件编辑器集成
- [ ] 连接历史记录

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## � 为什么叫 AnotherSSH？

在众多 SSH 客户端中，我们提供了"另一种选择"（Another way）：
- 更现代的界面设计
- 更直观的操作体验
- 更强大的功能集成
- 完全开源免费

## �📧 联系方式

如有问题或建议，请提交 Issue。

---

**AnotherSSH** - SSH, but better. 🚀

**注意**：首次运行需要安装依赖，请确保已安装 Node.js 和 npm。
