// fix-lib-imports.js
// Ersetzt alle $lib-Imports in .ts, .js und .svelte-Dateien durch relative Pfade

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const LIB_DIR = path.join(SRC_DIR, 'lib');

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist);
    } else if (/\.(ts|js|svelte)$/.test(file)) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

function replaceLibImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Regex für $lib-Importe
  // import ... from '$lib/xyz'
  // import type ... from '$lib/xyz'
  // import("$lib/xyz")
  const libImportRegex = /(['"`])\$lib\/([^'"]+)\1/g;

  let changed = false;
  content = content.replace(libImportRegex, (match, quote, importPath) => {
    // Zielpfad im Dateisystem
    const target = path.join(LIB_DIR, importPath);
    // Relativer Pfad von der aktuellen Datei zum Ziel
    let relPath = path.relative(path.dirname(filePath), target);
    // Für Imports: './' oder '../' am Anfang, keine Backslashes
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    relPath = relPath.replace(/\\/g, '/');
    changed = true;
    return `${quote}${relPath}${quote}`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Ersetzt $lib-Imports in: ${filePath}`);
  }
}

function main() {
  const files = walk(SRC_DIR);
  files.forEach(replaceLibImports);
  console.log('Alle $lib-Imports wurden ersetzt.');
}

main();