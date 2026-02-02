# 发布新版本指南

本文档说明如何发布 AnotherSSH 的新版本，以及如何在 GitHub Releases 中自动显示版本更新内容。

## 📝 准备工作

### 1. 更新 CHANGELOG.md

在发布新版本之前，需要在 `CHANGELOG.md` 中添加版本更新内容。

**格式要求**：
```markdown
## [版本号] - YYYY-MM-DD

### Added
- 新增功能 1
- 新增功能 2

### Changed
- 修改内容 1
- 修改内容 2

### Fixed
- 修复问题 1
- 修复问题 2

### Documentation
- 文档更新 1
- 文档更新 2
```

**示例**：
```markdown
## [1.0.10] - 2025-02-02

### Added

#### 完整的应用菜单栏
- **文件菜单**：新建连接、新建分组、导入/导出配置、设置、退出
- **编辑菜单**：撤销/重做、剪切/复制/粘贴、查找、清屏
- 所有主要功能都有快捷键支持

### Fixed
- 修复 Windows 下查看日志失败的问题
- 修复默认分组的识别和分配逻辑
```

**重要提示**：
- 版本号格式必须是 `## [X.Y.Z] - YYYY-MM-DD`
- 日期格式必须是 `YYYY-MM-DD`
- 版本号必须用方括号 `[]` 包裹
- 标题必须以 `## ` 开头（两个井号 + 空格）

### 2. 更新 package.json

修改 `package.json` 中的版本号：

```json
{
  "name": "anotherssh",
  "version": "1.0.10",
  ...
}
```

### 3. 测试 CHANGELOG 提取

使用测试脚本验证 CHANGELOG 格式是否正确：

```bash
./scripts/test-changelog.sh 1.0.10
```

如果格式正确，会显示：
```
✅ 成功提取 CHANGELOG：

----------------------------------------
[提取的内容]
----------------------------------------

✅ CHANGELOG 提取测试通过！
```

如果格式错误，会显示错误信息和修复建议。

## 🚀 发布流程

### 方式 1：使用 Git 标签（推荐）

1. **提交所有更改**：
   ```bash
   git add .
   git commit -m "chore: bump version to 1.0.10"
   ```

2. **创建并推送标签**：
   ```bash
   git tag v1.0.10
   git push && git push origin v1.0.10
   ```

3. **自动构建和发布**：
   - GitHub Actions 会自动触发
   - 构建 macOS、Windows、Linux 版本
   - 从 CHANGELOG.md 提取版本更新内容
   - 创建 GitHub Release 并上传安装包
   - 自动同步到 Gitee（包括 Release 和附件）

### 方式 2：手动创建 Release

如果需要手动创建 Release：

1. 访问 [GitHub Releases](https://github.com/chankay/AnotherSSH/releases)
2. 点击 "Draft a new release"
3. 选择标签或创建新标签（如 `v1.0.10`）
4. 从 CHANGELOG.md 复制对应版本的内容到 Release 描述
5. 上传构建好的安装包
6. 点击 "Publish release"

## 📋 CHANGELOG 格式说明

### 版本标题格式

```markdown
## [版本号] - 日期
```

- `版本号`：遵循语义化版本规范（如 1.0.10）
- `日期`：格式为 YYYY-MM-DD（如 2025-02-02）

### 更新类型

使用以下标准分类：

- **Added**：新增功能
- **Changed**：功能修改或优化
- **Deprecated**：即将废弃的功能
- **Removed**：已移除的功能
- **Fixed**：Bug 修复
- **Security**：安全相关更新
- **Documentation**：文档更新
- **Performance**：性能优化

### 编写建议

1. **使用清晰的描述**：
   - ✅ 好：修复 Windows 下查看日志失败的问题
   - ❌ 差：修复 bug

2. **分组相关功能**：
   ```markdown
   #### 完整的应用菜单栏
   - **文件菜单**：新建连接、新建分组、导入/导出配置
   - **编辑菜单**：撤销/重做、剪切/复制/粘贴
   ```

3. **突出重要功能**：
   - 使用粗体标记关键词
   - 使用子标题组织大功能

4. **提供技术细节**（可选）：
   ```markdown
   - 修复 Windows 路径问题（使用 data-log-path 属性存储路径）
   ```

## 🔍 验证发布

### 检查 GitHub Release

1. 访问 [Releases 页面](https://github.com/chankay/AnotherSSH/releases)
2. 确认新版本已创建
3. 检查 Release 描述是否正确显示 CHANGELOG 内容
4. 确认所有平台的安装包都已上传

### 检查 Gitee Release

1. 访问 [Gitee Releases](https://gitee.com/chankay/AnotherSSH/releases)
2. 确认新版本已同步
3. 检查 Release 描述和附件

### 测试安装包

下载并测试各平台的安装包：
- macOS (x64 和 arm64)
- Windows (x64)
- Linux (x64 和 arm64)

## 🛠️ 故障排除

### CHANGELOG 提取失败

**问题**：GitHub Actions 日志显示 "未找到版本的 CHANGELOG"

**解决方法**：
1. 检查 CHANGELOG.md 中的版本标题格式
2. 确保格式为 `## [X.Y.Z] - YYYY-MM-DD`
3. 运行测试脚本验证：`./scripts/test-changelog.sh X.Y.Z`

### Release 创建失败

**问题**：GitHub Actions 构建成功但 Release 创建失败

**解决方法**：
1. 检查 GitHub Token 权限
2. 确认标签格式正确（必须以 `v` 开头）
3. 查看 Actions 日志获取详细错误信息

### Gitee 同步失败

**问题**：GitHub Release 创建成功但 Gitee 同步失败

**解决方法**：
1. 检查 `GITEE_TOKEN` secret 是否配置
2. 确认 Gitee 仓库存在且有写入权限
3. 查看 Actions 日志中的 Gitee API 响应

## 📚 参考资源

- [Keep a Changelog](https://keepachangelog.com/) - CHANGELOG 格式规范
- [Semantic Versioning](https://semver.org/) - 语义化版本规范
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Gitee API 文档](https://gitee.com/api/v5/swagger)

## 💡 最佳实践

1. **定期更新 CHANGELOG**：
   - 每次合并重要功能时更新
   - 不要等到发布时才写

2. **使用有意义的版本号**：
   - 主版本号：不兼容的 API 修改
   - 次版本号：向下兼容的功能性新增
   - 修订号：向下兼容的问题修正

3. **保持 CHANGELOG 简洁**：
   - 面向用户，不是开发者
   - 突出重要变化
   - 技术细节可以放在括号中

4. **测试后再发布**：
   - 本地测试所有功能
   - 使用测试脚本验证 CHANGELOG
   - 确认构建成功

5. **及时修复问题**：
   - 如果发现问题，立即发布修复版本
   - 在 CHANGELOG 中说明修复内容

---

**提示**：如有问题，请查看 `.github/workflows/release.yml` 中的详细配置。
