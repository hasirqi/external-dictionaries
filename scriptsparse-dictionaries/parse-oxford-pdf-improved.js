// 改进的Oxford PDF批处理脚本 - 支持多种格式
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const oxfordDir = path.resolve(__dirname, '../Raw_data/Oxford');
const goalDir = path.resolve(__dirname, '../goal');

// 获取Oxford目录中的所有PDF文件
function getOxfordPdfFiles() {
  try {
    const files = fs.readdirSync(oxfordDir);
    const pdfFiles = files.filter(file => 
      file.toLowerCase().endsWith('.pdf') && 
      (file.includes('Oxford') || file.includes('oxford'))
    );
    return pdfFiles.map(file => path.join(oxfordDir, file));
  } catch (error) {
    console.error('Error reading Oxford directory:', error);
    return [];
  }
}

// 初始化数据库
function initDB(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfFileName = path.basename(pdfPath, '.pdf');
    const dbPath = path.join(goalDir, `${pdfFileName}.db`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return reject(err);
      }
    });

    const tableName = pdfFileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_entries';

    db.serialize(() => {
      // 删除现有表
      db.run(`DROP TABLE IF EXISTS ${tableName}`, (err) => {
        if (err && !err.message.includes('no such table')) {
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
        resolve({ db, tableName, dbPath });
      });
    });
  });
}

// 检测PDF格式类型
function detectPdfFormat(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 检查是否按CEFR等级分组（如 The_Oxford_3000_by_CEFR_level.pdf）
  let hasGroupedCefr = false;
  let hasInlineCefr = false;
  
  for (let i = 0; i < Math.min(100, lines.length); i++) {
    const line = lines[i];
    
    // 检查是否有单独的CEFR等级行
    if (/^[ABC][12]$/.test(line)) {
      hasGroupedCefr = true;
    }
    
    // 检查是否有内联CEFR等级（如 "abandon v. B2"）
    if (/^[a-zA-Z][a-zA-Z\s,\-']*?\s+[a-z]+\.\s*[ABC][12]\s*$/i.test(line)) {
      hasInlineCefr = true;
    }
  }
  
  if (hasInlineCefr) {
    return 'inline_cefr'; // American_Oxford_3000.pdf 格式
  } else if (hasGroupedCefr) {
    return 'grouped_cefr'; // The_Oxford_3000_by_CEFR_level.pdf 格式
  } else {
    return 'unknown';
  }
}

// 解析内联CEFR格式（如 American_Oxford_3000.pdf）
function extractWordsFromInlineCefrText(text, pdfPath) {
  const entries = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;
    
    // 跳过标题和页脚信息
    if (trimmedLine.includes('© Oxford University Press') || 
        trimmedLine.includes('The Oxford 3000™') ||
        trimmedLine.includes('The Oxford 5000™') ||
        trimmedLine.includes('American English') ||
        trimmedLine.includes('The Oxford 3000 is the list') ||
        trimmedLine.includes('The Oxford 5000 is the list') ||
        trimmedLine.includes('from A1 to B2 level') ||
        trimmedLine.includes('from A1 to C1 level') ||
        /^\d+\s*\/\s*\d+$/.test(trimmedLine) ||
        trimmedLine === '.' ||
        /^[AB][12]$/.test(trimmedLine)) {
      continue;
    }
    
    // 解析格式：word[, word2] pos [CEFR_level]
    const wordEntryMatch = trimmedLine.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
    
    if (wordEntryMatch) {
      const wordPart = wordEntryMatch[1].trim();
      const pos = wordEntryMatch[2].trim();
      const cefrLevel = wordEntryMatch[3] || null;
      
      // 处理多个单词（用逗号分隔）
      const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
      
      for (const word of words) {
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
  
  return entries;
}

// 解析分组CEFR格式（如 The_Oxford_3000_by_CEFR_level.pdf）
function extractWordsFromGroupedCefrText(text, pdfPath) {
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
        trimmedLine.includes('The Oxford 3000 is the list') ||
        trimmedLine.includes('The Oxford 5000 is the list') ||
        trimmedLine.includes('from A1 to B2 level') ||
        trimmedLine.includes('from A1 to C1 level')) {
      continue;
    }
    
    // 检测CEFR等级标题行 (A1, A2, B1, B2, C1)
    if (/^[ABC][12]$/.test(trimmedLine)) {
      currentCefrLevel = trimmedLine;
      continue;
    }
    
    // 解析单词条目：格式为 "word pos" 例如 "about prep., adv."
    const wordEntryMatch = trimmedLine.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+([a-z]+(?:\.|,\s*[a-z]+\.)*)\s*$/i);
    
    if (wordEntryMatch) {
      const word = wordEntryMatch[1].trim();
      const pos = wordEntryMatch[2].trim();
      
      // 验证这确实是一个有效的单词
      if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 1) {
        entries.push({
          word: word.toLowerCase(),
          pos: pos || null,
          cefr_level: currentCefrLevel || null,
          source: path.basename(pdfPath)
        });
      }
    }
  }
  
  return entries;
}

