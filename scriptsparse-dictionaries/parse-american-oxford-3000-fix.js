// 专门处理 American_Oxford_3000.pdf 格式的解析脚本
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_3000.pdf');
const pdfFileName = path.basename(pdfPath, '.pdf');
const dbPath = path.resolve(__dirname, `../goal/${pdfFileName}.db`);

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return reject(err);
      }
      console.log('Connected to the SQLite database: ' + dbPath);
    });

    const tableName = pdfFileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_entries';
    console.log('Table name:', tableName);

    db.serialize(() => {
      // 先删除现有表
      db.run(`DROP TABLE IF EXISTS ${tableName}`, (err) => {
        if (err) {
          console.error(`Error dropping table ${tableName}`, err.message);
        }
      });
      
      // 创建新表
      db.run(`CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        pos TEXT,
        cefr_level TEXT,
        source TEXT
      )`, (err) => {
        if (err) {
          console.error(`Error creating table ${tableName}`, err.message);
          return reject(err);
        }
        console.log(`Table "${tableName}" created.`);
        resolve({ db, tableName });
      });
    });
  });
}

// 解析American Oxford格式的PDF文本
function extractWordsFromAmericanOxfordText(text) {
  const entries = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;
    
    // 跳过标题和页脚信息
    if (trimmedLine.includes('© Oxford University Press') || 
        trimmedLine.includes('The Oxford 3000™') ||
        trimmedLine.includes('American English') ||
        trimmedLine.includes('The Oxford 3000 is the list') ||
        trimmedLine.includes('from A1 to B2 level') ||
        /^\d+\s*\/\s*\d+$/.test(trimmedLine) || // 页码 "1 / 11"
        trimmedLine === '.' ||
        /^[AB][12]$/.test(trimmedLine)) { // 单独的CEFR等级行
      continue;
    }
    
    // 解析格式：word[, word2] pos [CEFR_level]
    // 例子：
    // "a, an indefinite article A1"
    // "abandon v. B2" 
    // "about prep., adv. A1"
    // "act v. A2, n. B1"
    
    // 匹配模式：单词(含逗号和空格) + 词性 + 可选的CEFR等级
    const wordEntryMatch = trimmedLine.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
    
    if (wordEntryMatch) {
      const wordPart = wordEntryMatch[1].trim();
      const pos = wordEntryMatch[2].trim();
      const cefrLevel = wordEntryMatch[3] || null;
      
      // 处理多个单词（用逗号分隔）
      const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
      
      for (const word of words) {
        // 验证单词有效性
        if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
          entries.push({
            word: word.toLowerCase(),
            pos: pos || null,
            cefr_level: cefrLevel,
            source: path.basename(pdfPath)
          });
        }
      }
    }
  }
  
  console.log(`Extracted ${entries.length} valid word entries from PDF text.`);
  console.log(`Sample entries:`, entries.slice(0, 10));
  return entries;
}

async function parsePdfAndInsertToDb() {
  let db;
  let tableName;
  try {
    console.log('开始解析American Oxford 3000 PDF...');
    const dbResult = await initDB();
    db = dbResult.db;
    tableName = dbResult.tableName;
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      return;
    }
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    console.log(`Successfully parsed PDF: ${pdfPath}`);

    const entries = extractWordsFromAmericanOxfordText(pdfData.text);

    if (entries.length === 0) {
      console.log('No entries extracted from PDF.');
      return;
    }

    // 插入数据库
    const stmt = db.prepare(`INSERT INTO ${tableName} (word, pos, cefr_level, source) VALUES (?, ?, ?, ?)`);
    let insertedCount = 0;

    for (const entry of entries) {
      stmt.run(entry.word, entry.pos, entry.cefr_level, entry.source, function(err) {
        if (err) {
          console.error('Error inserting entry:', entry, err.message);
        } else {
          insertedCount++;
        }
      });
    }
    
    await new Promise((resolve, reject) => {
        stmt.finalize((err) => {
            if (err) {
                console.error('Error finalizing statement:', err.message);
                return reject(err);
            }
            console.log(`✅ Insertion complete. Inserted: ${insertedCount} entries`);
            console.log(`Database saved as: ${dbPath}`);
            console.log(`Table name: ${tableName}`);
            resolve();
        });
    });

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database', err.message);
        } else {
          console.log('Database connection closed.');
        }
      });
    }
  }
}

parsePdfAndInsertToDb();
