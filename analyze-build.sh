#!/bin/bash

# 分析打包后的文件大小
echo "=== 分析打包文件大小 ==="
echo ""

if [ -d "dist/mac" ]; then
  echo "macOS 应用大小:"
  du -sh dist/mac/*.app
  echo ""
fi

if [ -d "dist/mac-arm64" ]; then
  echo "macOS ARM64 应用大小:"
  du -sh dist/mac-arm64/*.app
  echo ""
fi

if [ -f "dist/*.dmg" ]; then
  echo "DMG 文件大小:"
  ls -lh dist/*.dmg
  echo ""
fi

if [ -f "dist/*.exe" ]; then
  echo "Windows 文件大小:"
  ls -lh dist/*.exe
  echo ""
fi

if [ -f "dist/*.AppImage" ]; then
  echo "Linux 文件大小:"
  ls -lh dist/*.AppImage
  echo ""
fi

echo "=== node_modules 最大的包 ==="
du -sh node_modules/* | sort -hr | head -10
