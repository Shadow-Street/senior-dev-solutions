#!/usr/bin/env node

/**
 * Migration script to replace @/api/entities imports with @/lib/apiClient
 * This script updates all .js, .jsx, .ts, and .tsx files in the src directory
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (/\.(jsx?|tsx?)$/.test(file)) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Replace all variations of @/api/entities imports
  content = content.replace(
    /from ['"]@\/api\/entities['"]/g,
    "from '@/lib/apiClient'"
  );
  
  content = content.replace(
    /from ['"]src\/api\/entities['"]/g,
    "from '@/lib/apiClient'"
  );

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔄 Starting migration of API imports...\n');
  
  const allFiles = getAllFiles(srcDir);
  let migratedCount = 0;
  
  allFiles.forEach((file) => {
    const relativePath = path.relative(process.cwd(), file);
    
    if (migrateFile(file)) {
      console.log(`✅ Migrated: ${relativePath}`);
      migratedCount++;
    }
  });
  
  console.log(`\n✨ Migration complete! ${migratedCount} files updated.`);
}

main();
