// 调试 American_Oxford_3000.pdf 解析问题
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.resolve(__dirname, '../Raw_data/Oxford/American_Oxford_3000.pdf');

async function debugPdf() {
  try {
    console.log('正在解析PDF文件:', pdfPath);
    console.log('文件是否存在:', fs.existsSync(pdfPath));
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF文件不存在:', pdfPath);
      return;
    }
    
    const stats = fs.statSync(pdfPath);
    console.log('文件大小:', stats.size, 'bytes');
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log('PDF页数:', pdfData.numpages);
    console.log('PDF文本长度:', pdfData.text.length);
    console.log('\n=== PDF文本内容 (前2000字符) ===');
    console.log(pdfData.text.substring(0, 2000));
    console.log('\n=== PDF文本内容 (2000-4000字符) ===');
    console.log(pdfData.text.substring(2000, 4000));
    
    // 分析文本结构
    const lines = pdfData.text.split('\n');
    console.log('\n=== 前50行文本 ===');
    lines.slice(0, 50).forEach((line, index) => {
      if (line.trim()) {
        console.log(`${index + 1}: "${line}"`);
      }
    });
    
    // 查找CEFR等级标记
    console.log('\n=== CEFR等级行 ===');
    lines.forEach((line, index) => {
      if (/^[ABC][12]$/.test(line.trim())) {
        console.log(`行 ${index + 1}: "${line}"`);
      }
    });
    
    // 查找可能的单词条目
    console.log('\n=== 可能的单词条目 (前20个) ===');
    let wordCount = 0;
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0 && 
          !trimmedLine.includes('© Oxford University Press') && 
          !trimmedLine.includes('American Oxford') &&
          !/^[ABC][12]$/.test(trimmedLine) &&
          wordCount < 20) {
        
        const wordMatch = trimmedLine.match(/^([a-zA-Z][a-zA-Z\s\-']*?)\s+([a-z]+(?:\.|,\s*[a-z]+\.)*)\s*$/i);
        if (wordMatch) {
          console.log(`行 ${index + 1}: "${trimmedLine}" -> 单词: "${wordMatch[1]}", 词性: "${wordMatch[2]}"`);
          wordCount++;
        }
      }
    });
    
  } catch (error) {
    console.error('解析PDF时出错:', error);
  }
}

debugPdf();
