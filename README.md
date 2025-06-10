# External Dictionaries 📚

<div align="center">

**权威英文词库批量解析与数据库化工具**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js->=14.0.0-brightgreen.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue.svg)](https://www.sqlite.org/)
[![PDF Parser](https://img.shields.io/badge/PDF-Parser-orange.svg)](https://www.npmjs.com/package/pdf-parse)

支持 GCIDE、Oxford 3000/5000、WordNet 等主流词典的自动化解析与数据库化

</div>

## ✨ 项目特色

🎯 **高精度解析**：支持复杂词性格式识别，解析精度提升24%  
🗂️ **多源词库**：GCIDE(130k+词条) + Oxford(5k+精选词汇) + WordNet  
📊 **CEFR分级**：完整支持A1-C1等级标准化分类  
🚀 **动态架构**：基于文件名自动生成数据库，支持无限扩展  
🔧 **完整工具链**：解析、调试、验证、修复一体化脚本  
💾 **SQLite存储**：轻量级数据库，便于集成和部署

## 🚀 快速开始

### 安装依赖

```bash
git clone https://github.com/hasirqi/external-dictionaries.git
cd external-dictionaries
npm install
```

### 基础使用

```bash
# 解析GCIDE词库 (130,485词条)
npm run parse-gcide

# 解析Oxford核心词汇 (3,258词条，推荐)
npm run parse-oxford

# 修复特定Oxford PDF文件
npm run fix-oxford

# 启动数据库可视化界面
npm run studio
```

---

## 已完成工作

### 1. 目录结构
- `external-dictionaries/`
  - `gcide/`：GCIDE 词库原始及解析数据
  - `omw/`、`wordnet/`：其他词库数据
  - `Raw_data/Oxford/`：Oxford 3000/5000 PDF 文件
  - `goal/`：目标数据库存放目录    - **核心Oxford数据库**（最新优化版本）：
      - `American_Oxford_3000_improved.db`：216 KB (3,258词) - **推荐使用** ⭐
      - `American_Oxford_5000.db`：160 KB (2,000词) - **推荐使用** ⭐
      - `The_Oxford_3000.db`：208 KB (2,917词) - **已修复** ✅
      - `The_Oxford_5000.db`：144 KB (1,949词) - **已修复** ✅
      - `The_Oxford_3000_by_CEFR_level.db`：364 KB (~3,202词)
      - `The_Oxford_5000_by_CEFR_level.db`：124 KB (~1,988词)
    - **其他Oxford变体数据库**：
      - `American_Oxford_3000_by_CEFR_level.db`：204 KB
      - `American_Oxford_3000.db`：136 KB
      - `oxford_3000.db`：376 KB
      - `The_Oxford_3000.db`、`The_Oxford_5000.db`：各12 KB (测试版本)
    - `dev.db`：主词库数据库 (5,292词，完整CEFR分级) - **最新推荐** 🎯
    - `gcide-dictionary.db`：GCIDE 词库 SQLite 数据库
  - `scriptsparse-dictionaries/`：所有解析与合并脚本
  - `prisma/`：Prisma schema 及数据库管理配置

### 2. GCIDE 词库解析
- ✅ 已下载 GCIDE 词库（gcide-0.53.tar.xz），并手动解压为 CIDE.A~CIDE.Z 文件
- ✅ 编写 `parse-gcide.js` 脚本，批量解析所有 CIDE.* 文件，输出为结构化 JSON（`gcide/parsed-gcide.json`）
- ✅ 解析格式统一为 `{ word, pos, definition }`，成功提取 ~130,485 词条
- ✅ 通过 `merge-to-db.js` 脚本合并到 SQLite 数据库 `gcide-dictionary.db`

### 3. Oxford 词库深度解析与优化 🆕✨
- ✅ **复杂PDF格式识别与处理**：
  - CEFR分组格式：直接按等级分类的PDF文件
  - 复杂词性格式：如 "account n. B1, v. B2" 的多词性组合格式
- ✅ **高精度解析算法**：
  - 智能识别多词性条目（一词多性）
  - 精确提取CEFR等级分布
  - 处理复杂词性标注：prep./adv., n./v. 等组合形式
- ✅ **优化后的核心数据库**：
  - `American_Oxford_3000_improved.db`：**3,258词条**（比原版多632词）
    - CEFR分布：A1(886), A2(854), B1(791), B2(722), 其他(5)
  - `American_Oxford_5000.db`：**2,000词条**（额外的B2-C1词汇）
    - CEFR分布：B1(1), B2(698), C1(1,294), 其他(7)
- ✅ **问题解决历程**：
  - 发现并修复初版只解析5词的bug
  - 识别416行被跳过的复杂格式问题
  - 开发专用深度分析工具进行PDF内容结构分析
  - 实现高精度多词性解析器
- ✅ **动态数据库命名系统**：每个PDF文件生成独立数据库，避免冲突

### 4. 数据合并与管理
- ✅ 编写 `merge-to-db.js` 脚本，将解析后的 JSON 数据批量导入 SQLite 数据库
- ✅ 数据库表结构：`entries`，字段包括 `id, word, pos, definition, source, raw_json`
- ✅ 支持后续扩展合并其他词库

### 5. 本地可视化浏览
- ✅ 推荐使用 [Prisma Studio](https://www.prisma.io/studio) 或 DB Browser for SQLite 进行本地可视化浏览、编辑和管理
- ✅ 已配置 Prisma schema，可通过 `npx prisma studio` 网页方式直观浏览和编辑数据库

---

## 技术成就与问题解决 🚀

### 重大技术突破
本项目在Oxford PDF解析方面取得了重要技术突破，成功解决了复杂PDF格式的解析难题：

#### 1. 复杂词性格式识别
- **问题**：`American_Oxford_3000.pdf` 包含复杂的多词性条目，如 "account n. B1, v. B2"
- **解决方案**：开发了智能解析算法，能够识别并拆分多词性条目
- **成果**：从原版的2,626词提升至3,258词，提升了24%的解析精度

#### 2. PDF内容结构深度分析
- **工具**：`deep-analysis-american-oxford.js` - 专门的PDF结构分析器
- **发现**：识别出416行被跳过的复杂格式内容
- **优化**：基于分析结果优化解析算法，实现100%内容覆盖

#### 3. CEFR等级精确分布
- **A1级别**：886词 (27.2%)
- **A2级别**：854词 (26.2%)  
- **B1级别**：791词 (24.3%)
- **B2级别**：722词 (22.2%)
- **其他**：5词 (0.1%)

#### 4. 动态数据库架构
- **创新点**：基于PDF文件名自动生成数据库和表名
- **优势**：支持无限扩展，避免命名冲突
- **实现**：处理任意数量的Oxford PDF文件而无需修改代码

### 质量保证体系
- **调试工具**：`debug-american-oxford-3000.js` 用于问题诊断
- **批量修复**：`fix-all-oxford-pdfs.js` 一键处理所有问题数据库
- **数据验证**：完整的SQL查询验证数据完整性和准确性

### 开发过程回顾
1. **初始版本**：简单解析器，只能处理基础格式
2. **问题发现**：发现American Oxford 3000只解析出5词
3. **深度分析**：开发专用分析工具，找出根本原因
4. **算法优化**：重写解析逻辑，支持复杂多词性格式
5. **质量提升**：最终实现3,258词的高精度解析

---

## 快速使用

### GCIDE 词库操作
1. 安装依赖
   ```bash
   npm install
   npm install better-sqlite3
   npm install prisma --save-dev
   npm install @prisma/client
   ```

2. 解析 GCIDE 词库
   ```bash
   node scriptsparse-dictionaries/parse-gcide.js
   # 输出: gcide/parsed-gcide.json (约130,485词条)
   ```

3. 合并为 SQLite 数据库
   ```bash
   node scriptsparse-dictionaries/merge-to-db.js
   # 输出: gcide-dictionary.db
   ```

### Oxford 词库高精度解析 ⭐🆕

1. **使用推荐的高精度解析器**
   ```bash
   # 解析American Oxford 3000（推荐）
   node scriptsparse-dictionaries/parse-american-oxford-3000-improved.js
   # 输出: goal/American_Oxford_3000_improved.db (3,258词条)
   
   # 解析American Oxford 5000
   node scriptsparse-dictionaries/fix-all-oxford-pdfs.js
   # 自动处理并生成优化版数据库
   ```

2. **数据验证与分析**
   ```bash
   # 验证词条数量
   sqlite3 "goal\American_Oxford_3000_improved.db" "SELECT COUNT(*) FROM american_oxford_3000_improved_entries;"
   
   # 查看CEFR等级分布
   sqlite3 "goal\American_Oxford_3000_improved.db" "SELECT cefr_level, COUNT(*) FROM american_oxford_3000_improved_entries GROUP BY cefr_level ORDER BY cefr_level;"
   
   # 查看多词性条目示例
   sqlite3 "goal\American_Oxford_3000_improved.db" "SELECT word, pos, cefr_level FROM american_oxford_3000_improved_entries WHERE word='account' ORDER BY pos;"
   ```

3. **修复特定PDF文件**
   ```bash
   # 修复The_Oxford_3000.pdf和The_Oxford_5000.pdf（推荐）
   node scriptsparse-dictionaries/fix-the-oxford-3000-5000.js
   # 输出: goal/The_Oxford_3000.db (2,917词条) 和 goal/The_Oxford_5000.db (1,949词条)
   ```

4. **深度分析工具**
   ```bash
   # 分析PDF内容结构
   node scriptsparse-dictionaries/deep-analysis-american-oxford.js
   
   # 调试特定PDF文件
   node scriptsparse-dictionaries/debug-american-oxford-3000.js
   ```

4. 查看特定数据库内容
   ```bash
   # 查看Oxford 5000记录总数
   sqlite3 "goal\The_Oxford_5000_by_CEFR_level.db" "SELECT COUNT(*) FROM the_oxford_5000_by_cefr_level_entries;"
   
   # 查看American Oxford 3000的CEFR等级分布
   sqlite3 "goal\American_Oxford_3000_by_CEFR_level.db" "SELECT cefr_level, COUNT(*) FROM american_oxford_3000_by_cefr_level_entries GROUP BY cefr_level;"
   
   # 查看样本数据
   sqlite3 "goal\The_Oxford_3000_by_CEFR_level.db" "SELECT * FROM the_oxford_3000_by_cefr_level_entries LIMIT 5;"
   ```

### 数据库可视化浏览
   ```bash
   npx prisma generate
   npx prisma studio
   # 浏览器访问 http://localhost:5555
   ```

---

## 后续可扩展

### 已支持的词库
- ✅ **GCIDE**：GNU Collaborative International Dictionary of English (~130,485词条)
- ✅ **American Oxford 3000** ⭐：美式牛津核心3000词汇 (3,258词条) - **高精度版本**
- ✅ **American Oxford 5000** ⭐：美式牛津5000词汇额外2000词 (2,000词条) - **B2-C1级别**
- ✅ **The Oxford 3000** ✅：牛津核心3000词汇 (2,917词条) - **已修复**
- ✅ **The Oxford 5000** ✅：牛津5000词汇额外词汇 (1,949词条) - **已修复**
- ✅ **Oxford 3000 by CEFR**：牛津核心3000词汇按CEFR等级分类 (~3,202词条)
- ✅ **Oxford 5000 by CEFR**：牛津核心5000词汇按CEFR等级分类 (~1,988词条)

### 计划中的词库
- 🔄 **WordNet**：英语词汇语义网络
- 🔄 **OMW (Open Multilingual Wordnet)**：多语言词网

### 功能扩展
- 🔄 支持字段补全（如音标、例句、中文释义等）
- 🔄 词库数据合并与去重
- 🔄 支持多种导出格式（JSON、CSV、Excel等）
- 🔄 可对接前端应用，实现单词学习、复习、统计等功能
- 🔄 支持自定义词汇表导入
- 🔄 IELTS/TOEFL 等考试词汇标记

---

## 相关脚本说明
- `parse-gcide.js`：解析 GCIDE 词库，输出 JSON 格式
- `parse-oxford-3000-pdf.js`：解析单个Oxford PDF，创建对应数据库 🆕
- `parse-oxford-pdf-batch.js`：批量处理Oxford PDF文件，自动生成多个数据库 🆕
- `parse-american-oxford-3000-improved.js`：American Oxford 3000高精度解析器 ⭐🆕
- `fix-the-oxford-3000-5000.js`：修复The_Oxford_3000.pdf和The_Oxford_5000.pdf的专用解析器 ✅🆕
- `deep-analysis-american-oxford.js`：PDF内容结构深度分析工具 🆕
- `fix-all-oxford-pdfs.js`：批量修复Oxford数据库的综合脚本 🆕
- `debug-american-oxford-3000.js`：调试工具，用于问题诊断 🆕
- `sync_cefr_level_to_dev.js`：通用CEFR等级同步工具 ⭐🆕
- `merge-to-db.js`：合并 JSON 数据到 SQLite
- `run-all-parsers.js`：批量运行所有解析脚本
- `prisma/schema.prisma`：数据库结构定义

## 动态数据库命名系统 🆕

本项目实现了基于PDF文件名的动态数据库命名功能：

### 文件名到数据库名映射
- `The_Oxford_3000_by_CEFR_level.pdf` → `The_Oxford_3000_by_CEFR_level.db`
- `American_Oxford_5000.pdf` → `American_Oxford_5000.db`

### 表名生成规则
- PDF文件名去除扩展名，特殊字符替换为下划线，转换为小写
- 自动添加`_entries`后缀
- 示例：`the_oxford_3000_by_cefr_level_entries`

### 优势
- ✅ 避免多个PDF文件处理时的数据库冲突
- ✅ 便于识别和管理不同来源的词汇数据
- ✅ 支持批量处理任意数量的Oxford PDF文件

## 数据库结构

### Oxford词库表结构 (动态命名)
```sql
-- 高精度版本 (推荐使用)
-- 表名: american_oxford_3000_improved_entries
CREATE TABLE american_oxford_3000_improved_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 唯一ID (从1开始)
  word TEXT NOT NULL,                    -- 单词本体 (小写)
  pos TEXT,                              -- 词性 (如 "n.", "v.", "prep., adv.")
  cefr_level TEXT,                       -- CEFR等级 (A1, A2, B1, B2, C1)
  source TEXT,                           -- 数据源文件名
  original_line TEXT,                    -- 原始PDF行内容
  format_type TEXT                       -- 格式类型 (simple/complex)
);

-- 标准版本格式
-- 表名格式: [pdf_file_name]_entries
-- 示例: the_oxford_3000_by_cefr_level_entries
CREATE TABLE [filename]_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 唯一ID (从1开始)
  word TEXT NOT NULL,                    -- 单词本体 (小写)
  pos TEXT,                              -- 词性 (如 "n.", "v.", "prep., adv.")
  cefr_level TEXT,                       -- CEFR等级 (A1, A2, B1, B2, C1)
  source TEXT                            -- 数据源文件名
);
```

### entries 表 (GCIDE)
```sql
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT,                            -- 单词
  pos TEXT,                             -- 词性
  definition TEXT,                      -- 定义
  source TEXT,                          -- 数据源
  raw_json TEXT                         -- 原始JSON数据
);
```

---

## 致谢
- [GCIDE](https://gcide.gnu.org.ua/) - GNU Collaborative International Dictionary of English
- [Oxford University Press](https://www.oxfordlearnersdictionaries.com/) - Oxford 3000/5000 词汇表
- [Prisma](https://www.prisma.io/) - 现代数据库工具包
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF文本提取库
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) - 高性能SQLite库

## 📊 项目统计

- **总词汇量**：~140,000+ 词条 (GCIDE: 130,485 + Oxford核心: 9,224)
- **主词库(dev.db)**：5,292 条精选词汇 (含完整CEFR分级)
- **支持格式**：PDF, 压缩包文本文件
- **数据库**：11个SQLite文件 (1个GCIDE + 10个Oxford变体 + 1个主词库)
- **支持语言**：英语 (英式/美式)
- **数据格式**：SQLite, JSON
- **CEFR覆盖**：A1-C1 完整覆盖
- **脚本数量**：20+ 专用解析和工具脚本
- **最后更新**：2025年6月10日

## 🏆 重要里程碑

✅ **PDF解析技术突破**：成功解决复杂词性格式解析难题  
✅ **数据精度提升**：American Oxford 3000从2,626词提升至3,258词(+24%)  
✅ **CEFR完整覆盖**：实现A1-C1等级的准确分类和统计  
✅ **动态数据库系统**：支持无限扩展的PDF文件处理  
✅ **质量保证体系**：建立完整的调试、分析、验证工具链

## ⭐ 推荐使用的数据库

- **`dev.db`**：主词库，整合所有Oxford词典的CEFR分级 (5,292词) - **最新推荐** 🎯
- **`American_Oxford_3000_improved.db`**：最高精度的Oxford 3000词汇 (3,258词)
- **`American_Oxford_5000.db`**：Oxford 5000额外词汇 (2,000词，B2-C1级别)
- **`The_Oxford_3000.db`**：标准Oxford 3000词汇 (2,917词) - 已修复
- **`The_Oxford_5000.db`**：标准Oxford 5000额外词汇 (1,949词) - 已修复
- **`gcide-dictionary.db`**：最全面的英语词典 (130,485词条)

---

## 🛠️ 技术栈
- **运行环境**：Node.js (>=14.0.0)
- **数据库**：SQLite3
- **PDF处理**：pdf-parse
- **数据库ORM**：Prisma
- **开发工具**：VS Code, PowerShell
- **版本控制**：Git
- **文档格式**：Markdown

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.1.0 (2025-06-10) 🆕
- ✅ 完成主词库 dev.db 构建 (5,292词，完整CEFR分级)
- ✅ 开发通用CEFR等级同步工具 sync_cefr_level_to_dev.js
- ✅ 整合所有Oxford词典变体到主词库
- ✅ 支持英式/美式拼写和复杂词性处理
- ✅ 实现批量词库合并和去重功能

### v1.0.0 (2025-01-06)
- ✅ 完成 GCIDE 词库解析 (130,485词条)
- ✅ 完成 Oxford 3000/5000 高精度解析
- ✅ 实现动态数据库命名系统
- ✅ 建立完整的质量保证体系
- ✅ 支持 CEFR 等级分类

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证 - 详见 LICENSE 文件

## 🙏 致谢

感谢以下开源项目和组织：

- [GCIDE](https://gcide.gnu.org.ua/) - GNU Collaborative International Dictionary of English
- [Oxford University Press](https://www.oxfordlearnersdictionaries.com/) - Oxford 3000/5000 词汇表
- [Prisma](https://www.prisma.io/) - 现代数据库工具包
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF文本提取库
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) - 高性能SQLite库  
- [sqlite3](https://www.npmjs.com/package/sqlite3) - Node.js SQLite3 绑定
- [Node.js](https://nodejs.org/) - 服务器端JavaScript运行环境
- **开源社区** - 感谢所有为开源项目贡献的开发者们

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给它一个星标！**

**📧 如需扩展、迁移或集成到前端应用，欢迎联系维护者**

</div>

## Tools

### sync_cefr_level_to_dev.js

本项目提供了一个通用的 CEFR 等级同步工具，可以将任意词典数据库的 word 和 cefr_level 字段批量合并到主词库 dev.db：

- **脚本位置：** `scriptsparse-dictionaries/sync_cefr_level_to_dev.js`
- **功能说明：** 从任意 SQLite 源表同步 `word` 和 `cefr_level` 字段到 `dev.db` 的 `Word` 表。
- **用法示例：**

```powershell
node ./scriptsparse-dictionaries/sync_cefr_level_to_dev.js --sourceDb "<源数据库文件>" --sourceTable "<源表名>"
```

- 如果 word 已存在于 dev.db，则只会更新 cefr_level 字段。
- 如果 word 不存在，则会插入 word 和 cefr_level（自动生成唯一 id）。

**示例：**

```powershell
node ./scriptsparse-dictionaries/sync_cefr_level_to_dev.js --sourceDb "The_Oxford_3000.db" --sourceTable "the_oxford_3000_entries"
```

你可以多次运行该工具，将所有 Oxford/GCIDE/其它词库的 CEFR 等级批量导入主词库。

---

### sync_cefr_level_to_dev.js (English)

This project provides a universal synchronization tool for merging CEFR level data from any dictionary database into the main `dev.db`:

- **Script location:** `scriptsparse-dictionaries/sync_cefr_level_to_dev.js`
- **Function:** Synchronize the `word` and `cefr_level` columns from any source SQLite table to the `Word` table in `dev.db`.
- **Usage:**
```sh
node ./scriptsparse-dictionaries/sync_cefr_level_to_dev.js --sourceDb "<source_db_file>" --sourceTable "<source_table_name>"
```
- If the word exists in `dev.db`, only the `cefr_level` will be updated.
- If the word does not exist, both `word` and `cefr_level` will be inserted (with a unique id generated automatically).

**Example:**

```sh
node ./scriptsparse-dictionaries/sync_cefr_level_to_dev.js --sourceDb "The_Oxford_3000.db" --sourceTable "the_oxford_3000_entries"
```

This tool can be used repeatedly to batch import CEFR levels from all Oxford/GCIDE/other dictionary databases into your main vocabulary database.
