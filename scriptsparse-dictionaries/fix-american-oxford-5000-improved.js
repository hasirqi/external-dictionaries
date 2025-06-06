// 改进的American_Oxford_5000.pdf解析器
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_5000.pdf');
const dbPath = path.resolve(__dirname, '../goal/American_Oxford_5000_improved.db');

async function parseAmericanOxford5000Improved() {
  let db;
  
  try {
    console.log('🔧 Starting improved American_Oxford_5000.pdf parsing...\n');
    
    // 初始化数据库
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        throw err;
      }
      console.log(`📁 Connected to database: ${dbPath}`);
    });

    const tableName = 'american_oxford_5000_improved_entries';

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // 删除现有表
        db.run(`DROP TABLE IF EXISTS ${tableName}`, (err) => {
          if (err) console.error(`Error dropping table`, err.message);
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
            console.error(`Error creating table`, err.message);
            return reject(err);
          }
          console.log(`✅ Table "${tableName}" created.`);
          resolve();
        });
      });
    });
    
    // 解析PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    console.log(`📖 Successfully parsed PDF`);
    
    const lines = pdfData.text.split('\n');
    const entries = [];
    
    console.log('🔍 Processing lines...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      // 跳过标题和页脚信息
      if (line.includes('© Oxford University Press') || 
          line.includes('The Oxford 5000™') ||
          line.includes('American English') ||
          line.includes('The Oxford 5000 is the list') ||
          line.includes('from A1 to C1 level') ||
          line.includes('additional 2000 words') ||
          line.includes('As well as the Oxford') ||
          /^\d+\s*\/\s*\d+$/.test(line) ||
          line === '.' ||
          /^[ABC][12]$/.test(line) ||
          /^\d+$/.test(line)) {
        continue;
      }
      
      let parsed = false;
      
      // 模式1: 完整行，如 "abolish v. C1"
      const simpleMatch = line.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
      
      if (simpleMatch) {
        const word = simpleMatch[1].trim().toLowerCase();
        const pos = simpleMatch[2].trim();
        const cefrLevel = simpleMatch[3] || null;
        
        if (word.length > 0) {
          entries.push({
            word,
            pos: pos || null,
            cefr_level: cefrLevel,
            source: 'American_Oxford_5000.pdf',
            original_line: line,
            format_type: 'simple'
          });
          parsed = true;
        }
      }
      
      // 模式2: 复杂词性，如 "acid n. B2, adj. C1"
      if (!parsed) {
        const complexMatch = line.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+((?:[a-z]+\.\s*[ABC][12](?:,\s*)?)+)$/i);
        
        if (complexMatch) {
          const word = complexMatch[1].trim().toLowerCase();
          const posAndCefr = complexMatch[2].trim();
          
          // 解析多个 pos CEFR 组合
          const matches = posAndCefr.match(/([a-z]+\.)\s*([ABC][12])/gi);
          
          if (matches) {
            for (const match of matches) {
              const [, pos, cefr] = match.match(/([a-z]+\.)\s*([ABC][12])/i);
              entries.push({
                word,
                pos: pos.trim(),
                cefr_level: cefr.trim(),
                source: 'American_Oxford_5000.pdf',
                original_line: line,
                format_type: 'complex'
              });
            }
            parsed = true;
          }
        }
      }
      
      // 模式3: 分行的词条，如 "bass" 接下来是 "n. C1"
      if (!parsed && /^[a-zA-Z][a-zA-Z\s\-']*$/.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        
        // 检查下一行是否是词性和CEFR级别
        const nextMatch = nextLine.match(/^([a-z]+\.(?:,\s*[a-z]+\.)*)\s*([ABC][12])?\s*$/i);
        
        if (nextMatch) {
          const word = line.toLowerCase();
          const pos = nextMatch[1].trim();
          const cefrLevel = nextMatch[2] || null;
          
          entries.push({
            word,
            pos: pos || null,
            cefr_level: cefrLevel,
            source: 'American_Oxford_5000.pdf',
            original_line: `${line} ${nextLine}`,
            format_type: 'split_lines'
          });
          
          // 跳过下一行，因为已经处理了
          i++;
          parsed = true;
        }
      }
      
      // 模式4: 分行的复杂词性，如 "bow" 接下来是 "v., n. C1"
      if (!parsed && /^[a-zA-Z][a-zA-Z\s\-']*$/.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        
        // 检查下一行是否包含复杂词性和CEFR级别
        if (/[ABC][12]/.test(nextLine)) {
          const word = line.toLowerCase();
          
          // 尝试解析复杂格式
          const complexSplitMatch = nextLine.match(/^((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
          
          if (complexSplitMatch) {
            const pos = complexSplitMatch[1].trim();
            const cefrLevel = complexSplitMatch[2] || null;
            
            entries.push({
              word,
              pos: pos || null,
              cefr_level: cefrLevel,
              source: 'American_Oxford_5000.pdf',
              original_line: `${line} ${nextLine}`,
              format_type: 'split_complex'
            });
            
            // 跳过下一行
            i++;
            parsed = true;
          }
        }
      }
    }
    
    console.log(`📝 Extracted ${entries.length} word entries`);
    
    // 显示格式类型分布
    const formatDistribution = {};
    entries.forEach(entry => {
      formatDistribution[entry.format_type] = (formatDistribution[entry.format_type] || 0) + 1;
    });
    
    console.log('📊 Format Distribution:');
    Object.entries(formatDistribution).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} entries`);
    });
    
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
    
    console.log('📊 CEFR Distribution:');
    ['A1', 'A2', 'B1', 'B2', 'C1'].forEach(level => {
      if (cefrDistribution[level]) {
        console.log(`  ${level}: ${cefrDistribution[level]} words`);
      }
    });
    if (noCefrCount > 0) {
      console.log(`  No CEFR: ${noCefrCount} words`);
    }
    
    // 插入数据
    console.log('💾 Inserting data...');
    const stmt = db.prepare(`INSERT INTO ${tableName} (word, pos, cefr_level, source, original_line, format_type) VALUES (?, ?, ?, ?, ?, ?)`);
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
        
        const stats = fs.statSync(dbPath);
        console.log(`✅ Successfully processed American_Oxford_5000.pdf`);
        console.log(`   - Inserted: ${insertedCount} entries`);
        console.log(`   - Database size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   - Database: ${dbPath}`);
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error processing PDF:', error);
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

parseAmericanOxford5000Improved().then(() => {
  console.log('🎉 Process completed successfully!');
}).catch(console.error);
