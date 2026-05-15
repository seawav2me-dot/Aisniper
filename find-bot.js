const fs = require('fs');
const path = require('path');

function findFile(dir, targetName) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findFile(fullPath, targetName);
      } else if (file === targetName) {
        console.log('✅ Found bot file at:', fullPath);
      }
    }
  } catch (err) {
    console.log('Error reading:', dir);
  }
}

// سجل كل الملفات في المجلد الحالي
console.log('📂 Root contents:', fs.readdirSync('.'));
// ابحث عن index.mjs
findFile('.', 'index.mjs');
