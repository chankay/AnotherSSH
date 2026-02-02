#!/bin/bash

# 测试 CHANGELOG 提取脚本
# 用法: ./scripts/test-changelog.sh [版本号]
# 示例: ./scripts/test-changelog.sh 1.0.10

VERSION=${1:-"1.0.10"}

echo "=========================================="
echo "测试提取版本 ${VERSION} 的 CHANGELOG"
echo "=========================================="
echo ""

# 提取指定版本的 changelog
# 使用 sed 提取，从版本标题行到下一个版本标题行之间的内容
START_LINE=$(grep -n "^## \[${VERSION}\] -" CHANGELOG.md | cut -d: -f1)

if [ -z "$START_LINE" ]; then
  echo "❌ 未找到版本 ${VERSION} 的 CHANGELOG"
  echo ""
  echo "提示：请确保 CHANGELOG.md 中存在以下格式的版本标题："
  echo "## [${VERSION}] - YYYY-MM-DD"
  echo ""
  echo "当前 CHANGELOG.md 中的版本标题："
  grep "^## \[" CHANGELOG.md | head -5
  exit 1
fi

# 找到下一个版本标题的行号
NEXT_LINE=$(tail -n +$((START_LINE + 1)) CHANGELOG.md | grep -n "^## \[" | head -1 | cut -d: -f1)

if [ -z "$NEXT_LINE" ]; then
  # 如果没有下一个版本，提取到文件末尾
  CHANGELOG=$(tail -n +$((START_LINE + 1)) CHANGELOG.md)
else
  # 提取到下一个版本之前
  END_LINE=$((START_LINE + NEXT_LINE - 1))
  CHANGELOG=$(sed -n "$((START_LINE + 1)),${END_LINE}p" CHANGELOG.md)
fi

# 移除开头和结尾的空行
CHANGELOG=$(echo "$CHANGELOG" | sed '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')

if [ -z "$CHANGELOG" ]; then
  echo "❌ 版本 ${VERSION} 的 CHANGELOG 内容为空"
  exit 1
fi

echo "✅ 成功提取 CHANGELOG："
echo ""
echo "----------------------------------------"
echo "$CHANGELOG"
echo "----------------------------------------"
echo ""
CHAR_COUNT=$(echo "$CHANGELOG" | wc -c | tr -d ' ')
LINE_COUNT=$(echo "$CHANGELOG" | wc -l | tr -d ' ')
echo "字符数: $CHAR_COUNT"
echo "行数: $LINE_COUNT"
echo ""
echo "✅ CHANGELOG 提取测试通过！"
echo ""
echo "这些内容将在创建 GitHub Release 时自动显示。"
