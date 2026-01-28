# AnotherSSH Assets

这个目录包含 AnotherSSH 的所有品牌资源。

## 文件列表

- `logo.svg` - 矢量 Logo
- `logo.png` - PNG Logo (1024x1024)
- `DESIGN.md` - 设计说明文档
- `icon.icns` - macOS 应用图标
- `icon.ico` - Windows 应用图标
- `icon.png` - Linux 应用图标

## 快速开始

### 1. 生成图标

使用在线工具最简单：
1. 访问 https://icon.kitchen/
2. 上传 `logo.svg`
3. 下载生成的图标包
4. 将文件放到此目录

### 2. 或使用命令行

```bash
# 安装 electron-icon-builder
npm install -g electron-icon-builder

# 首先将 SVG 转换为高分辨率 PNG
# 使用 Inkscape 或在线工具转换 logo.svg 为 logo.png (1024x1024)

# 然后生成所有平台图标
electron-icon-builder --input=./logo.png --output=.
```

## 当前状态

- ✅ logo.svg - 已创建
- ✅ logo.png - 已创建
- ✅ DESIGN.md - 已创建
- ✅ icon.icns - 已生成 (macOS)
- ✅ icon.ico - 已生成 (Windows)
- ✅ icon.png - 已生成 (Linux)

## 注意事项

生成图标后，记得在 `package.json` 中确认图标路径配置正确。
