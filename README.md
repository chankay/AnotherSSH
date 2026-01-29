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
- ✅ 终端分屏（2-4 个，支持水平/垂直/网格布局）
- ✅ 批量命令执行（同步输入模式）

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
- ✅ 日志文件同步（可选）

### 版本更新
- ✅ 自动检查更新
- ✅ 手动检查更新
- ✅ 版本号显示
- ✅ 一键跳转下载

### 日志管理
- ✅ 会话日志自动记录
- ✅ 日志查看和搜索
- ✅ 日志导出功能
- ✅ 日志文件管理
- ✅ 会话时长统计

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

完整的使用说明请查看 **[用户使用手册](doc/USER_MANUAL.md)**

### 快速开始

1. **新建连接**：点击"新建连接"，填写主机、端口、用户名和密码/密钥
2. **保存会话**：勾选"保存此会话配置"以便下次快速连接
3. **快速连接**：双击已保存的会话即可连接
4. **SFTP 传输**：点击标签页上的 📁 图标打开文件管理器

### 核心功能

- **终端分屏**：`Ctrl/Cmd + Shift + D/E` 创建 2-4 个分屏，同时操作多台服务器
- **批量命令**：点击"同步输入"按钮，同时向多个终端发送命令
- **终端搜索**：`Ctrl/Cmd + F` 在终端中搜索文本
- **字体调整**：`Ctrl/Cmd + +/-/0` 快速调整终端字体大小
- **会话分组**：创建分组管理会话，支持折叠/展开（状态自动保存）
- **标签颜色**：为不同环境设置不同颜色标识
- **配置同步**：使用 WebDAV 在多设备间同步配置

### 更多文档

- **[用户使用手册](doc/USER_MANUAL.md)** - 完整的功能说明和使用指南
- **[主题配置](THEMES.md)** - 11 款预设主题和自定义主题
- **[WebDAV 同步](WEBDAV_SYNC.md)** - 配置云端同步
- **[发布指南](RELEASE.md)** - 开发者发布流程

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
- `logs/` - 会话日志文件夹

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

## � 许可证发

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🎯 为什么选择 AnotherSSH？

在众多 SSH 客户端中，我们提供了"另一种选择"（Another way）。

### 开发初衷

在多平台工作场景下（macOS、Windows、Linux），我们需要一个：
- **跨平台通用**：一套工具在所有系统上使用体验一致
- **简单易用**：无需复杂配置，开箱即用
- **功能完整**：SSH 连接、文件传输、会话管理一应俱全
- **完全免费**：开源免费，无任何限制

### 我们的特色

- 🎨 **现代化界面**：深色主题、11 款预设配色、自定义主题
- 🚀 **高效操作**：终端分屏、批量命令、快捷键支持
- 📁 **文件管理**：图形化 SFTP、拖拽上传、批量下载
- 🔄 **配置同步**：WebDAV 云端同步，多设备无缝切换
- 🔐 **安全可靠**：密码加密存储、SSH2 协议、密钥认证
- 💾 **会话管理**：分组管理、标签颜色、搜索过滤
- � **日志记录**：自动记录会话日志，方便回溯

**AnotherSSH** = 简单 + 易用 + 强大 🚀

## 📧 联系方式

如有问题或建议，请提交 Issue。

---

**注意**：首次运行需要安装依赖，请确保已安装 Node.js 和 npm。

