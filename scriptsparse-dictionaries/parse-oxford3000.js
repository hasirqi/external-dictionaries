// 解析 oxford3000.csv，生成统一格式的 JSON 文件
// 统一格式示例：[{ word: 'example', pos: '', definition: '' }]
const fs = require('fs');
const readline = require('readline');

const inputPath = '../omw/oxford3000.csv';
const outputPath = '../omw/parsed-oxford3000.json';

async function parseOxford3000() {
  const input = fs.createReadStream(inputPath);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const result = [];
  for await (const line of rl) {
    const word = line.trim();
    if (!word || word.startsWith('#')) continue;
    result.push({ word, pos: '', definition: '' });
  }
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Oxford3000 解析完成，输出：${outputPath}`);
}

parseOxford3000();
