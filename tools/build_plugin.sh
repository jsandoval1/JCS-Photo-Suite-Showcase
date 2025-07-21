#!/bin/bash
# Open terminal, use Bash and run this script using the command: "./build_plugin.sh"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

PLUGIN_DIR="jcs-photo-suite-plugin"
ADMIN_JS_DIR="$PLUGIN_DIR/WEB_ROOT/admin/javascript"
STUDENTS_HTML="$PLUGIN_DIR/WEB_ROOT/admin/students/JCS-Students-Photo.html"
STAFF_HTML="$PLUGIN_DIR/WEB_ROOT/admin/faculty/JCS-Teacher-Photo.html"
ZIP_NAME="$PLUGIN_DIR/plugin.zip"
TEMP_DIR="temp_plugin_build"

# Usage: ./build_plugin.sh <LICENSE_KEY> <DISTRICT_NAME> <EMAIL> <TOKEN> <TIMESTAMP>
LICENSE_KEY=$1
DISTRICT_NAME=$2
EMAIL=$3
TOKEN=$4
TIMESTAMP=$5

WATERMARK="JCS Photo Suite Watermark: License Key: $LICENSE_KEY, District: $DISTRICT_NAME, Email: $EMAIL, Token: $TOKEN, Downloaded: $TIMESTAMP"

# 1. Copy plugin files to temp dir
# 2. Inject watermark into JS, HTML, CSS
# 3. Obfuscate JS
# 4. Bundle to ZIP: downloads/$TOKEN.zip

# 6. Prepare temp directory for zipping
echo "Preparing temp directory for zipping..."
rm -rf "$TEMP_DIR"
mkdir "$TEMP_DIR"
cp "$PLUGIN_DIR/plugin.xml" "$TEMP_DIR/"
cp -r "$PLUGIN_DIR/WEB_ROOT" "$TEMP_DIR/"
cp -r "$PLUGIN_DIR/pagecataloging" "$TEMP_DIR/"

# Inject watermark into minimal loader JS files (no obfuscation needed for loaders)
for f in $TEMP_DIR/WEB_ROOT/admin/javascript/*-Loader.js; do
  if [ -f "$f" ]; then
    tmpfile=$(mktemp)
    echo "/*" > "$tmpfile"
    echo " * JCS Photo Suite Watermark" >> "$tmpfile"
    echo " * License Key: $LICENSE_KEY" >> "$tmpfile"
    echo " * District: $DISTRICT_NAME" >> "$tmpfile"
    echo " * Email: $EMAIL" >> "$tmpfile"
    echo " * Token: $TOKEN" >> "$tmpfile"
    echo " * Downloaded: $TIMESTAMP" >> "$tmpfile"
    echo " * CDN-Enabled Plugin Build" >> "$tmpfile"
    echo " */" >> "$tmpfile"
    cat "$f" >> "$tmpfile"
    mv "$tmpfile" "$f"
  fi
done

# Remove any non-loader JS files (they're now served from CDN)
find "$TEMP_DIR/WEB_ROOT/admin/javascript" -name "*.js" ! -name "*-Loader.js" -delete

# 3. Inject watermark into HTML
for f in $(find $TEMP_DIR/WEB_ROOT -name "*.html"); do
  tmpfile=$(mktemp)
  echo "<!--" > "$tmpfile"
  echo "  JCS Photo Suite Watermark" >> "$tmpfile"
  echo "  License Key: $LICENSE_KEY" >> "$tmpfile"
  echo "  District: $DISTRICT_NAME" >> "$tmpfile"
  echo "  Email: $EMAIL" >> "$tmpfile"
  echo "  Token: $TOKEN" >> "$tmpfile"
  echo "  Downloaded: $TIMESTAMP" >> "$tmpfile"
  echo "-->" >> "$tmpfile"
  cat "$f" >> "$tmpfile"
  mv "$tmpfile" "$f"
done

# 4. Inject watermark into CSS
for f in $(find $TEMP_DIR/WEB_ROOT -name "*.css"); do
  tmpfile=$(mktemp)
  echo "/*" > "$tmpfile"
  echo " * JCS Photo Suite Watermark" >> "$tmpfile"
  echo " * License Key: $LICENSE_KEY" >> "$tmpfile"
  echo " * District: $DISTRICT_NAME" >> "$tmpfile"
  echo " * Email: $EMAIL" >> "$tmpfile"
  echo " * Token: $TOKEN" >> "$tmpfile"
  echo " * Downloaded: $TIMESTAMP" >> "$tmpfile"
  echo " */" >> "$tmpfile"
  cat "$f" >> "$tmpfile"
  mv "$tmpfile" "$f"
done

# HTML files already reference the loader scripts, no changes needed
echo "CDN-enabled build: HTML files reference minimal loaders..."

# Remove all .bak files from temp dir
find "$TEMP_DIR/WEB_ROOT" -type f -name "*.bak" -delete

# 7. Create the ZIP using zip (not PowerShell)
echo "Creating plugin ZIP..."
cd "$TEMP_DIR"
zip -r plugin.zip plugin.xml WEB_ROOT pagecataloging
cd ..

# 8. Move the zip to the plugin dir
mkdir -p downloads
mv "$TEMP_DIR/plugin.zip" "downloads/$TOKEN.zip"

# 10. Clean up temp directory
echo "Cleaning up temp directory..."
rm -rf "$TEMP_DIR"

echo "CDN-enabled build complete! Minimal plugin ZIP is at downloads/$TOKEN.zip"
echo "Core functionality will be loaded from CDN based on license validation"
