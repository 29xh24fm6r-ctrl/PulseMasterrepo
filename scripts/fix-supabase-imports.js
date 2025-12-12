const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files that import from supabase/admin
const findFiles = () => {
  try {
    const result = execSync('powershell -Command "Get-ChildItem -Path lib -Recurse -Filter *.ts | Select-String -Pattern \'from.*supabase/admin\' | Select-Object -ExpandProperty Path -Unique"', { encoding: 'utf-8' });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding files:', error.message);
    return [];
  }
};

const fixFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Calculate relative path to lib/supabase.ts
    const fileDir = path.dirname(filePath);
    const relativePath = path.relative(fileDir, path.join(process.cwd(), 'lib', 'supabase'));
    const importPath = relativePath.replace(/\\/g, '/');
    const importPathNormalized = importPath.startsWith('.') ? importPath : `./${importPath}`;
    
    // Replace import statement
    content = content.replace(
      /import\s+{\s*supabaseAdminClient\s*}\s+from\s+['"]\.\.\/.*supabase\/admin['"];?/g,
      `import { supabaseAdmin } from '@/lib/supabase';`
    );
    
    // Replace all usages of supabaseAdminClient with supabaseAdmin
    content = content.replace(/supabaseAdminClient/g, 'supabaseAdmin');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
};

// Main execution
const files = findFiles();
console.log(`Found ${files.length} files to fix`);

let fixed = 0;
files.forEach(file => {
  if (fixFile(file)) {
    fixed++;
  }
});

console.log(`\nFixed ${fixed} files`);

