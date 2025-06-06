// 改进的 American_Oxford_3000.pdf 解析器 - 处理复杂词性格式
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_3000.pdf');
const pdfFileName = path.basename(pdfPath, '.pdf');
const dbPath = path.resolve(__dirname, `../goal/${pdfFileName}_improved.db`);

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

    const tableName = pdfFileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_improved_entries';
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
        source TEXT,
        original_line TEXT
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

// 改进的解析函数 - 处理复杂的词性和CEFR等级组合
function extractWordsFromAmericanOxfordTextImproved(text) {
  const entries = [];
  const lines = text.split('\n');
  let processedLines = 0;
  let skippedLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    // 跳过标题和页脚信息
    if (line.includes('© Oxford University Press') || 
        line.includes('The Oxford 3000™') ||
        line.includes('American English') ||
        line.includes('The Oxford 3000 is the list') ||
        line.includes('from A1 to B2 level') ||
        /^\d+\s*\/\s*\d+$/.test(line) || // 页码 "1 / 11"
        line === '.' ||
        /^[AB][12]$/.test(line) || // 单独的CEFR等级行
        /^\d+$/.test(line)) { // 纯数字页码
      continue;
    }
    
    let parsed = false;
    
    // 模式1: 处理复杂词性组合，如 "account n. B1, v. B2"
    const complexPattern = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.\s*[ABC][12](?:,\s*)?)+)$/i);
    
    if (complexPattern) {
      const wordPart = complexPattern[1].trim();
      const posAndCefr = complexPattern[2].trim();
      
      // 解析词性和CEFR组合，如 "n. B1, v. B2"
      const posMatches = posAndCefr.match(/([a-z]+\.)\s*([ABC][12])/gi);
      
      if (posMatches) {
        // 处理多个单词（用逗号分隔）
        const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
        
        for (const word of words) {
          if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
            // 为每个词性创建一个条目
            for (const match of posMatches) {
              const [, pos, cefr] = match.match(/([a-z]+\.)\s*([ABC][12])/i);
              entries.push({
                word: word.toLowerCase(),
                pos: pos.trim(),
                cefr_level: cefr.trim(),
                source: path.basename(pdfPath),
                original_line: line
              });
            }
          }
        }
        parsed = true;
        processedLines++;
      }
    }
    
    // 模式2: 简单格式 "word pos CEFR_level"
    if (!parsed) {
      const simplePattern = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
      
      if (simplePattern) {
        const wordPart = simplePattern[1].trim();
        const pos = simplePattern[2].trim();
        const cefrLevel = simplePattern[3] || null;
        
        // 处理多个单词（用逗号分隔）
        const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
        
        for (const word of words) {
          if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
            entries.push({
              word: word.toLowerCase(),
              pos: pos || null,
              cefr_level: cefrLevel,
              source: path.basename(pdfPath),
              original_line: line
            });
          }
        }
        parsed = true;
        processedLines++;
      }
    }
    
    // 模式3: 处理特殊格式，如 "all det., pron. A1, adv. A2"
    if (!parsed) {
      const specialPattern = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+(.*)/);
      
      if (specialPattern) {
        const wordPart = specialPattern[1].trim();
        const restPart = specialPattern[2].trim();
        
        // 查找是否包含CEFR等级
        if (/[ABC][12]/.test(restPart)) {
          // 尝试分割词性和CEFR等级
          const segments = restPart.split(/,\s*/);
          const wordEntries = [];
          
          let currentPos = '';
          for (const segment of segments) {
            const cefrMatch = segment.match(/([ABC][12])/);
            
            if (cefrMatch) {
              // 这个段包含CEFR等级
              const pos = segment.replace(/[ABC][12]/, '').trim();
              if (pos) {
                currentPos = pos;
              }
              wordEntries.push({
                pos: currentPos,
                cefr_level: cefrMatch[1]
              });
            } else {
              // 这个段只是词性
              currentPos = segment.trim();
            }
          }
          
          if (wordEntries.length > 0) {
            const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
            
            for (const word of words) {
              if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
                for (const entry of wordEntries) {
                  entries.push({
                    word: word.toLowerCase(),
                    pos: entry.pos || null,
                    cefr_level: entry.cefr_level,
                    source: path.basename(pdfPath),
                    original_line: line
                  });
                }
              }
            }
            parsed = true;
            processedLines++;
          }
        }
      }
    }
      if (!parsed) {
      skippedLines++;
      if (skippedLines <= 10) { // 只显示前10个跳过的行
        console.log(`跳过行 ${i + 1}: "${line}"`);
      }
    }
  }
  
  console.log(`\n处理统计:`);
  console.log(`- 成功处理的行: ${processedLines}`);
  console.log(`- 跳过的行: ${skippedLines}`);
  console.log(`- 提取的词条: ${entries.length}`);
  
  // 显示CEFR等级分布
  const cefrDistribution = {};
  let noCefrCount = 0;
  entries.forEach(entry => {
    if (entry.cefr_level) {
      cefrDistribution[entry.cefr_level] = (cefrDistribution[entry.cefr_level] || 0) + 1;
    } else {
      noCefrCount++;
    }
  });
  
  console.log(`\nCEFR等级分布:`);
  ['A1', 'A2', 'B1', 'B2', 'C1'].forEach(level => {
    if (cefrDistribution[level]) {
      console.log(`${level}: ${cefrDistribution[level]} 词条`);
    }
  });
  console.log(`无CEFR等级: ${noCefrCount} 词条`);
  
  console.log(`\n样本词条 (前10个):`);
  entries.slice(0, 10).forEach(entry => {
    console.log(`"${entry.word}" (${entry.pos}) [${entry.cefr_level || 'N/A'}]`);
  });
  
  return entries;
}

async function parsePdfAndInsertToDb() {
  let db;
  let tableName;
  try {
    console.log('开始改进解析American Oxford 3000 PDF...');
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

    const entries = extractWordsFromAmericanOxfordTextImproved(pdfData.text);

    if (entries.length === 0) {
      console.log('No entries extracted from PDF.');
      return;
    }

    // 插入数据库
    const stmt = db.prepare(`INSERT INTO ${tableName} (word, pos, cefr_level, source, original_line) VALUES (?, ?, ?, ?, ?)`);
    let insertedCount = 0;

    for (const entry of entries) {
      stmt.run(entry.word, entry.pos, entry.cefr_level, entry.source, entry.original_line, function(err) {
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
            console.log(`\n✅ Insertion complete. Inserted: ${insertedCount} entries`);
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
