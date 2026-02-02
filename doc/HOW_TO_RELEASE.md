# 如何发布新版本

## 快速步骤

### 1. 更新 CHANGELOG.md

在文件顶部添加新版本内容：

```markdown
## [1.0.11] - 2025-02-03

### Added
- 新增功能描述

### Fixed
- 修复问题描述
```

### 2. 更新 package.json

```json
{
  "version": "1.0.11"
}
```

### 3. 测试 CHANGELOG

```bash
./scripts/test-changelog.sh 1.0.11
```

### 4. 提交并推送标签

```bash
git add .
git commit -m "chore: bump version to 1.0.11"
git tag v1.0.11
git push && git push origin v1.0.11
```

### 5. 等待自动构建

GitHub Actions 会自动：
- ✅ 构建所有平台版本
- ✅ 从 CHANGELOG.md 提取版本更新内容
- ✅ 创建 GitHub Release（包含更新说明）
- ✅ 上传所有安装包
- ✅ 同步到 Gitee

## 查看结果

- GitHub: https://github.com/chankay/AnotherSSH/releases
- Gitee: https://gitee.com/chankay/AnotherSSH/releases

## 详细文档

查看完整指南：[RELEASE_GUIDE.md](RELEASE_GUIDE.md)
