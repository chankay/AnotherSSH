#!/bin/bash

# Gitee Release 手动同步脚本
# 用法: ./scripts/sync-to-gitee.sh <version> <gitee_token>
# 示例: ./scripts/sync-to-gitee.sh 1.0.10 your_gitee_token

set -e

VERSION=${1}
GITEE_TOKEN=${2}

if [ -z "$VERSION" ] || [ -z "$GITEE_TOKEN" ]; then
  echo "用法: $0 <version> <gitee_token>"
  echo "示例: $0 1.0.10 your_gitee_token"
  echo "       $0 v1.0.10 your_gitee_token"
  exit 1
fi

# 移除版本号前的 v 前缀（如果有）
VERSION_NUM="${VERSION#v}"
TAG_NAME="v${VERSION_NUM}"
RELEASE_NAME="v${VERSION_NUM}"

echo "=========================================="
echo "同步 ${TAG_NAME} 到 Gitee"
echo "=========================================="
echo ""

# 1. 提取 CHANGELOG
echo "📝 提取 CHANGELOG..."
START_LINE=$(grep -n "^## \[${VERSION_NUM}\] -" CHANGELOG.md | cut -d: -f1)

if [ -z "$START_LINE" ]; then
  echo "⚠️  未找到版本 ${VERSION_NUM} 的 CHANGELOG，使用默认描述"
  CHANGELOG="Release version ${VERSION_NUM}"
else
  NEXT_LINE=$(tail -n +$((START_LINE + 1)) CHANGELOG.md | grep -n "^## \[" | head -1 | cut -d: -f1)
  
  if [ -z "$NEXT_LINE" ]; then
    CHANGELOG=$(tail -n +$((START_LINE + 1)) CHANGELOG.md)
  else
    END_LINE=$((START_LINE + NEXT_LINE - 1))
    CHANGELOG=$(sed -n "$((START_LINE + 1)),${END_LINE}p" CHANGELOG.md)
  fi
  
  CHANGELOG=$(echo "$CHANGELOG" | sed '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')
  
  if [ -z "$CHANGELOG" ]; then
    CHANGELOG="Release version ${VERSION_NUM}"
  fi
fi

echo "✅ CHANGELOG 提取完成"
echo ""

# 2. 检查 Release 是否已存在
echo "🔍 检查 Gitee Release 是否已存在..."
EXISTING_RELEASE=$(curl -k -s "https://gitee.com/api/v5/repos/chankay/AnotherSSH/releases/tags/${TAG_NAME}?access_token=${GITEE_TOKEN}")
EXISTING_ID=$(echo "$EXISTING_RELEASE" | jq -r '.id')

if [ "$EXISTING_ID" != "null" ] && [ -n "$EXISTING_ID" ]; then
  echo "⚠️  Release 已存在 (ID: $EXISTING_ID)，删除旧版本..."
  curl -k -X DELETE "https://gitee.com/api/v5/repos/chankay/AnotherSSH/releases/${EXISTING_ID}?access_token=${GITEE_TOKEN}"
  sleep 2
  echo "✅ 旧版本已删除"
fi
echo ""

# 3. 创建 Gitee Release
echo "🚀 创建 Gitee Release..."
RELEASE_BODY=$(echo "$CHANGELOG" | jq -Rs .)

RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "https://gitee.com/api/v5/repos/chankay/AnotherSSH/releases" \
  -H "Content-Type: application/json" \
  -d "{
    \"access_token\": \"${GITEE_TOKEN}\",
    \"tag_name\": \"${TAG_NAME}\",
    \"name\": \"${RELEASE_NAME}\",
    \"body\": ${RELEASE_BODY},
    \"prerelease\": false,
    \"target_commitish\": \"main\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
  echo "❌ 创建 Gitee Release 失败 (HTTP ${HTTP_CODE})"
  echo "响应: $BODY"
  exit 1
fi

RELEASE_ID=$(echo "$BODY" | jq -r '.id')
echo "✅ Gitee Release 创建成功 (ID: $RELEASE_ID)"
echo ""

# 4. 从 GitHub 下载 Release 文件
echo "📥 从 GitHub 下载 Release 文件..."
mkdir -p /tmp/anotherssh-release
cd /tmp/anotherssh-release

# 获取 GitHub Release 信息，最多重试 3 次
MAX_RETRIES=3
RETRY_COUNT=0
GITHUB_RELEASE=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  GITHUB_RELEASE=$(curl -s "https://api.github.com/repos/chankay/AnotherSSH/releases/tags/${TAG_NAME}")
  ASSETS=$(echo "$GITHUB_RELEASE" | jq -r '.assets[]? | "\(.name)|\(.browser_download_url)"' 2>/dev/null)
  
  if [ -n "$ASSETS" ]; then
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "  ⏳ GitHub Release 文件尚未准备好，等待 10 秒后重试 ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 10
  fi
done

if [ -z "$ASSETS" ]; then
  echo "⚠️  GitHub Release 中没有找到文件"
  echo "请确保 GitHub Release 已创建并包含文件"
  echo "您可以稍后手动运行此脚本重试"
  exit 1
fi

# 下载所有文件
echo "$ASSETS" | while IFS='|' read -r name url; do
  echo "  下载: $name"
  curl -L -o "$name" "$url"
done

echo "✅ 文件下载完成"
echo ""

# 5. 上传文件到 Gitee
echo "📤 上传文件到 Gitee..."
for file in *; do
  if [ -f "$file" ]; then
    filesize=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    echo "  上传: $file ($(numfmt --to=iec-i --suffix=B $filesize 2>/dev/null || echo ${filesize} bytes))"
    
    UPLOAD_RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST \
      "https://gitee.com/api/v5/repos/chankay/AnotherSSH/releases/${RELEASE_ID}/attach_files" \
      -F "access_token=${GITEE_TOKEN}" \
      -F "file=@${file}")
    
    UPLOAD_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
    
    if [ "$UPLOAD_CODE" = "201" ]; then
      echo "    ✅ 上传成功"
    else
      echo "    ⚠️  上传失败 (HTTP ${UPLOAD_CODE})"
      echo "    响应: $(echo "$UPLOAD_RESPONSE" | sed '$d')"
    fi
  fi
done

# 清理临时文件
cd -
rm -rf /tmp/anotherssh-release

echo ""
echo "=========================================="
echo "✅ 同步完成！"
echo "🔗 https://gitee.com/chankay/AnotherSSH/releases/${TAG_NAME}"
echo "=========================================="
