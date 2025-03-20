import fs from 'fs';
import path from 'path';

// Path to the built index.html file
const indexPath = path.join(process.cwd(), 'dist', 'index.html');

// Read the index.html file
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace asset paths (multiple variations to be safe)
html = html.replace(/src="\/traffic-light\//g, 'src="./');
html = html.replace(/href="\/traffic-light\//g, 'href="./');
html = html.replace(/src="https:\/\/pavelfalta\.github\.io\/traffic-light\//g, 'src="./');
html = html.replace(/href="https:\/\/pavelfalta\.github\.io\/traffic-light\//g, 'href="./');
html = html.replace(/src="https:\/\/pavelfalta\.github\.io\//g, 'src="./');
html = html.replace(/href="https:\/\/pavelfalta\.github\.io\//g, 'href="./');
html = html.replace(/src="\//g, 'src="./');
html = html.replace(/href="\//g, 'href="./');

// Make sure favicon uses relative path
html = html.replace(/href="(\.\/)?favicon.svg"/g, 'href="./favicon.svg"');

// Write the fixed HTML back to the file
fs.writeFileSync(indexPath, html);

// Copy files for GitHub Pages
try {
  fs.copyFileSync(path.join(process.cwd(), 'public', '.nojekyll'), path.join(process.cwd(), 'dist', '.nojekyll'));
  fs.copyFileSync(path.join(process.cwd(), 'public', '404.html'), path.join(process.cwd(), 'dist', '404.html'));
  fs.copyFileSync(path.join(process.cwd(), 'public', 'test.html'), path.join(process.cwd(), 'dist', 'test.html'));
  
  // Create a simple index.html redirect at the root if not exists
  if (!fs.existsSync(path.join(process.cwd(), '..', 'index.html'))) {
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Traffic Light App</title>
          <meta http-equiv="refresh" content="0; url=https://pavelfalta.github.io/">
        </head>
        <body>
          <p>Redirecting to the Traffic Light application...</p>
        </body>
      </html>
    `;
    fs.writeFileSync(path.join(process.cwd(), '..', 'index.html'), redirectHtml.trim());
  }
} catch (error) {
  console.error('Error copying files:', error);
}

console.log('Asset paths fixed successfully and GitHub Pages files copied!'); 