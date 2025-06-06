// 解析 GCIDE 词典文件，生成统一格式的 JSON 文件
// 统一格式示例：[{ word: 'example', pos: 'n', definition: '...', ... }]
const fs = require('fs');
const path = require('path');

const gcideDir = path.resolve(__dirname, '../gcide'); // 修正为相对本项目的 gcide 目录
const outputPath = path.resolve(__dirname, '../gcide/parsed-gcide.json'); // 保证输出到 gcide 目录下

function extractWordData(content) {
  const result = [];
  // 先移除换行符，让内容连续
  const cleanContent = content.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

  // 1. 先全局提取所有 <hw>...</hw> 区块
  const hwPattern = /<hw>([^<]+)<\/hw>([\s\S]*?)(?=<hw>|$)/gi;
  let match;
  while ((match = hwPattern.exec(cleanContent)) !== null) {
    const headword = match[1].trim();
    const block = match[2];
    // 提取 <pos> 和 <def>，没有则为 null
    const posMatch = /<pos>([^<]+)<\/pos>/i.exec(block);
    const defMatch = /<def>([^<]+)<\/def>/i.exec(block);
    result.push({
      word: headword,
      pos: posMatch ? posMatch[1].trim() : '',
      definition: defMatch ? defMatch[1].trim() : ''
    });
  }
  return result;
}

async function parseGCIDE() {
  const result = [];
  console.log('开始解析 GCIDE 词典文件...');
  
  // 获取所有 CIDE.* 文件
  const files = fs.readdirSync(gcideDir)
    .filter(f => f.startsWith('CIDE.') && f.length === 6)
    .sort();
  
  console.log(`找到 ${files.length} 个 CIDE 文件: ${files.join(', ')}`);
  
  for (const file of files) {
    console.log(`解析文件: ${file}`);
    const filePath = path.join(gcideDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const words = extractWordData(content);
    result.push(...words);
    console.log(`${file} 解析完成，获得 ${words.length} 个词条`);
  }
  
  console.log(`总共解析 ${result.length} 个词条`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`GCIDE 解析完成，输出：${outputPath}`);
}

parseGCIDE().catch(console.error);
