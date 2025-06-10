// 通用同步工具：将任意数据库表的 word 和 cefr_level 字段同步到 dev.db 的 Word 表
// 用法：node sync_cefr_level_to_dev.js --sourceDb "xxx.db" --sourceTable "xxx_entries"

const path = require('path');
const Database = require('better-sqlite3');

// 解析命令行参数
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.findIndex(a => a === name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return def;
}
const sourceDbPath = getArg('--sourceDb');
const sourceTable = getArg('--sourceTable');
if (!sourceDbPath || !sourceTable) {
  console.error('用法: node sync_cefr_level_to_dev.js --sourceDb "xxx.db" --sourceTable "xxx_entries"');
  process.exit(1);
}

const devDbPath = path.join(__dirname, '../goal/dev.db');
const devDb = new Database(devDbPath);
const srcDb = new Database(path.isAbsolute(sourceDbPath) ? sourceDbPath : path.join(__dirname, '../goal', sourceDbPath));

// 获取源表所有 word 和 cefr_level
const srcRows = srcDb.prepare(`SELECT word, cefr_level FROM ${sourceTable}`).all();
// 获取 dev.db 所有 word
const devWordsSet = new Set(devDb.prepare('SELECT word FROM Word').all().map(row => row.word));

let updateCount = 0;
let insertCount = 0;
let unchangedCount = 0;
let updateWords = [];
let insertWords = [];
let unchangedWords = [];

const getCefrStmt = devDb.prepare('SELECT cefr_level FROM Word WHERE word = ?');
const getIdStmt = devDb.prepare('SELECT 1 FROM Word WHERE id = ?');
const updateStmt = devDb.prepare('UPDATE Word SET cefr_level = ? WHERE word = ?');
const insertStmt = devDb.prepare(`INSERT INTO Word (
  id, word, phonetic, definitionEn, definitionZh, example, cefr_level
) VALUES (?, ?, ?, ?, ?, ?, ?)`);

devDb.transaction(() => {
  for (const { word, cefr_level } of srcRows) {
    if (devWordsSet.has(word)) {
      const row = getCefrStmt.get(word);
      if ((row?.cefr_level ?? null) !== cefr_level) {
        updateStmt.run(cefr_level, word);
        updateCount++;
        updateWords.push(word);
      } else {
        unchangedCount++;
        unchangedWords.push(word);
      }
    } else {
      let newId = word;
      while (getIdStmt.get(newId)) {
        newId = word + '_' + Math.floor(Math.random() * 1000000);
      }
      insertStmt.run(newId, word, '', '', '', '', cefr_level);
      insertCount++;
      insertWords.push(word);
    }
  }
})();

devDb.close();
srcDb.close();

console.log(`同步完成：\n  更新 ${updateCount} 条\n  插入 ${insertCount} 条\n  未变更 ${unchangedCount} 条。`);
if (updateCount > 0) console.log('更新的单词：', updateWords.slice(0, 20), updateCount > 20 ? '...等' : '');
if (insertCount > 0) console.log('插入的单词：', insertWords.slice(0, 20), insertCount > 20 ? '...等' : '');
if (unchangedCount > 0) console.log('未变更的单词：', unchangedWords.slice(0, 20), unchangedCount > 20 ? '...等' : '');
