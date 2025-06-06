const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/The_Oxford_3000_by_CEFR_level.pdf');
// 根据PDF文件名生成数据库名称
const pdfFileName = path.basename(pdfPath, '.pdf'); // 去掉扩展名
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

    // 根据PDF文件名生成表名，避免特殊字符
    const tableName = pdfFileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_entries';
    console.log('Table name:', tableName);

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (
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
        console.log(`Table "${tableName}" created or already exists.`);
        resolve({ db, tableName });
      });
    });
  });
}

// 从PDF文本中提取单词数据
// 根据PDF实际格式优化的解析逻辑
function extractWordsFromPdfText(text) {
  const entries = [];
  const lines = text.split('\n');
  
  let currentCefrLevel = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;
    
    // 跳过PDF头部信息
    if (trimmedLine.includes('© Oxford University Press') || 
        trimmedLine.includes('The Oxford 3000™') ||
        trimmedLine.includes('The Oxford 3000 is the list') ||
        trimmedLine.includes('from A1 to B2 level')) {
      continue;
    }
    
    // 检测CEFR等级标题行 (A1, A2, B1, B2)
    if (/^[AB][12]$/.test(trimmedLine)) {
      currentCefrLevel = trimmedLine;
      console.log(`Processing CEFR level: ${currentCefrLevel}`);
      continue;
    }
    
    // 解析单词条目：格式为 "word pos" 例如 "about prep., adv."
    // 使用正则表达式匹配：单词 + 空格 + 词性
    const wordEntryMatch = trimmedLine.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+([a-z]+(?:\.|,\s*[a-z]+\.)*)\s*$/i);
    
    if (wordEntryMatch) {
      const word = wordEntryMatch[1].trim();
      const pos = wordEntryMatch[2].trim();
      
      // 验证这确实是一个有效的单词（不包含数字或特殊字符）
      if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 1) {
        entries.push({
          word: word.toLowerCase(), // 统一转为小写
          pos: pos || null,
          cefr_level: currentCefrLevel || null,
          source: path.basename(pdfPath)
        });
      }
    }
  }
  
  console.log(`Extracted ${entries.length} valid word entries from PDF text.`);
  console.log(`Sample entries:`, entries.slice(0, 5));
  return entries;
}


async function parsePdfAndInsertToDb() {
  let db;
  let tableName;
  try {
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
    console.log('PDF Text (first 1000 chars):', pdfData.text.substring(0, 1000)); // 用于调试PDF内容

    const entries = extractWordsFromPdfText(pdfData.text);

    if (entries.length === 0) {
      console.log('No entries extracted from PDF. Please check PDF content and parsing logic in extractWordsFromPdfText.');
      return;
    }

    // 准备插入数据库 - 使用动态表名
    const stmt = db.prepare(`INSERT INTO ${tableName} (word, pos, cefr_level, source) VALUES (?, ?, ?, ?)`);
    let insertedCount = 0;
    let skippedCount = 0;

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
            console.log(`Insertion complete. Inserted: ${insertedCount}, Skipped (if duplicate check enabled): ${skippedCount}`);
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
