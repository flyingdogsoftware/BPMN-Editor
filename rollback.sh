#!/bin/bash

echo "🔄 Starte Rollback zu TypeScript..."

# Prüfen, ob das Backup-Verzeichnis existiert
if [ ! -d "ts-backup" ]; then
  echo "❌ Fehler: Backup-Verzeichnis 'ts-backup' nicht gefunden!"
  exit 1
fi

# Alle .js Dateien löschen, die aus .ts Dateien entstanden sind
echo "🗑️ Lösche konvertierte JavaScript-Dateien..."
find src -type f -name "*.js" -delete
find src -type f -name "*.mjs" -delete

# Dateien aus dem Backup wiederherstellen
echo "📦 Stelle TypeScript-Dateien wieder her..."
cp -r ts-backup/src/* src/
cp ts-backup/package.json .
cp ts-backup/tsconfig.json . 2>/dev/null || true
cp ts-backup/svelte.config.js . 2>/dev/null || true

# jsconfig.json entfernen, falls vorhanden
echo "🧹 Entferne JavaScript-Konfigurationsdateien..."
rm -f jsconfig.json

# TypeScript-Pakete wieder installieren
echo "📦 Installiere TypeScript-Pakete wieder..."
npm install --save-dev typescript svelte-check

echo "✅ Rollback abgeschlossen! Dein Projekt verwendet wieder TypeScript."
echo "⚠️ Hinweis: Das verbesserte Konvertierungsskript 'ts-to-js-conversion-improved.sh' wurde beibehalten."
