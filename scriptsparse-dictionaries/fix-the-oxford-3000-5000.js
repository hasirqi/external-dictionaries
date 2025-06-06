const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

// 配置路径
const projectRoot = path.resolve(__dirname, '..');
const rawDataPath = path.join(projectRoot, 'Raw_data', 'Oxford');
const goalPath = path.join(projectRoot, 'goal');

// 要处理的PDF文件
const pdfFiles = [
    'The_Oxford_3000.pdf',
    'The_Oxford_5000.pdf'
];

console.log('🔍 开始深度分析和修复 The_Oxford_3000.pdf 和 The_Oxford_5000.pdf...\n');

async function analyzePdf(pdfPath) {
    try {
        console.log(`📖 正在分析: ${path.basename(pdfPath)}`);
        console.log(`📁 文件路径: ${pdfPath}`);
        
        // 检查文件是否存在
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`文件不存在: ${pdfPath}`);
        }
        
        const stats = fs.statSync(pdfPath);
        console.log(`📊 文件大小: ${Math.round(stats.size / 1024)} KB`);
        
        const dataBuffer = fs.readFileSync(pdfPath);
        console.log(`💾 已读取数据缓冲区，大小: ${dataBuffer.length} bytes`);
        
        console.log(`🔄 开始PDF解析...`);
        const data = await pdfParse(dataBuffer);
        console.log(`✅ PDF解析完成`);
        
        console.log(`📄 总页数: ${data.numpages}`);
        console.log(`📝 总字符数: ${data.text.length}`);
        
        // 分析文本内容
        const lines = data.text.split('\n').filter(line => line.trim().length > 0);
        console.log(`📋 总行数: ${lines.length}`);
        
        // 查找可能的词汇行
        let wordLines = [];
        let headerLines = [];
        let otherLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过页码、标题等
            if (line.match(/^\d+$/) || line.length < 2) continue;
            if (line.includes('Oxford') || line.includes('3000') || line.includes('5000')) {
                headerLines.push(line);
                continue;
            }
            if (line.includes('CEFR') || line.includes('level')) {
                headerLines.push(line);
                continue;
            }
            
            // 查找可能包含单词的行
            // 检查是否包含英文单词模式
            if (line.match(/^[a-zA-Z][a-zA-Z\s\-']*$/)) {
                wordLines.push(line);
            } else if (line.match(/[a-zA-Z]+.*[ABC][12]/)) {
                // 包含CEFR等级的行
                wordLines.push(line);
            } else {
                otherLines.push(line);
            }
        }
        
        console.log(`🔤 可能的词汇行: ${wordLines.length}`);
        console.log(`📑 标题行: ${headerLines.length}`);
        console.log(`📄 其他行: ${otherLines.length}`);
        
        // 显示前20行词汇示例
        console.log('\n📝 前20行可能的词汇:');
        wordLines.slice(0, 20).forEach((line, index) => {
            console.log(`${index + 1}. "${line}"`);
        });
        
        // 显示一些标题行
        console.log('\n📋 标题行示例:');
        headerLines.slice(0, 10).forEach((line, index) => {
            console.log(`${index + 1}. "${line}"`);
        });
        
        // 显示一些其他行
        console.log('\n📄 其他行示例:');
        otherLines.slice(0, 10).forEach((line, index) => {
            console.log(`${index + 1}. "${line}"`);
        });
        
        return { wordLines, headerLines, otherLines, allLines: lines };
        
    } catch (error) {
        console.error(`❌ 分析PDF失败: ${error.message}`);
        return null;
    }
}

