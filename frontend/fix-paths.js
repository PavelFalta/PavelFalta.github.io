import fs from 'fs';
import path from 'path';

// Path to the built index.html file
const indexPath = path.join(process.cwd(), 'dist', 'index.html');

// Read the index.html file
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace asset paths
html = html.replace(/src="\/traffic-light\//g, 'src="./');
html = html.replace(/href="\/traffic-light\//g, 'href="./');

// Write the fixed HTML back to the file
fs.writeFileSync(indexPath, html);

console.log('Asset paths fixed successfully!'); 