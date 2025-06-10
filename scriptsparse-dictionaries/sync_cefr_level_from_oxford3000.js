// 自动同步 The_Oxford_3000.db 的 the_oxford_3000_entries 表到 dev.db 的 Word 表
// 1. word 存在则只更新 cefr_level
// 2. word 不存在则插入 word 和 cefr_level

const path = require('path');
const Database = require('better-sqlite3');

const devDbPath = path.join(__dirname, '../goal/dev.db');
const oxfordDbPath = path.join(__dirname, '../goal/The_Oxford_3000.db');

const devDb = new Database(devDbPath);
const oxfordDb = new Database(oxfordDbPath);

// 获取 oxford 3000 所有 word 和 cefr_level
const oxfordRows = oxfordDb.prepare('SELECT word, cefr_level FROM the_oxford_3000_entries').all();

// 获取 dev.db 所有 word
const devWordsSet = new Set(
  devDb.prepare('SELECT word FROM Word').all().map(row => row.word)
);

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
  for (const { word, cefr_level } of oxfordRows) {
    if (devWordsSet.has(word)) {
      // 只更新 cefr_level，不动 id
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
      // 插入时生成唯一 id，word 作为主键部分，避免与已有 id 冲突
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
oxfordDb.close();

console.log(`同步完成：\n  更新 ${updateCount} 条\n  插入 ${insertCount} 条\n  未变更 ${unchangedCount} 条。`);
if (updateCount > 0) console.log('更新的单词：', updateWords.slice(0, 20), updateCount > 20 ? '...等' : '');
if (insertCount > 0) console.log('插入的单词：', insertWords.slice(0, 20), insertCount > 20 ? '...等' : '');
if (unchangedCount > 0) console.log('未变更的单词：', unchangedWords.slice(0, 20), unchangedCount > 20 ? '...等' : '');
