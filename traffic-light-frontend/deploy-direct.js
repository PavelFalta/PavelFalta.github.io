import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const distDir = path.join(__dirname, 'dist');
const targetDir = path.join(__dirname, '..', 'traffic-light');

// Function to copy directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Get all files and directories in the source
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy directories
      copyDir(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clear target directory first
if (fs.existsSync(targetDir)) {
  console.log(`Clearing ${targetDir}...`);
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// Copy the dist directory to the target
console.log(`Copying build files from ${distDir} to ${targetDir}...`);
copyDir(distDir, targetDir);

console.log('Deployment preparation complete! Now commit and push to deploy to GitHub Pages.'); 