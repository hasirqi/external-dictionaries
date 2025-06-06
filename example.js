#!/usr/bin/env node
/**
 * External Dictionaries - 示例使用脚本
 * 展示如何使用解析好的词典数据库
 */

const Database = require('better-sqlite3');
const path = require('path');

// 示例：查询Oxford 3000数据库
function queryOxford3000() {
  try {
    const dbPath = path.join(__dirname, 'goal', 'American_Oxford_3000_improved.db');
    const db = new Database(dbPath);
    
    console.log('🔍 查询 American Oxford 3000 数据库示例:\n');
    
    // 查询总词条数
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM american_oxford_3000_improved_entries');
    const total = countStmt.get();
    console.log(`📊 总词条数: ${total.count}`);
    
    // 查看CEFR等级分布
    const cefrStmt = db.prepare(`
      SELECT cefr_level, COUNT(*) as count 
      FROM american_oxford_3000_improved_entries 
      GROUP BY cefr_level 
      ORDER BY cefr_level
    `);
    const cefrData = cefrStmt.all();
    console.log('\n📈 CEFR等级分布:');
    cefrData.forEach(row => {
      console.log(`  ${row.cefr_level}: ${row.count}词`);
    });
    
    // 查询示例单词
    const exampleStmt = db.prepare(`
      SELECT word, pos, cefr_level 
      FROM american_oxford_3000_improved_entries 
      WHERE word IN ('account', 'beautiful', 'important') 
      ORDER BY word, pos
    `);
    const examples = exampleStmt.all();
    console.log('\n📝 示例词汇:');
    examples.forEach(row => {
      console.log(`  ${row.word} (${row.pos}) - ${row.cefr_level}级`);
    });
    
    db.close();
    console.log('\n✅ 查询完成！');
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.log('💡 请确保已运行解析脚本生成数据库文件');
  }
}

// 示例：查询GCIDE数据库
function queryGCIDE() {
  try {
    const dbPath = path.join(__dirname, 'gcide-dictionary.db');
    const db = new Database(dbPath);
    
    console.log('\n🔍 查询 GCIDE 数据库示例:\n');
    
    // 查询总词条数
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM entries');
    const total = countStmt.get();
    console.log(`📊 总词条数: ${total.count}`);
    
    // 查询示例定义
    const exampleStmt = db.prepare(`
      SELECT word, pos, definition 
      FROM entries 
      WHERE word = 'example' 
      LIMIT 3
    `);
    const examples = exampleStmt.all();
    console.log('\n📖 "example"的定义:');
    examples.forEach((row, index) => {
      console.log(`  ${index + 1}. [${row.pos}] ${row.definition.substring(0, 100)}...`);
    });
    
    db.close();
    console.log('\n✅ 查询完成！');
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.log('💡 请确保已运行解析脚本生成数据库文件');
  }
}

// 主函数
function main() {
  console.log('🚀 External Dictionaries - 数据库查询示例\n');
  console.log('=' * 50);
  
  queryOxford3000();
  queryGCIDE();
  
  console.log('\n📚 使用说明:');
  console.log('  - npm run parse-oxford  # 解析Oxford词库');
  console.log('  - npm run parse-gcide   # 解析GCIDE词库');
  console.log('  - npm run studio        # 启动可视化界面');
}

// 运行示例
if (require.main === module) {
  main();
}

module.exports = {
  queryOxford3000,
  queryGCIDE
};
