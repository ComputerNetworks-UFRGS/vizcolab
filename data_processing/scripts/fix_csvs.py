import glob
import re
import os

def fix_csvs():
    pattern = re.compile(r'_x([0-9A-Fa-f]{4})_')
    
    def repl(match):
        try:
            return chr(int(match.group(1), 16))
        except ValueError:
            return match.group(0)

    csv_files = glob.glob('datasets/**/*.csv', recursive=True)
    
    for csv_file in csv_files:
        print(f"Fixing {csv_file}...")
        try:
            with open(csv_file, 'r', encoding='iso8859_1', errors='replace') as f:
                content = f.read()
            
            new_content = pattern.sub(repl, content)
            
            if new_content != content:
                with open(csv_file, 'w', encoding='iso8859_1', errors='replace') as f:
                    f.write(new_content)
                print(f"  -> Fixed and saved.")
            else:
                print(f"  -> No changes needed.")
        except Exception as e:
            print(f"  -> Error: {e}")

if __name__ == "__main__":
    fix_csvs()
