#!/usr/bin/env node

/**
 * Migration script to replace old API imports with new @/lib/apiClient
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

  // Replace @/api/entities imports
  content = content.replace(
    /from ['"]@\/api\/entities['"]/g,
    "from '@/lib/apiClient'"
  );
  
  content = content.replace(
    /from ['"]src\/api\/entities['"]/g,
    "from '@/lib/apiClient'"
  );

  // Replace base44Client imports
  content = content.replace(
    /import\s*{\s*base44\s*}\s*from\s*['"]@\/api\/base44Client['"]/g,
    "import apiClient from '@/lib/apiClient'"
  );

  content = content.replace(
    /import\s*{\s*base44\s*}\s*from\s*['"]src\/api\/base44Client['"]/g,
    "import apiClient from '@/lib/apiClient'"
  );

  // Replace base44 usage with apiClient in code
  content = content.replace(/\bbase44\./g, 'apiClient.');
  content = content.replace(/\bbase44\(/g, 'apiClient(');

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
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes in your git diff');
  console.log('2. Test the application thoroughly');
  console.log('3. Start both backend (cd backend_protocall && npm run dev) and frontend (npm run dev)');
  console.log('4. Check for any remaining API compatibility issues\n');
}

main();
