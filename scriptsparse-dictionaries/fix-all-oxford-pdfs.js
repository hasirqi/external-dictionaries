// 统一的改进版Oxford PDF批处理脚本
// 能够处理不同格式的Oxford PDF文件，包括复杂的词性组合
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

// 检测PDF格式类型
async function detectPdfFormat(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    const lines = pdfData.text.split('\n');
    
    // 检查是否包含按CEFR分组的格式 (如 The_Oxford_3000_by_CEFR_level.pdf)
    const hasCefrSections = lines.some(line => /^[ABC][12]$/.test(line.trim()));
    
    // 检查是否包含复杂词性格式 (如 American_Oxford_3000.pdf)
    const hasComplexPos = lines.some(line => 
      /([a-z]+\.\s*[ABC][12](?:,\s*)?)+/.test(line)
    );
    
    if (hasCefrSections && !hasComplexPos) {
      return 'cefr_grouped'; // 按CEFR等级分组的格式
    } else if (hasComplexPos) {
      return 'complex_pos'; // 复杂词性格式
    } else {
      return 'simple'; // 简单格式
    }
  } catch (error) {
    console.error('Error detecting PDF format:', error);
    return 'unknown';
  }
}

// 初始化数据库
function initDB(pdfPath, format) {
  return new Promise((resolve, reject) => {
    const pdfFileName = path.basename(pdfPath, '.pdf');
    const dbPath = path.join(goalDir, `${pdfFileName}_fixed.db`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return reject(err);
      }
      console.log(`Connected to database: ${dbPath}`);
    });

    const tableName = pdfFileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_fixed_entries';
    console.log(`Table name: ${tableName}`);

    db.serialize(() => {
      // 删除现有表
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
        original_line TEXT,
        format_type TEXT
      )`, (err) => {
        if (err) {
          console.error(`Error creating table ${tableName}`, err.message);
          return reject(err);
        }
        console.log(`Table "${tableName}" created.`);
        resolve({ db, tableName, dbPath });
      });
    });
  });
}

// CEFR分组格式解析器 (用于 by_CEFR_level.pdf 文件)
function extractWordsCefrGrouped(text, pdfPath) {
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
    
    // 检测CEFR等级标题行
    if (/^[ABC][12]$/.test(trimmedLine)) {
      currentCefrLevel = trimmedLine;
      continue;
    }
    
    // 解析单词条目
    const wordEntryMatch = trimmedLine.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+([a-z]+(?:\.|,\s*[a-z]+\.)*)\s*$/i);
    
    if (wordEntryMatch) {
      const word = wordEntryMatch[1].trim();
      const pos = wordEntryMatch[2].trim();
      
      if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 1) {
        entries.push({
          word: word.toLowerCase(),
          pos: pos || null,
          cefr_level: currentCefrLevel || null,
          source: path.basename(pdfPath),
          original_line: trimmedLine,
          format_type: 'cefr_grouped'
        });
      }
    }
  }
  
  return entries;
}

// 复杂词性格式解析器 (用于 American_Oxford_3000.pdf 等)
function extractWordsComplexPos(text, pdfPath) {
  const entries = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    // 跳过标题和页脚信息
    if (line.includes('© Oxford University Press') || 
        line.includes('The Oxford 3000™') ||
        line.includes('American English') ||
        line.includes('The Oxford 3000 is the list') ||
        line.includes('from A1 to B2 level') ||
        /^\d+\s*\/\s*\d+$/.test(line) ||
        line === '.' ||
        /^[AB][12]$/.test(line) ||
        /^\d+$/.test(line)) {
      continue;
    }
    
    let parsed = false;
    
    // 模式1: 复杂词性组合，如 "account n. B1, v. B2"
    const complexPattern = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.\s*[ABC][12](?:,\s*)?)+)$/i);
    
    if (complexPattern) {
      const wordPart = complexPattern[1].trim();
      const posAndCefr = complexPattern[2].trim();
      
      const posMatches = posAndCefr.match(/([a-z]+\.)\s*([ABC][12])/gi);
      
      if (posMatches) {
        const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
        
        for (const word of words) {
          if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
            for (const match of posMatches) {
              const [, pos, cefr] = match.match(/([a-z]+\.)\s*([ABC][12])/i);
              entries.push({
                word: word.toLowerCase(),
                pos: pos.trim(),
                cefr_level: cefr.trim(),
                source: path.basename(pdfPath),
                original_line: line,
                format_type: 'complex_pos'
              });
            }
          }
        }
        parsed = true;
      }
    }
    
    // 模式2: 简单格式 "word pos CEFR_level"
    if (!parsed) {
      const simplePattern = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
      
      if (simplePattern) {
        const wordPart = simplePattern[1].trim();
        const pos = simplePattern[2].trim();
        const cefrLevel = simplePattern[3] || null;
        
        const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
        
        for (const word of words) {
          if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
            entries.push({
              word: word.toLowerCase(),
              pos: pos || null,
              cefr_level: cefrLevel,
              source: path.basename(pdfPath),
              original_line: line,
              format_type: 'complex_pos'
            });
          }
        }
        parsed = true;
      }
    }
    
    // 模式3: 特殊格式，如 "all det., pron. A1, adv. A2"
    if (!parsed) {
      const specialPattern = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+(.*)/);
      
      if (specialPattern) {
        const wordPart = specialPattern[1].trim();
        const restPart = specialPattern[2].trim();
        
        if (/[ABC][12]/.test(restPart)) {
          const segments = restPart.split(/,\s*/);
          const wordEntries = [];
          
          let currentPos = '';
          for (const segment of segments) {
            const cefrMatch = segment.match(/([ABC][12])/);
            
            if (cefrMatch) {
              const pos = segment.replace(/[ABC][12]/, '').trim();
              if (pos) {
                currentPos = pos;
              }
              wordEntries.push({
                pos: currentPos,
                cefr_level: cefrMatch[1]
              });
            } else {
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
                    original_line: line,
                    format_type: 'complex_pos'
                  });
                }
              }
            }
            parsed = true;
          }
        }
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
    
    // 检测PDF格式
    const format = await detectPdfFormat(pdfPath);
    console.log(`Detected format: ${format}`);
    
    // 初始化数据库
    dbInfo = await initDB(pdfPath, format);
    db = dbInfo.db;
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      return false;
    }
    
    // 解析PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    console.log(`Successfully parsed PDF: ${path.basename(pdfPath)}`);
    
    // 根据格式选择解析方法
    let entries;
    if (format === 'cefr_grouped') {
      entries = extractWordsCefrGrouped(pdfData.text, pdfPath);
    } else {
      entries = extractWordsComplexPos(pdfData.text, pdfPath);
    }
    
    if (entries.length === 0) {
      console.log('No entries extracted from PDF. Skipping...');
      return false;
    }
    
    console.log(`Extracted ${entries.length} word entries`);
    
    // 显示CEFR分布
    const cefrDistribution = {};
    let noCefrCount = 0;
    entries.forEach(entry => {
      if (entry.cefr_level) {
        cefrDistribution[entry.cefr_level] = (cefrDistribution[entry.cefr_level] || 0) + 1;
      } else {
        noCefrCount++;
      }
    });
    
    console.log('CEFR Distribution:');
    ['A1', 'A2', 'B1', 'B2', 'C1'].forEach(level => {
      if (cefrDistribution[level]) {
        console.log(`  ${level}: ${cefrDistribution[level]} words`);
      }
    });
    if (noCefrCount > 0) {
      console.log(`  No CEFR: ${noCefrCount} words`);
    }
    
    // 插入数据
    const stmt = db.prepare(`INSERT INTO ${dbInfo.tableName} (word, pos, cefr_level, source, original_line, format_type) VALUES (?, ?, ?, ?, ?, ?)`);
    let insertedCount = 0;
    
    for (const entry of entries) {
      await new Promise((resolve, reject) => {
        stmt.run(entry.word, entry.pos, entry.cefr_level, entry.source, entry.original_line, entry.format_type, function(err) {
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

// 主函数：批处理所有需要修复的Oxford PDF文件
async function fixAllOxfordPdfs() {
  console.log('🔧 Starting comprehensive Oxford PDF fix...\n');
  
  const pdfFiles = getOxfordPdfFiles();
  
  if (pdfFiles.length === 0) {
    console.log('No Oxford PDF files found in the directory.');
    return;
  }
  
  // 识别需要修复的文件（文件大小小于50KB的可能有问题）
  const filesToFix = [];
  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile, '.pdf');
    const existingDbPath = path.join(goalDir, `${fileName}.db`);
    
    if (fs.existsSync(existingDbPath)) {
      const stats = fs.statSync(existingDbPath);
      if (stats.size < 50 * 1024) { // 小于50KB
        filesToFix.push(pdfFile);
      }
    } else {
      filesToFix.push(pdfFile);
    }
  }
  
  console.log(`Found ${filesToFix.length} PDF files that need fixing:`);
  filesToFix.forEach((file, index) => {
    console.log(`  ${index + 1}. ${path.basename(file)}`);
  });
  
  let successCount = 0;
  let failCount = 0;
  
  for (const pdfFile of filesToFix) {
    const success = await processPdfFile(pdfFile);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n📊 Fix Summary:');
  console.log(`✅ Successfully fixed: ${successCount} files`);
  console.log(`❌ Failed to fix: ${failCount} files`);
  console.log(`📁 Fixed databases created in: ${goalDir}`);
  
  // 列出修复的数据库文件
  console.log('\n📋 Fixed databases:');
  try {
    const dbFiles = fs.readdirSync(goalDir).filter(file => file.includes('_fixed.db'));
    dbFiles.forEach(file => {
      const filePath = path.join(goalDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  } catch (error) {
    console.error('Error listing database files:', error);
  }
}

// 如果直接运行此脚本，则执行修复
if (require.main === module) {
  fixAllOxfordPdfs().catch(console.error);
}

module.exports = {
  fixAllOxfordPdfs,
  processPdfFile,
  detectPdfFormat
};
