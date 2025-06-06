// 分析 The_Oxford_3000.pdf 和 The_Oxford_5000.pdf 的内容结构
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function analyzePdf(pdfFileName) {
  const pdfPath = path.resolve(__dirname, `../Raw_data/Oxford/${pdfFileName}`);
  
  try {
    console.log(`\n=== 分析 ${pdfFileName} ===`);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`PDF页数: ${pdfData.numpages}`);
    console.log(`PDF文本总长度: ${pdfData.text.length} 字符`);
    
    const lines = pdfData.text.split('\n');
    console.log(`总行数: ${lines.length}`);
    
    // 显示前20行内容
    console.log('\n--- 前20行内容 ---');
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      console.log(`${i+1}: "${line}"`);
    }
    
    // 显示后20行内容
    console.log('\n--- 后20行内容 ---');
    const startIdx = Math.max(0, lines.length - 20);
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`${i+1}: "${line}"`);
    }
    
    // 统计各种行类型
    let emptyLines = 0;
    let potentialWordLines = 0;
    let headerFooterLines = 0;
    
    const wordPattern = /^[a-zA-Z][a-zA-Z\s\-']*?\s+[a-z\.]+(?:\s+[ABC][12])?/;
    const complexWordPattern = /^([a-zA-Z][a-zA-Z\s,\-']*?)\s+((?:[a-z]+\.\s*[ABC][12](?:,\s*)?)+)$/i;
    
    console.log('\n--- 行分类统计 ---');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.length === 0) {
        emptyLines++;
        continue;
      }
      
      // 检查是否是页眉页脚
      if (line.includes('© Oxford University Press') || 
          line.includes('Oxford 3000') ||
          line.includes('Oxford 5000') ||
          line.includes('CEFR') ||
          /^\d+\s*\/\s*\d+$/.test(line) ||
          /^\d+$/.test(line)) {
        headerFooterLines++;
        continue;
      }
      
      // 检查是否是单词行
      if (wordPattern.test(line) || complexWordPattern.test(line)) {
        potentialWordLines++;
        if (potentialWordLines <= 10) {
          console.log(`单词行示例 ${potentialWordLines}: "${line}"`);
        }
      }
    }
    
    console.log(`\n统计结果:`);
    console.log(`- 空行: ${emptyLines}`);
    console.log(`- 页眉页脚行: ${headerFooterLines}`);
    console.log(`- 潜在单词行: ${potentialWordLines}`);
    
    return {
      fileName: pdfFileName,
      totalLines: lines.length,
      potentialWordLines,
      text: pdfData.text
    };
    
  } catch (error) {
    console.error(`分析 ${pdfFileName} 时出错:`, error.message);
    return null;
  }
}

async function main() {
  console.log('开始分析Oxford PDF文件...\n');
  
  const filesToAnalyze = [
    'The_Oxford_3000.pdf',
    'The_Oxford_5000.pdf'
  ];
  
  for (const fileName of filesToAnalyze) {
    await analyzePdf(fileName);
  }
}

main().catch(console.error);
