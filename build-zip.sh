#!/bin/bash

# Build script for NIX UTC & World Time Chrome Extension
cd "/mnt/d/Documents/source/UTC Time Chrome Extension"

echo "Building Chrome extension package..."

# Remove old zip if exists
rm -f nix-utc-world-time-v1.0.zip

# Create new zip package with all required files
python3 << 'PYTHON_EOF'
import zipfile

files = [
    'manifest.json',
    'background.js',
    'popup.html', 
    'popup.js',
    'timezoneDatabase.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    'icons/icons8-copy-24.png',
    'icons/icons8-trash-24.png',
    '_locales/en/messages.json'
]

with zipfile.ZipFile('nix-utc-world-time-v1.0.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for file in files:
        zf.write(file)
        print(f"Added: {file}")

print("\n✅ Successfully created nix-utc-world-time-v1.0.zip")
PYTHON_EOF

# Show file size
ls -lh nix-utc-world-time-v1.0.zip