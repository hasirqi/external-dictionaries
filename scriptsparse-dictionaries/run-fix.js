// 简单的脚本运行器
console.log('🔧 Starting Oxford PDF fix process...');

const { fixAllOxfordPdfs } = require('./fix-all-oxford-pdfs.js');

fixAllOxfordPdfs()
  .then(() => {
    console.log('✅ Fix process completed successfully!');
  })
  .catch((error) => {
    console.error('❌ Fix process failed:', error);
  });
