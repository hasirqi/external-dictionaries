// 调试American_Oxford_5000.pdf的脚本
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function analyzeAmericanOxford5000() {
  try {
    const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_5000.pdf');
    console.log('📖 Analyzing American_Oxford_5000.pdf...\n');
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`📄 Total PDF pages: ${pdfData.numpages}`);
    console.log(`📝 Total text length: ${pdfData.text.length} characters\n`);
    
    const lines = pdfData.text.split('\n');
    console.log(`📋 Total lines: ${lines.length}\n`);
    
    // 分析不同类型的行
    let wordLines = 0;
    let headerLines = 0;
    let emptyLines = 0;
    let otherLines = 0;
    
    const sampleWords = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.length === 0) {
        emptyLines++;
        continue;
      }
      
      // 检查是否是标题行
      if (line.includes('© Oxford University Press') || 
          line.includes('The Oxford 5000™') ||
          line.includes('American English') ||
          line.includes('The Oxford 5000 is the list') ||
          line.includes('from A1 to C1 level') ||
          /^\d+\s*\/\s*\d+$/.test(line) ||
          line === '.' ||
          /^[ABC][12]$/.test(line) ||
          /^\d+$/.test(line)) {
        headerLines++;
        continue;
      }
      
      // 检查是否是词条行 (简单格式: word pos CEFR)
      const wordMatch = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
      
      if (wordMatch) {
        wordLines++;
        if (sampleWords.length < 10) {
          sampleWords.push(line);
        }
      } else {
        otherLines++;
        if (otherLines <= 20) {
          console.log(`[Other line ${i}]: "${line}"`);
        }
      }
    }
    
    console.log('📊 Line Analysis:');
    console.log(`  Word lines: ${wordLines}`);
    console.log(`  Header lines: ${headerLines}`);
    console.log(`  Empty lines: ${emptyLines}`);
    console.log(`  Other lines: ${otherLines}`);
    
    console.log('\n📝 Sample word lines:');
    sampleWords.forEach((word, index) => {
      console.log(`  ${index + 1}. "${word}"`);
    });
    
    // 分页分析
    console.log('\n📄 Page-by-page analysis:');
    const pageTexts = pdfData.text.split(/Page \d+/);
    console.log(`  Detected ${pageTexts.length} page sections`);
    
    // 查找可能遗漏的词条
    console.log('\n🔍 Looking for potential missed entries...');
    const allWords = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      
      // 更宽松的词条匹配
      const relaxedMatch = trimmed.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+(.+)$/);
      if (relaxedMatch && !trimmed.includes('Oxford') && !trimmed.includes('©')) {
        const word = relaxedMatch[1].trim();
        const rest = relaxedMatch[2].trim();
        
        // 检查是否包含CEFR级别
        if (/[ABC][12]/.test(rest) && word.length > 1) {
          allWords.push({word, rest, original: trimmed});
        }
      }
    }
    
    console.log(`🎯 Total potential word entries found: ${allWords.length}`);
    
    if (allWords.length > 0) {
      console.log('\n📝 First 20 potential entries:');
      allWords.slice(0, 20).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.word} | ${entry.rest}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error);
  }
}

analyzeAmericanOxford5000().then(() => {
  console.log('✅ Analysis completed!');
}).catch(console.error);
