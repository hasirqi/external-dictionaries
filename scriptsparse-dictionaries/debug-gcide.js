// 调试 GCIDE 解析脚本
const fs = require('fs');

console.log('开始调试...');

const filePath = '../gcide/CIDE.A';
console.log('读取文件:', filePath);

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log('文件大小:', content.length, '字符');

  // 查找第一个词条的原始内容
  const startIndex = content.indexOf('<p><ent>0</ent>');
  console.log('找到第一个词条位置:', startIndex);
  
  if (startIndex >= 0) {
    const endIndex = content.indexOf('</p>', startIndex) + 4;
    const firstEntry = content.substring(startIndex, endIndex);

    console.log('第一个词条原始内容:');
    console.log(firstEntry);
    console.log('\n');

    // 测试不同的正则表达式
    const cleanContent = content.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
    console.log('清理后的第一个词条:');
    const cleanStartIndex = cleanContent.indexOf('<p><ent>0</ent>');
    const cleanEndIndex = cleanContent.indexOf('</p>', cleanStartIndex) + 4;
    const cleanFirstEntry = cleanContent.substring(cleanStartIndex, cleanEndIndex);
    console.log(cleanFirstEntry);
    console.log('\n');

    // 测试正则表达式
    const entryPattern = /<p><ent>([^<]+)<\/ent><br\/[^>]*>\s*<hw>([^<]+)<\/hw>\s*<pos>([^<]+)<\/pos>.*?<def>([^<]+)<\/def>/gi;
    const match = entryPattern.exec(cleanContent);

    if (match) {
      console.log('找到匹配:', match);
    } else {
      console.log('未找到匹配');
      
      // 尝试简化的正则表达式
      const simplePattern = /<hw>([^<]+)<\/hw>\s*<pos>([^<]+)<\/pos>.*?<def>([^<]+)<\/def>/gi;
      const simpleMatch = simplePattern.exec(cleanContent);
      
      if (simpleMatch) {
        console.log('简化正则表达式找到匹配:', simpleMatch);
      } else {
        console.log('简化正则表达式也未找到匹配');
      }
    }
  } else {
    console.log('未找到第一个词条');
  }
} catch (error) {
  console.error('读取文件出错:', error.message);
}
