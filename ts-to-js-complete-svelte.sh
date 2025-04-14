#!/bin/bash

echo "🔁 Starting TypeScript to JavaScript conversion..."

# Create backup directory
echo "📦 Creating backup..."
mkdir -p ts-backup
find src -type f \( -name "*.ts" -o -name "*.mts" -o -name "*.svelte" \) -exec cp --parents {} ts-backup/ \;
cp package.json tsconfig.json vite.config.ts svelte.config.js ts-backup/ 2>/dev/null || true

# Create a temporary tsconfig for compilation
echo "🔧 Creating temporary tsconfig for compilation..."
cat > tsconfig.temp.json << EOL
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "isolatedModules": true,
    "noEmit": false,
    "noEmitOnError": false,
    "outDir": "js-output",
    "declaration": false,
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "$lib/*": ["src/lib/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.mts"],
  "exclude": ["node_modules", ".svelte-kit"]
}
EOL

# Replace $lib imports with relative paths
echo "🔧 Replacing \$lib imports with relative paths..."
node fix-lib-imports.cjs

# Compile TypeScript files to JavaScript
echo "🔧 Compiling TypeScript files to JavaScript..."
npx tsc --project tsconfig.temp.json --skipLibCheck --allowJs --noEmitOnError false

# Copy the compiled JavaScript files back to the src directory
echo "📦 Copying compiled JavaScript files..."
if [ -d "js-output/src" ]; then
  find js-output/src -type f -name "*.js" | while read file; do
    # Get the relative path from js-output/src
    rel_path=${file#js-output/src/}
    # Create the target directory if it doesn't exist
    target_dir=$(dirname "src/$rel_path")
    mkdir -p "$target_dir"
    # Copy the file
    cp "$file" "src/${rel_path}"
  done
else
  echo "⚠️ No compiled JavaScript files found. TypeScript compilation may have failed."
  exit 1
fi

# Process .svelte files - Extract TypeScript, convert to JavaScript, and replace
echo "✏️ Processing Svelte files..."
find src -type f -name "*.svelte" | while read file; do
  echo "Processing $file"
  
  # Create a temporary file for the processed Svelte file
  tmp_svelte=$(mktemp)
  
  # Check if the file contains TypeScript
  if grep -q "<script lang=\"ts\">" "$file"; then
    # Create a temporary directory for this file
    tmp_dir=$(mktemp -d)
    
    # Extract the TypeScript script content
    script_content=$(sed -n '/<script lang="ts">/,/<\/script>/p' "$file" | sed '1d;$d')
    
    # Create a temporary TypeScript file
    echo "$script_content" > "$tmp_dir/script.ts"
    
    # Create a temporary tsconfig for this script
    cat > "$tmp_dir/tsconfig.json" << EOL
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "allowJs": true,
    "checkJs": false,
    "noEmit": false,
    "noEmitOnError": false,
    "outDir": "./",
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "baseUrl": "../../",
    "paths": {
      "$lib/*": ["src/lib/*"]
    }
  },
  "files": ["script.ts"]
}
EOL
    
    # Compile the TypeScript script to JavaScript
    (cd "$tmp_dir" && npx tsc --skipLibCheck --noEmitOnError false)
    
    # Check if compilation was successful
    if [ -f "$tmp_dir/script.js" ]; then
      # Get the compiled JavaScript
      js_content=$(cat "$tmp_dir/script.js")
      
      # Replace the TypeScript script with the compiled JavaScript
      awk -v js="$js_content" '
        BEGIN { in_script=0; print_line=1 }
        /<script lang="ts">/ { in_script=1; print "<script>"; print js; print_line=0; next }
        /<\/script>/ { if (in_script) { in_script=0; print_line=1 } }
        { if (print_line) print }
      ' "$file" > "$tmp_svelte"
    else
      # If compilation failed, just replace the script tag
      sed 's/<script lang="ts">/<script>/g' "$file" > "$tmp_svelte"
    fi
    
    # Clean up temporary directory
    rm -rf "$tmp_dir"
  else
    # If no TypeScript, just copy the file
    cp "$file" "$tmp_svelte"
  fi
  
  # Move the processed file to its final location
  mv "$tmp_svelte" "$file"
done

# Remove original .ts files
echo "🗑️ Removing original TypeScript files..."
find src -type f -name "*.ts" -delete
find src -type f -name "*.mts" -delete

# Fix svelte/store.js imports
echo "🔧 Fixing svelte/store imports..."
find src -type f -name "*.js" -exec sed -i 's/svelte\/store\.js/svelte\/store/g' {} \;
find src -type f -name "*.svelte" -exec sed -i 's/svelte\/store\.js/svelte\/store/g' {} \;

# Create jsconfig.json
echo "📝 Creating jsconfig.json..."
cat > jsconfig.json << EOL
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "$lib/*": ["src/lib/*"]
    }
  }
}
EOL

# Remove TypeScript configuration files
echo "🧹 Removing TypeScript configuration files and temporary output directory..."
rm -f tsconfig.json tsconfig.node.json tsconfig.temp.json
rm -rf js-output

# Update package.json
echo "📦 Updating package.json..."
tmp_file=$(mktemp)

sed 's/"check": "svelte-kit sync && svelte-check --tsconfig .\/tsconfig.json"/"check": "svelte-kit sync"/g' package.json > "$tmp_file"
sed 's/"check:watch": "svelte-kit sync && svelte-check --tsconfig .\/tsconfig.json --watch"/"check:watch": "svelte-kit sync"/g' "$tmp_file" > "$tmp_file.2" && mv "$tmp_file.2" "$tmp_file"

mv "$tmp_file" package.json

# Uninstall TypeScript-related packages
echo "🗑️ Uninstalling TypeScript-related packages..."
npm uninstall typescript svelte-check @tsconfig/svelte @types/node

echo "✅ Conversion complete! Your project now runs on JavaScript."
echo "📋 A backup of your TypeScript files has been saved to the ts-backup directory."
echo ""
echo "⚠️ Note: This script uses the TypeScript compiler to convert both standalone .ts files"
echo "   and TypeScript code within Svelte files to JavaScript."
echo "   You may still need to manually fix some issues, especially with complex TypeScript syntax."
echo ""
echo "   If you encounter errors, check the backup in ts-backup/ to see the original code."
