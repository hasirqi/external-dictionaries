// 专门处理 American_Oxford_5000.pdf 的脚本
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_5000.pdf');
const dbPath = path.resolve(__dirname, '../goal/American_Oxford_5000_fixed.db');

console.log('🔧 Processing American_Oxford_5000.pdf...');
console.log(`PDF: ${pdfPath}`);
console.log(`Database: ${dbPath}`);

async function processAmericanOxford5000() {
  try {
    // 检查PDF文件是否存在
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }

    // 删除旧的数据库文件（如果存在）
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️ Removed old database file');
    }

    // 解析PDF
    console.log('📖 Parsing PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    // 创建数据库
    console.log('🗄️ Creating database...');
    const db = new sqlite3.Database(dbPath);
    
    const tableName = 'american_oxford_5000_fixed_entries';
    
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        pos TEXT,
        cefr_level TEXT,
        source TEXT,
        original_line TEXT,
        format_type TEXT
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Database table created');

    // 解析PDF内容（使用复杂词性格式解析器）
    console.log('🔍 Extracting words...');
    const entries = extractWordsComplexPos(pdfData.text);
    
    if (entries.length === 0) {
      console.log('❌ No entries extracted!');
      return;
    }

    console.log(`📝 Extracted ${entries.length} word entries`);
    
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
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach(level => {
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
            reject(err);
          } else {
            insertedCount++;
            resolve();
          }
        });
      });
    }
    
    stmt.finalize();
    db.close();
    
    // 检查文件大小
    const stats = fs.statSync(dbPath);
    console.log(`✅ Successfully processed American_Oxford_5000.pdf`);
    console.log(`   - Inserted: ${insertedCount} entries`);
    console.log(`   - Database size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   - Database: ${dbPath}`);

  } catch (error) {
    console.error('❌ Error processing American_Oxford_5000.pdf:', error);
  }
}

// 复杂词性格式解析器 (专门用于 American_Oxford_5000.pdf)
function extractWordsComplexPos(text) {
  const entries = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    // 跳过标题和页脚信息
    if (line.includes('© Oxford University Press') || 
        line.includes('The Oxford 5000™') ||
        line.includes('American English') ||
        line.includes('The Oxford 5000 is the list') ||
        line.includes('from A1 to C1 level') ||
        /^\d+\s*\/\s*\d+$/.test(line) ||
        line === '.' ||
        /^[ABC][12]$/.test(line) ||
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
                source: 'American_Oxford_5000.pdf',
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
              source: 'American_Oxford_5000.pdf',
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
                    source: 'American_Oxford_5000.pdf',
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

// 运行处理函数
processAmericanOxford5000()
  .then(() => {
    console.log('🎉 Process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Process failed:', error);
    process.exit(1);
  });
