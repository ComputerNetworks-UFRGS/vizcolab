import os
import glob
import re
from xlsx2csv import Xlsx2csv
from joblib import Parallel, delayed

DATASETS_DIR = "datasets"

RENAMING_RULES = {
    "producao_intelectual": ("br-capes-colsucup-producao-", "producoes-"),
    "cursos": ("br-capes-colsucup-curso-", "cursos-"),
    "autores": ("br-capes-colsucup-prod-autor-", "autores-"),
    "detalhes_producao": ("br-capes-colsucup-prod-detalhe-bibliografica-", "detalhes-prod-"),
    "programas": ("br-capes-colsucup-programa-", "programas-")
}

class UnescapeFileWrapper:
    """
    Wraps a file object to decode Excel's escaped characters (e.g. _x0020_)
    and HTML entities (e.g. &#65533;) before writing to the file.
    Delimiters inside the unescaped text are removed to prevent CSV corruption.
    """
    def __init__(self, file):
        self.file = file
        self.pattern_hex = re.compile(r'_x([0-9A-Fa-f]{4})_')
        self.pattern_dec = re.compile(r'&#(\d+);')

    def write(self, s):
        def repl_hex(match):
            try:
                val = int(match.group(1), 16)
                if val in (59, 10, 13, 34):  # ;, \n, \r, "
                    return ' '
                return chr(val)
            except ValueError:
                return match.group(0)

        def repl_dec(match):
            try:
                val = int(match.group(1))
                if val in (59, 10, 13, 34):  # ;, \n, \r, "
                    return ' '
                return chr(val)
            except ValueError:
                return match.group(0)
        
        s = self.pattern_hex.sub(repl_hex, s)
        s = self.pattern_dec.sub(repl_dec, s)
        self.file.write(s)

    def close(self):
        self.file.close()
        
    def flush(self):
        self.file.flush()

def convert_single_file(xlsx_file, dir_path, prefix, new_prefix):
    filename = os.path.basename(xlsx_file)
    new_filename = filename.replace(prefix, new_prefix).replace(".xlsx", ".csv")
    csv_path = os.path.join(dir_path, new_filename)
    
    print(f"Converting {filename} to {new_filename}...")
    
    try:
        with open(csv_path, 'w', encoding='iso8859_1', errors='replace', newline='') as f:
            wrapper = UnescapeFileWrapper(f)
            Xlsx2csv(xlsx_file, delimiter=';').convert(wrapper)
        print(f"Successfully converted {filename}")
    except Exception as e:
        print(f"Error converting {filename}: {e}")

def process_files():
    tasks = []
    for sub_dir, (prefix, new_prefix) in RENAMING_RULES.items():
        dir_path = os.path.join(DATASETS_DIR, sub_dir)
        if not os.path.exists(dir_path):
            print(f"Directory {dir_path} does not exist, skipping.")
            continue
        
        search_pattern = os.path.join(dir_path, f"{prefix}*.xlsx")
        xlsx_files = glob.glob(search_pattern)
        
        for xlsx_file in xlsx_files:
            tasks.append((xlsx_file, dir_path, prefix, new_prefix))
            
    if tasks:
        print(f"Found {len(tasks)} files to convert. Processing in parallel...")
        Parallel(n_jobs=-1)(delayed(convert_single_file)(*task) for task in tasks)
        print("All conversions completed.")
    else:
        print("No files found to convert.")

if __name__ == "__main__":
    process_files()
