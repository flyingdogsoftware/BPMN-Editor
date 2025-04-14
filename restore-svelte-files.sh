#!/bin/bash

echo "🔄 Restoring Svelte files from backup..."

# Find all Svelte files with broken imports
files=$(find src -type f -name "*.svelte" -exec grep -l "\\\\1\\\\2" {} \;)

for file in $files; do
  echo "Processing $file"
  
  # Get the original file from the backup
  backup_file="ts-backup/$file"
  
  if [ -f "$backup_file" ]; then
    echo "  Restoring from backup: $backup_file"
    cp "$backup_file" "$file"
  else
    echo "  No backup found for $file, skipping"
  fi
done

echo "✅ Restored Svelte files from backup."
