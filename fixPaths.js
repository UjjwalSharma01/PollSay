/**
 * This is a utility script to correct import paths in the codebase.
 * Run with Node.js: node fixPaths.js
 */

const fs = require('fs');
const path = require('path');

// Function to scan JS files for incorrect imports
function scanJsFiles(dir, importPattern, correctImport) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanJsFiles(filePath, importPattern, correctImport);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes(importPattern)) {
        console.log(`Found incorrect import in ${filePath}`);
        
        // Replace the incorrect import with the correct one
        const newContent = content.replace(
          new RegExp(importPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          correctImport
        );
        
        // Write the file back
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated ${filePath}`);
      }
    }
  });
}

// Scan for incorrect navigation imports
scanJsFiles(
  path.join(__dirname, 'public'),
  "from '../../../src/config/supabase.js'",
  "from '../../src/config/supabase.js'"
);

scanJsFiles(
  path.join(__dirname, 'public', 'dashboard'),
  "from '../js/navigation.js'",
  "from '../js/navigation.js'"
);

console.log('Path correction completed');
