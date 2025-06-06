// 深度分析 American_Oxford_3000.pdf 的完整性
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_3000.pdf');

async function deepAnalysisPdf() {
  try {
    console.log('开始分析...');
    console.log('=== American_Oxford_3000.pdf 完整性分析 ===\n');
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`PDF页数: ${pdfData.numpages}`);
    console.log(`PDF文本总长度: ${pdfData.text.length} 字符\n`);
    
    const lines = pdfData.text.split('\n');
    console.log(`总行数: ${lines.length}\n`);
    
    // 统计各种行类型
    let headerLines = 0;
    let cefrStandaloneLines = 0;
    let emptyLines = 0;
    let potentialWordLines = 0;
    let pageNumbers = 0;
    
    const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const wordEntries = [];
    const skippedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.length === 0) {
        emptyLines++;
        continue;
      }
      
      // 页眉页脚
      if (line.includes('© Oxford University Press') || 
          line.includes('The Oxford 3000™') ||
          line.includes('American English') ||
          line.includes('The Oxford 3000 is the list') ||
          line.includes('from A1 to B2 level') ||
          /^\d+\s*\/\s*\d+$/.test(line)) {
        headerLines++;
        continue;
      }
      
      // 单独的CEFR等级行
      if (/^[ABC][12]$/.test(line)) {
        cefrStandaloneLines++;
        continue;
      }
      
      // 页码
      if (/^\d+$/.test(line) && parseInt(line) <= 20) {
        pageNumbers++;
        continue;
      }
      
      // 分析潜在的单词行
      potentialWordLines++;
      
      // 尝试不同的匹配模式
      
      // 模式1: word[, word2] pos CEFR_level (如 "a, an indefinite article A1")
      const pattern1 = line.match(/^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*([ABC][12])?\s*$/i);
      
      // 模式2: word pos (无CEFR等级)
      const pattern2 = line.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+((?:[a-z]+\.(?:,\s*)?)*[a-z]+\.?)\s*$/i);
      
      // 模式3: 只有单词（可能在某些PDF格式中）
      const pattern3 = line.match(/^([a-zA-Z][a-zA-Z\s\-']{1,20})$/);
      
      if (pattern1) {
        const wordPart = pattern1[1].trim();
        const pos = pattern1[2].trim();
        const cefrLevel = pattern1[3] || null;
        
        // 处理多个单词（用逗号分隔）
        const words = wordPart.split(',').map(w => w.trim()).filter(w => w.length > 0);
        for (const word of words) {
          if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
            wordEntries.push({
              line: i + 1,
              word: word.toLowerCase(),
              pos: pos,
              cefr_level: cefrLevel,
              source: 'pattern1',
              original: line
            });
          }
        }
      } else if (pattern2) {
        const word = pattern2[1].trim();
        const pos = pattern2[2].trim();
        
        if (/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word) && word.length > 0) {
          wordEntries.push({
            line: i + 1,
            word: word.toLowerCase(),
            pos: pos,
            cefr_level: null,
            source: 'pattern2',
            original: line
          });
        }
      } else {
        // 记录无法匹配的行，以便进一步分析
        skippedLines.push({
          line: i + 1,
          content: line
        });
      }
    }
    
    console.log('=== 行类型统计 ===');
    console.log(`空行: ${emptyLines}`);
    console.log(`页眉页脚: ${headerLines}`);
    console.log(`单独CEFR等级行: ${cefrStandaloneLines}`);
    console.log(`页码: ${pageNumbers}`);
    console.log(`潜在单词行: ${potentialWordLines}`);
    console.log(`成功解析的词条: ${wordEntries.length}`);
    console.log(`跳过的行: ${skippedLines.length}\n`);
    
    // CEFR等级分布
    console.log('=== CEFR等级分布 ===');
    const cefrDistribution = {};
    let noCefrCount = 0;
    
    wordEntries.forEach(entry => {
      if (entry.cefr_level) {
        cefrDistribution[entry.cefr_level] = (cefrDistribution[entry.cefr_level] || 0) + 1;
      } else {
        noCefrCount++;
      }
    });
    
    cefrLevels.forEach(level => {
      if (cefrDistribution[level]) {
        console.log(`${level}: ${cefrDistribution[level]} 词`);
      }
    });
    console.log(`无CEFR等级: ${noCefrCount} 词\n`);
    
    // 显示前20个跳过的行，看看是否有遗漏的词汇
    console.log('=== 前20个跳过的行（可能包含遗漏的词汇）===');
    skippedLines.slice(0, 20).forEach(item => {
      console.log(`行 ${item.line}: "${item.content}"`);
    });
    
    if (skippedLines.length > 20) {
      console.log(`... 还有 ${skippedLines.length - 20} 行被跳过`);
    }
    
    console.log('\n=== 解析模式统计 ===');
    const patternStats = {};
    wordEntries.forEach(entry => {
      patternStats[entry.source] = (patternStats[entry.source] || 0) + 1;
    });
    
    Object.entries(patternStats).forEach(([pattern, count]) => {
      console.log(`${pattern}: ${count} 词条`);
    });
    
    // 检查是否有重复词汇
    console.log('\n=== 重复词汇检查 ===');
    const wordCounts = {};
    wordEntries.forEach(entry => {
      wordCounts[entry.word] = (wordCounts[entry.word] || 0) + 1;
    });
    
    const duplicates = Object.entries(wordCounts).filter(([word, count]) => count > 1);
    console.log(`发现 ${duplicates.length} 个重复词汇:`);
    duplicates.slice(0, 10).forEach(([word, count]) => {
      console.log(`  "${word}": ${count} 次`);
    });
    
    // 显示一些样本词条
    console.log('\n=== 样本词条 (前10个) ===');
    wordEntries.slice(0, 10).forEach(entry => {
      console.log(`行 ${entry.line}: "${entry.word}" (${entry.pos}) [${entry.cefr_level || 'N/A'}] - ${entry.source}`);
    });
    
  } catch (error) {
    console.error('分析PDF时出错:', error);
  }
}

deepAnalysisPdf();
