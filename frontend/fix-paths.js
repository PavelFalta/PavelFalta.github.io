import fs from 'fs';
import path from 'path';

// Path to the built index.html file
const indexPath = path.join(process.cwd(), 'dist', 'index.html');

// Read the index.html file
let html = fs.readFileSync(indexPath, 'utf-8');

// First, convert any absolute paths with base prefix to relative paths
html = html.replace(/src="\/traffic-light\//g, 'src="./');
html = html.replace(/href="\/traffic-light\//g, 'href="./');
html = html.replace(/src="https:\/\/pavelfalta\.github\.io\/traffic-light\//g, 'src="./');
html = html.replace(/href="https:\/\/pavelfalta\.github\.io\/traffic-light\//g, 'href="./');

// Then handle root paths that might be missing the base prefix
html = html.replace(/src="\//g, 'src="./');
html = html.replace(/href="\//g, 'href="./');

// Make sure favicon uses relative path
html = html.replace(/href="(\.\/)?favicon.svg"/g, 'href="./favicon.svg"');

// Make sure asset paths don't have double dots or slashes
html = html.replace(/\.\/\.\//g, './');
html = html.replace(/\.\/\//g, './');

// Write the fixed HTML back to the file
fs.writeFileSync(indexPath, html);

// Verify that all CSS and JS imports use relative URLs
const cssJsRegex = /(src|href)="([^"]+)"/g;
let match;
let isValid = true;

while ((match = cssJsRegex.exec(html)) !== null) {
  const attribute = match[1];
  const url = match[2];
  
  if (url.startsWith('http') || url.startsWith('//') || url === '#' || url === '') {
    // External URL or anchor, this is fine
    continue;
  }
  
  if (!url.startsWith('./') && !url.startsWith('../')) {
    console.warn(`Warning: Found possibly invalid ${attribute} URL: ${url}`);
    isValid = false;
  }
}

// Copy files for GitHub Pages
try {
  fs.copyFileSync(path.join(process.cwd(), 'public', '.nojekyll'), path.join(process.cwd(), 'dist', '.nojekyll'));
  fs.copyFileSync(path.join(process.cwd(), 'public', '404.html'), path.join(process.cwd(), 'dist', '404.html'));
} catch (error) {
  console.error('Error copying files:', error);
}

if (!isValid) {
  console.warn('Some URLs might not be correctly formatted as relative paths. Please check the output HTML.');
} else {
  console.log('Asset paths fixed successfully and GitHub Pages files copied!');
} 