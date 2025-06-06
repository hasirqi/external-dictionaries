// 解析 omw-en.tsv.gz，生成统一格式的 JSON 文件
// 统一格式示例：[{ word: 'example', pos: 'n', definition: '...', ... }]
const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');

const inputPath = '../omw/omw-en.tsv.gz';
const outputPath = '../omw/parsed-omw-en.json';

async function parseOMW() {
  const input = fs.createReadStream(inputPath).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const result = [];
  for await (const line of rl) {
    if (line.startsWith('#') || !line.trim()) continue;
    // OMW TSV 格式：synset\tlemma\tpos\tdefinition
    const [synset, lemma, pos, definition] = line.split('\t');
    result.push({ word: lemma, pos, definition, synset });
  }
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`OMW 解析完成，输出：${outputPath}`);
}

parseOMW();
