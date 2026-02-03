import json
import zipfile
from pathlib import Path
import sys

def main():
    print("Building Chrome extension package...")
    
    # root = Path.cwd()
    # Ensure we use the script's directory as root if running from elsewhere, or CWD? 
    # original script used cd "$ROOT_DIR", so CWD is correct effectively.
    # But safer to be explicit if possible. script is in root.
    root = Path(__file__).parent.resolve()
    
    manifest_path = root / 'manifest.json'
    if not manifest_path.exists():
        print("Error: manifest.json not found!")
        sys.exit(1)

    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    version = manifest['version']
    out_dir = root / 'dist'
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / f'nix-utc-world-time-v{version}.zip'

    files = [
        'manifest.json',
        'background.js',
        'popup.html',
        'popup.js',
        'timeUtils.js',
        'timezoneDatabase.js',
        'icons/icon16.png',
        'icons/icon48.png',
        'icons/icon128.png',
        'icons/icons8-copy-24.png',
        'icons/icons8-trash-24.png',
    ]

    # Include all locale message files.
    locale_files = sorted((root / '_locales').glob('*/messages.json'))
    for p in locale_files:
        files.append(str(p.relative_to(root)))

    # Create zip
    try:
        with zipfile.ZipFile(out_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in files:
                p = root / file
                if not p.exists():
                    print(f"Error: Missing file: {file}")
                    sys.exit(1)
                zf.write(p, arcname=file)
                print(f"Added: {file}")
    except Exception as e:
        print(f"Error creating zip: {e}")
        sys.exit(1)

    print(f"\n✅ Successfully created {out_file}")

if __name__ == '__main__':
    main()
