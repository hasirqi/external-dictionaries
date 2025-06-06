// 一键批量解析所有词库，生成统一格式的 JSON 文件
const { exec } = require('child_process');
const path = require('path');

const scripts = [
  'parse-omw.js',
  'parse-oxford3000.js', 
  'parse-gcide.js',
  'parse-wordnet.js'
];

async function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 开始解析: ${script}`);
    exec(`node ${script}`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${script} 解析失败:`, error.message);
        resolve({ script, success: false, error: error.message });
      } else {
        console.log(`✅ ${script} 解析成功:`);
        console.log(stdout);
        if (stderr) console.warn(stderr);
        resolve({ script, success: true, output: stdout });
      }
    });
  });
}

async function runAllParsers() {
  console.log('📚 开始批量解析词库...');
  const results = [];
  
  for (const script of scripts) {
    const result = await runScript(script);
    results.push(result);
  }
  
  console.log('\n📊 解析结果汇总:');
  results.forEach(({ script, success, error }) => {
    const status = success ? '✅ 成功' : '❌ 失败';
    console.log(`${status} ${script}${error ? `: ${error}` : ''}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 总计: ${successCount}/${results.length} 个词库解析成功`);
}

runAllParsers().catch(console.error);
