// merge-to-db.js
// 解析后的 JSON 词库合并为 SQLite 数据库，保留所有元数据
// 用法：node scriptsparse-dictionaries/merge-to-db.js

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 词库 JSON 文件路径，可扩展
const sources = [
  { name: 'gcide', file: '../gcide/parsed-gcide.json' },
  // 其他词库可在此添加
];

const dbPath = path.resolve(__dirname, '../gcide-dictionary.db'); // 修改数据库文件名
const db = new Database(dbPath);

// 创建表，保留所有元数据字段
function createTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT,
      pos TEXT,
      definition TEXT,
      source TEXT,
      raw_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_word ON entries(word);
  `);
}

function insertEntry(entry, source) {
  const stmt = db.prepare(`INSERT INTO entries (word, pos, definition, source, raw_json) VALUES (?, ?, ?, ?, ?)`);
  stmt.run(
    entry.word || null,
    entry.pos || null,
    entry.definition || null,
    source,
    JSON.stringify(entry)
  );
}

function importSource({ name, file }) {
  const absPath = path.resolve(__dirname, file);
  if (!fs.existsSync(absPath)) {
    console.warn(`未找到文件: ${absPath}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(absPath, 'utf-8'));
  if (!Array.isArray(data)) {
    console.warn(`文件内容不是数组: ${absPath}`);
    return;
  }
  data.forEach(entry => insertEntry(entry, name));
  console.log(`${name} 导入完成，共 ${data.length} 条`);
}

function main() {
  createTable();
  sources.forEach(importSource);
  db.close();
  console.log('所有词库合并完成，输出: gcide-dictionary.db');
}

main();