async function parseWordList(wordLines, fileName) {
    console.log(`\n🔧 开始解析 ${fileName} 的词汇列表...`);
    
    const entries = [];
    let currentCefrLevel = null;
    
    for (const line of wordLines) {
        const trimmedLine = line.trim();
        
        // 检查是否是CEFR等级标识行
        const cefrMatch = trimmedLine.match(/([ABC][12])/);
        if (cefrMatch && trimmedLine.length < 10) {
            currentCefrLevel = cefrMatch[1];
            console.log(`📊 发现CEFR等级: ${currentCefrLevel}`);
            continue;
        }
        
        // 解析单词行
        if (trimmedLine.match(/^[a-zA-Z][a-zA-Z\s\-']*$/)) {
            // 简单的单词
            const word = trimmedLine.toLowerCase().trim();
            if (word.length > 1) {
                entries.push({
                    word: word,
                    pos: null,
                    cefr_level: currentCefrLevel,
                    source: fileName,
                    original_line: trimmedLine,
                    format_type: 'simple'
                });
            }
        } else if (trimmedLine.match(/[a-zA-Z]+.*[ABC][12]/)) {
            // 包含CEFR等级的复杂行
            const parts = trimmedLine.split(/\s+/);
            let word = '';
            let pos = '';
            let cefr = null;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (part.match(/^[ABC][12]$/)) {
                    cefr = part;
                    break;
                } else if (part.match(/^[a-zA-Z\-']+$/)) {
                    if (!word) {
                        word = part.toLowerCase();
                    }
                } else if (part.match(/^[a-z]+\.$/)) {
                    pos = part;
                }
            }
            
            if (word) {
                entries.push({
                    word: word,
                    pos: pos || null,
                    cefr_level: cefr || currentCefrLevel,
                    source: fileName,
                    original_line: trimmedLine,
                    format_type: 'with_cefr'
                });
            }
        }
    }
    
    console.log(`✅ 解析完成，共提取 ${entries.length} 个词条`);
    
    // 显示CEFR分布
    const cefrStats = {};
    entries.forEach(entry => {
        const level = entry.cefr_level || 'Unknown';
        cefrStats[level] = (cefrStats[level] || 0) + 1;
    });
    
    console.log('📊 CEFR等级分布:');
    Object.entries(cefrStats).forEach(([level, count]) => {
        console.log(`  ${level}: ${count} 词`);
    });
    
    return entries;
}

async function saveToDatabase(entries, pdfFileName) {
    const dbFileName = pdfFileName.replace('.pdf', '.db');
    const dbPath = path.join(goalPath, dbFileName);
    const tableName = pdfFileName.replace('.pdf', '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() + '_entries';
    
    console.log(`\n💾 正在保存到数据库: ${dbFileName}`);
    console.log(`📊 表名: ${tableName}`);
    
    // 删除旧数据库文件
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('🗑️ 已删除旧数据库文件');
    }
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });
        
        // 创建表
        const createTableSQL = `
            CREATE TABLE ${tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                pos TEXT,
                cefr_level TEXT,
                source TEXT,
                original_line TEXT,
                format_type TEXT
            )
        `;
        
        db.run(createTableSQL, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log('✅ 数据表创建成功');
            
            // 插入数据
            const insertSQL = `
                INSERT INTO ${tableName} (word, pos, cefr_level, source, original_line, format_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const stmt = db.prepare(insertSQL);
            let insertedCount = 0;
            
            entries.forEach((entry) => {
                stmt.run([
                    entry.word,
                    entry.pos,
                    entry.cefr_level,
                    entry.source,
                    entry.original_line,
                    entry.format_type
                ], (err) => {
                    if (err) {
                        console.error('❌ 插入错误:', err.message);
                    } else {
                        insertedCount++;
                    }
                });
            });
            
            stmt.finalize((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`✅ 成功插入 ${insertedCount} 条记录`);
                
                db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ dbPath, insertedCount, tableName });
                    }
                });
            });
        });
    });
}

async function processAllPdfs() {
    console.log('🚀 开始处理所有PDF文件...\n');
    
    for (const pdfFile of pdfFiles) {
        const pdfPath = path.join(rawDataPath, pdfFile);
        
        if (!fs.existsSync(pdfPath)) {
            console.log(`❌ PDF文件不存在: ${pdfFile}`);
            continue;
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📄 处理文件: ${pdfFile}`);
        console.log(`${'='.repeat(60)}`);
        
        // 分析PDF
        const analysis = await analyzePdf(pdfPath);
        if (!analysis) {
            console.log(`❌ 跳过文件: ${pdfFile}`);
            continue;
        }
        
        // 解析词汇
        const entries = await parseWordList(analysis.wordLines, pdfFile);
        
        if (entries.length === 0) {
            console.log(`⚠️ 未能提取到词汇: ${pdfFile}`);
            continue;
        }
        
        // 保存到数据库
        try {
            const result = await saveToDatabase(entries, pdfFile);
            console.log(`✅ 成功处理: ${pdfFile}`);
            console.log(`📁 数据库文件: ${result.dbPath}`);
            console.log(`📊 词条数量: ${result.insertedCount}`);
            console.log(`🏷️ 表名: ${result.tableName}`);
        } catch (error) {
            console.error(`❌ 保存失败: ${error.message}`);
        }
    }
    
    console.log('\n🎉 所有PDF文件处理完成！');
}

// 运行主程序
console.log('🚀 脚本开始执行...');
console.log(`📁 项目根目录: ${projectRoot}`);
console.log(`📁 原始数据目录: ${rawDataPath}`);
console.log(`📁 目标目录: ${goalPath}`);

processAllPdfs().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    console.error('📋 错误堆栈:', error.stack);
});
