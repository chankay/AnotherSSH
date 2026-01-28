# AnotherSSH Logo 设计说明

## 设计理念

AnotherSSH 的 Logo 设计融合了以下元素：

1. **字母 "A"** - 代表 "Another"，是品牌的核心标识
2. **终端符号** - 命令提示符 ">" 和闪烁光标，象征 SSH 终端
3. **连接感** - 整体设计传达"连接"的概念
4. **现代感** - 渐变色和简洁的几何形状

## 配色方案

### 主色调
- **深蓝色**: `#0e639c` - 专业、可靠、技术感
- **亮蓝色**: `#1177bb` - 现代、活力
- **青绿色**: `#4ec9b0` - 连接成功、活跃状态

### 渐变
- 背景渐变：从 `#0e639c` 到 `#1177bb`
- 提示符渐变：从 `#4ec9b0` 到 `#0e639c`

## Logo 变体

### 1. 完整版（带文字）
```
   ╱‾‾‾╲
  ╱  >  ╲
 ╱_______╲
 
AnotherSSH
```

### 2. 图标版（仅图形）
```
   ╱‾‾‾╲
  ╱  >  ╲
 ╱_______╲
```

### 3. 简化版（小尺寸）
```
  ●━━━●
```

## 使用场景

- **应用图标**: 512x512px, 256x256px, 128x128px, 64x64px, 32x32px, 16x16px
- **启动画面**: 1024x1024px
- **文档**: SVG 矢量格式
- **网站**: PNG 透明背景

## 文件格式

### 需要生成的图标文件

1. **macOS**
   - `icon.icns` (包含多种尺寸)
   - 尺寸: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024

2. **Windows**
   - `icon.ico` (包含多种尺寸)
   - 尺寸: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

3. **Linux**
   - `icon.png` (多个尺寸)
   - 尺寸: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512

## 生成图标步骤

### 使用在线工具
1. 访问 https://www.icoconverter.com/ 或 https://cloudconvert.com/
2. 上传 `logo.svg` 文件
3. 选择目标格式（icns, ico, png）
4. 下载并放置到 `assets/` 目录

### 使用命令行工具

#### macOS (生成 .icns)
```bash
# 安装 iconutil (macOS 自带)
mkdir icon.iconset
sips -z 16 16     logo.png --out icon.iconset/icon_16x16.png
sips -z 32 32     logo.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     logo.png --out icon.iconset/icon_32x32.png
sips -z 64 64     logo.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   logo.png --out icon.iconset/icon_128x128.png
sips -z 256 256   logo.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   logo.png --out icon.iconset/icon_256x256.png
sips -z 512 512   logo.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   logo.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 logo.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

#### Windows (生成 .ico)
```bash
# 使用 ImageMagick
convert logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### Linux (生成 .png)
```bash
# 使用 ImageMagick 或 Inkscape
inkscape -w 512 -h 512 logo.svg -o icon.png
```

## 品牌使用规范

### 最小尺寸
- 图标最小显示尺寸：16x16px
- Logo（带文字）最小宽度：120px

### 留白空间
- 图标周围至少保留 10% 的留白空间
- 文字 Logo 周围至少保留 20% 的留白空间

### 禁止事项
- ❌ 不要改变配色方案
- ❌ 不要拉伸或压缩 Logo
- ❌ 不要添加阴影或特效
- ❌ 不要在低对比度背景上使用

## 快速生成工具

如果你想快速生成所有格式的图标，可以使用：

### 方法 1: electron-icon-builder
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./assets/logo.png --output=./assets
```

### 方法 2: 在线工具
- https://icon.kitchen/ - 一键生成所有平台图标
- https://www.img2icns.com/ - PNG 转 ICNS
- https://convertio.co/png-ico/ - PNG 转 ICO

## 设计师信息

如果需要专业设计师优化 Logo，可以提供以下信息：
- 品牌名称：AnotherSSH
- Slogan: Another way to connect
- 核心元素：终端、连接、字母 A
- 配色：蓝色系 (#0e639c, #1177bb, #4ec9b0)
- 风格：现代、简洁、专业
