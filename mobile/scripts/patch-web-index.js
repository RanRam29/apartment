const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`File not found: ${indexPath}`);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (html.includes('type="module"')) {
  process.exit(0);
}

const patchedHtml = html.replace('<script src="/', '<script type="module" src="/');
fs.writeFileSync(indexPath, patchedHtml, 'utf8');
