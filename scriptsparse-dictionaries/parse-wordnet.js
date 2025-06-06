// 解析 WordNet 3.1 Prolog 文件，生成统一格式的 JSON 文件
// 统一格式示例：[{ word: 'example', pos: 'n', definition: '...', ... }]
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const prologPath = '../wordnet/wn_s.pl'; // 假设解压后主文件名为 wn_s.pl
const outputPath = '../wordnet/parsed-wordnet.json';

async function parseWordNet() {
  if (!fs.existsSync(prologPath)) {
    console.error('请先手动解压 WNprolog-3.1.tar.gz 到 wordnet 文件夹，并确认 wn_s.pl 文件存在');
    return;
  }
  const input = fs.createReadStream(prologPath);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const result = [];
  for await (const line of rl) {
    if (!line.startsWith('s(')) continue;
    // s(synset_id, w_num, 'lemma', ss_type, sense_number, tag_count).
    const match = line.match(/s\((\d+),\d+,'([^']+)',([a-z]),\d+,\d+\)\./);
    if (match) {
      const [_, synset, lemma, pos] = match;
      result.push({ word: lemma, pos, synset });
    }
  }
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`WordNet 解析完成，输出：${outputPath}`);
}

parseWordNet();
