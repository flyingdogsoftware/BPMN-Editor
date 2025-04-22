#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Hilfsfunktion zum Finden von Dateien
function findFiles(dir, pattern, excludeDirs = []) {
  const excludePattern = excludeDirs.length > 0 
    ? `-not \\( ${excludeDirs.map(d => `-path "*/${d}/*"`).join(' -o ')} \\)` 
    : '';
  const command = `find ${dir} -name "${pattern}" ${excludePattern}`;
  
  try {
    return execSync(command).toString().trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Fehler beim Suchen von Dateien: ${pattern}`);
    return [];
  }
}

// Svelte-Datei aktualisieren, um nur Importe zu ändern
function updateSvelteImports(filePath) {
  console.log(`Aktualisiere Importe in: ${filePath}`);
  
  // Svelte-Datei lesen
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Nur die Importe aktualisieren
  const updatedContent = content.replace(/from\s+['"](.+)\.ts['"]/g, "from '$1.js'");
  
  // Nur schreiben, wenn sich etwas geändert hat
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Importe aktualisiert in: ${filePath}`);
  } else {
    console.log(`Keine Änderungen in: ${filePath}`);
  }
}

// JavaScript-Datei aktualisieren, um Importe zu ändern
function updateJsImports(filePath) {
  console.log(`Aktualisiere Importe in: ${filePath}`);
  
  // JavaScript-Datei lesen
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Nur die Importe aktualisieren
  const updatedContent = content.replace(/from\s+['"](.+)\.ts['"]/g, "from '$1.js'");
  
  // Nur schreiben, wenn sich etwas geändert hat
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Importe aktualisiert in: ${filePath}`);
  } else {
    console.log(`Keine Änderungen in: ${filePath}`);
  }
}

// Hauptfunktion
function main() {
  console.log('=== Aktualisiere Importe ===');
  
  // Alle Svelte-Dateien finden
  const svelteFiles = findFiles('./src', "*.svelte", ['node_modules', '.svelte-kit', 'build', 'dist']);
  
  // Alle JavaScript-Dateien finden
  const jsFiles = findFiles('./src', "*.js", ['node_modules', '.svelte-kit', 'build', 'dist']);
  
  // Importe in Svelte-Dateien aktualisieren
  for (const file of svelteFiles) {
    updateSvelteImports(file);
  }
  
  // Importe in JavaScript-Dateien aktualisieren
  for (const file of jsFiles) {
    updateJsImports(file);
  }
  
  console.log('\n=== Aktualisierung abgeschlossen ===');
}

// Skript starten
main();
