const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

// 批量处理Oxford PDF文件的脚本
// 可以处理指定文件夹中的所有PDF文件，每个PDF生成一个对应的数据库文件

const oxfordDir = path.resolve(__dirname, '../Raw_data/Oxford/');
const outputDir = path.resolve(__dirname, '../goal/');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 从PDF文本中提取单词数据
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
        trimmedLine.includes('The Oxford 5000™') ||
        trimmedLine.includes('American Oxford') ||
        trimmedLine.includes('The Oxford 3000 is the list') ||
        trimmedLine.includes('The Oxford 5000 is the list') ||
        trimmedLine.includes('from A1 to B2 level') ||
        trimmedLine.includes('from A1 to C1 level')) {
      continue;
    }
    
    // 检测CEFR等级标题行 (A1, A2, B1, B2, C1)
    if (/^[ABC][12]$/.test(trimmedLine)) {
      currentCefrLevel = trimmedLine;
      console.log(`Processing CEFR level: ${currentCefrLevel}`);
      continue;
    }
    
    // 解析单词条目：格式为 "word pos" 例如 "about prep., adv."
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
          source: null // 将在调用时设置
        });
      }
    }
  }
  
  return entries;
}

// 初始化数据库
function initDB(dbPath, tableName) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return reject(err);
      }
      console.log('Connected to the SQLite database: ' + dbPath);
    });

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
        resolve(db);
      });
    });
  });
}

// 处理单个PDF文件
async function processPdfFile(pdfPath) {
  const pdfFileName = path.basename(pdfPath, '.pdf');
  const dbPath = path.join(outputDir, `${pdfFileName}.db`);
  const tableName = pdfFileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_entries';
  
  console.log(`\n=== Processing: ${pdfFileName} ===`);
  console.log(`Output database: ${dbPath}`);
  console.log(`Table name: ${tableName}`);
  
  let db;
  try {
    db = await initDB(dbPath, tableName);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`Successfully parsed PDF: ${pdfPath}`);
    
    const entries = extractWordsFromPdfText(pdfData.text);
    
    if (entries.length === 0) {
      console.log('No entries extracted from PDF. Skipping...');
      return { success: false, count: 0 };
    }
    
    // 设置source字段
    entries.forEach(entry => {
      entry.source = path.basename(pdfPath);
    });

    // 准备插入数据库
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
        resolve();
      });
    });
    
    return { success: true, count: insertedCount };

  } catch (error) {
    console.error('❌ An error occurred:', error);
    return { success: false, count: 0 };
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

// 主函数：批量处理所有PDF文件
async function processBatch() {
  console.log('🚀 Starting batch processing of Oxford PDF files...');
  console.log(`Source directory: ${oxfordDir}`);
  console.log(`Output directory: ${outputDir}`);
  
  if (!fs.existsSync(oxfordDir)) {
    console.error('❌ Source directory not found:', oxfordDir);
    return;
  }
  
  // 获取所有PDF文件
  const pdfFiles = fs.readdirSync(oxfordDir)
    .filter(file => file.endsWith('.pdf'))
    .map(file => path.join(oxfordDir, file));
  
  if (pdfFiles.length === 0) {
    console.log('❌ No PDF files found in source directory.');
    return;
  }
  
  console.log(`📚 Found ${pdfFiles.length} PDF files:`);
  pdfFiles.forEach(file => console.log(`  - ${path.basename(file)}`));
  
  const results = [];
  
  for (const pdfFile of pdfFiles) {
    const result = await processPdfFile(pdfFile);
    results.push({
      file: path.basename(pdfFile),
      ...result
    });
  }
  
  // 汇总报告
  console.log('\n📊 === BATCH PROCESSING SUMMARY ===');
  let totalEntries = 0;
  let successCount = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.file}: ${result.count} entries`);
    if (result.success) {
      totalEntries += result.count;
      successCount++;
    }
  });
  
  console.log(`\n🎉 Processing complete!`);
  console.log(`✅ Successfully processed: ${successCount}/${results.length} files`);
  console.log(`📈 Total entries created: ${totalEntries}`);
  console.log(`💾 Database files saved in: ${outputDir}`);
}

// 如果直接运行此脚本，则执行批量处理
if (require.main === module) {
  processBatch().catch(console.error);
}

module.exports = { processPdfFile, processBatch };