// 处理单个PDF文件
async function processPdfFile(pdfPath) {
  let db;
  let dbInfo;
  
  try {
    console.log(`\n=== Processing: ${path.basename(pdfPath)} ===`);
    
    // 初始化数据库
    dbInfo = await initDB(pdfPath);
    db = dbInfo.db;
    
    // 检查PDF文件是否存在
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      return false;
    }
    
    // 解析PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    console.log(`Successfully parsed PDF: ${path.basename(pdfPath)}`);
    
    // 检测PDF格式
    const format = detectPdfFormat(pdfData.text);
    console.log(`Detected format: ${format}`);
    
    // 根据格式选择解析方法
    let entries = [];
    if (format === 'inline_cefr') {
      entries = extractWordsFromInlineCefrText(pdfData.text, pdfPath);
    } else if (format === 'grouped_cefr') {
      entries = extractWordsFromGroupedCefrText(pdfData.text, pdfPath);
    } else {
      console.log('Unknown PDF format, trying both methods...');
      entries = extractWordsFromInlineCefrText(pdfData.text, pdfPath);
      if (entries.length < 100) {
        console.log('Inline method failed, trying grouped method...');
        entries = extractWordsFromGroupedCefrText(pdfData.text, pdfPath);
      }
    }
    
    if (entries.length === 0) {
      console.log('No entries extracted from PDF. Skipping...');
      return false;
    }
    
    console.log(`Extracted ${entries.length} entries`);
    
    // 插入数据
    const stmt = db.prepare(`INSERT INTO ${dbInfo.tableName} (word, pos, cefr_level, source) VALUES (?, ?, ?, ?)`);
    let insertedCount = 0;
    
    for (const entry of entries) {
      await new Promise((resolve, reject) => {
        stmt.run(entry.word, entry.pos, entry.cefr_level, entry.source, function(err) {
          if (err) {
            console.error('Error inserting entry:', entry, err.message);
            return reject(err);
          }
          insertedCount++;
          resolve();
        });
      });
    }
    
    await new Promise((resolve, reject) => {
      stmt.finalize((err) => {
        if (err) {
          console.error('Error finalizing statement:', err.message);
          return reject(err);
        }
        console.log(`✅ Successfully processed ${path.basename(pdfPath)}`);
        console.log(`   - Inserted: ${insertedCount} entries`);
        console.log(`   - Database: ${dbInfo.dbPath}`);
        console.log(`   - Table: ${dbInfo.tableName}`);
        resolve();
      });
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(pdfPath)}:`, error);
    return false;
  } finally {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database', err.message);
        }
      });
    }
  }
}

// 主函数：批处理所有Oxford PDF文件
async function processAllOxfordPdfs() {
  console.log('🚀 Starting improved batch processing of Oxford PDF files...\n');
  
  const pdfFiles = getOxfordPdfFiles();
  
  if (pdfFiles.length === 0) {
    console.log('No Oxford PDF files found in the directory.');
    return;
  }
  
  console.log(`Found ${pdfFiles.length} Oxford PDF files:`);
  pdfFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${path.basename(file)}`);
  });
  
  let successCount = 0;
  let failCount = 0;
  
  for (const pdfFile of pdfFiles) {
    const success = await processPdfFile(pdfFile);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n📊 Batch Processing Summary:');
  console.log(`✅ Successfully processed: ${successCount} files`);
  console.log(`❌ Failed to process: ${failCount} files`);
  console.log(`📁 Databases created in: ${goalDir}`);
  
  // 列出创建的数据库文件和记录统计
  console.log('\n📋 Database Statistics:');
  try {
    const dbFiles = fs.readdirSync(goalDir).filter(file => file.endsWith('.db') && file.includes('Oxford'));
    
    for (const file of dbFiles) {
      const filePath = path.join(goalDir, file);
      const stats = fs.statSync(filePath);
      
      // 连接数据库获取记录数
      const db = new sqlite3.Database(filePath);
      const tableName = file.replace('.db', '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_entries';
      
      await new Promise((resolve) => {
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
          const count = err ? 'Error' : row.count;
          console.log(`  - ${file}: ${(stats.size / 1024).toFixed(2)} KB (${count} entries)`);
          db.close();
          resolve();
        });
      });
    }
  } catch (error) {
    console.error('Error listing database files:', error);
  }
}

// 如果直接运行此脚本，则执行批处理
if (require.main === module) {
  processAllOxfordPdfs().catch(console.error);
}

module.exports = {
  processAllOxfordPdfs,
  processPdfFile,
  getOxfordPdfFiles,
  detectPdfFormat
};
