"""
Shared configuration for the Vizcolab data-processing pipeline.

All paths are relative to `data_processing/` (the expected working directory).
"""

import glob as _glob
import io as _io
from pathlib import Path

import polars as pl

# ── Directories ──────────────────────────────────────────────────────────────

DATASETS_DIR = Path("datasets")
OUTPUT_DIR = Path("output")

AUTORES_DIR = DATASETS_DIR / "autores"
PRODUCAO_DIR = DATASETS_DIR / "producao_intelectual"
CURSOS_DIR = DATASETS_DIR / "cursos"
PROGRAMAS_DIR = DATASETS_DIR / "programas"
DETALHES_DIR = DATASETS_DIR / "detalhes_producao"

# ── CSV conventions (input files) ────────────────────────────────────────────

CSV_SEPARATOR = ";"
CSV_ENCODING = "iso8859-1"  # Polars uses IANA names

# ── Glob patterns for multi-file datasets ────────────────────────────────────

AUTORES_GLOB = str(AUTORES_DIR / "autores-*.csv")
PRODUCAO_GLOB = str(PRODUCAO_DIR / "producoes-*.csv")
CURSOS_GLOB = str(CURSOS_DIR / "cursos-*.csv")
PROGRAMAS_GLOB = str(PROGRAMAS_DIR / "br-capes-colsucup-prog-*.csv")
DETALHES_GLOB = str(DETALHES_DIR / "detalhes-prod-*.csv")

# ── Column lists (fields of interest) ────────────────────────────────────────

AUTHOR_COLUMNS = [
    "NM_AUTOR",
    "NM_ABNT_AUTOR",
    "TP_AUTOR",
    "NM_TP_CATEGORIA_DOCENTE",
    "NM_NIVEL_DISCENTE",
    "CD_PROGRAMA_IES",
    "NM_PROGRAMA_IES",
    "NM_AREA_CONHECIMENTO",
    "SG_ENTIDADE_ENSINO",
    "ID_PESSOA_DISCENTE",
    "ID_PESSOA_DOCENTE",
    "ID_PESSOA_PART_EXTERNO",
    "ID_PESSOA_POS_DOC",
    "ID_PESSOA_EGRESSO",
    "ID_ADD_PRODUCAO_INTELECTUAL",
]

PRODUCTION_COLUMNS = [
    "ID_ADD_PRODUCAO_INTELECTUAL",
    "NM_PRODUCAO",
    "NM_TIPO_PRODUCAO",
    "NM_SUBTIPO_PRODUCAO",
    "AN_BASE",
    "SG_ENTIDADE_ENSINO",
    "NM_PROGRAMA_IES",
    "NM_AREA_CONCENTRACAO",
    "NM_LINHA_PESQUISA",
    "NM_PROJETO",
]

UNIVERSITY_COLUMNS = [
    "SG_ENTIDADE_ENSINO",
    "CD_ENTIDADE_CAPES",
    "CD_ENTIDADE_EMEC",
    "NM_ENTIDADE_ENSINO",
    "CS_STATUS_JURIDICO",
    "DS_DEPENDENCIA_ADMINISTRATIVA",
    "NM_REGIAO",
    "SG_UF_PROGRAMA",
    "NM_MUNICIPIO_PROGRAMA_IES",
]

PROGRAM_COLUMNS = [
    "CD_PROGRAMA_IES",
    "SG_ENTIDADE_ENSINO",
    "NM_PROGRAMA_IES",
    "NM_GRANDE_AREA_CONHECIMENTO",
    "NM_AREA_CONHECIMENTO",
    "NM_SUBAREA_CONHECIMENTO",
    "NM_ESPECIALIDADE",
    "NM_AREA_AVALIACAO",
]

# ── Person-ID columns (used for entity resolution) ──────────────────────────

PERSON_ID_COLUMNS = [
    "ID_PESSOA_DOCENTE",
    "ID_PESSOA_DISCENTE",
    "ID_PESSOA_EGRESSO",
    "ID_PESSOA_POS_DOC",
    "ID_PESSOA_PART_EXTERNO",
]

# Map TP_AUTOR values to the corresponding ID column
AUTHOR_TYPE_TO_ID_COL = {
    "DOCENTE": "ID_PESSOA_DOCENTE",
    "DISCENTE": "ID_PESSOA_DISCENTE",
    "EGRESSO": "ID_PESSOA_EGRESSO",
    "PÓS-DOC": "ID_PESSOA_POS_DOC",
    "PARTICIPANTE EXTERNO": "ID_PESSOA_PART_EXTERNO",
}

# Priority lists for resolving multi-value fields to a single value
AUTHOR_TYPE_PRIORITY = [
    "DOCENTE",
    "EGRESSO",
    "PÓS-DOC",
    "DISCENTE",
    "PARTICIPANTE EXTERNO",
]

CATEGORIA_DOCENTE_PRIORITY = [
    "PERMANENTE",
    "COLABORADOR",
    "VISITANTE",
]

NIVEL_DISCENTE_PRIORITY = [
    "DOUTORADO PROFISSIONAL",
    "BACHARELADO",
    "MESTRADO",
    "DOUTORADO",
    "MESTRADO PROFISSIONAL",
]


# ── I/O helpers ──────────────────────────────────────────────────────────────

def read_csv_latin1(
    path: str | Path,
    *,
    separator: str = CSV_SEPARATOR,
    columns: list[str] | None = None,
    infer_schema_length: int = 0,
) -> pl.DataFrame:
    """
    Read a single CSV file encoded in iso8859-1 into a Polars DataFrame.

    Polars only supports utf-8 natively, so we re-encode on the fly.
    Using infer_schema_length=0 (all strings) by default to avoid
    type-inference issues; callers can cast columns as needed.
    """
    with open(path, "rb") as f:
        raw = f.read()
    utf8_bytes = raw.decode("iso8859-1").encode("utf-8")

    df = pl.read_csv(
        _io.BytesIO(utf8_bytes),
        separator=separator,
        infer_schema_length=infer_schema_length,
    )
    if columns is not None:
        df = df.select(columns)
    return df


def concat_csvs(
    glob_pattern: str,
    *,
    columns: list[str] | None = None,
) -> pl.LazyFrame:
    """
    Convert matching iso8859-1 CSVs to UTF-8 Parquet (cached) and return a LazyFrame.
    """
    csv_files = sorted(_glob.glob(glob_pattern))
    if not csv_files:
        raise FileNotFoundError(f"No CSVs found matching {glob_pattern}")

    cache_dir = Path(".cache_parquet")
    cache_dir.mkdir(exist_ok=True)
    
    parquet_files = []
    
    for csv_file in csv_files:
        csv_path = Path(csv_file)
        # Create a matching parquet filename
        pq_path = cache_dir / f"{csv_path.stem}.parquet"
        parquet_files.append(str(pq_path))
        
        if not pq_path.exists():
            print(f"   [Cache] Converting {csv_path.name} to Parquet…")
            df = read_csv_latin1(csv_file, columns=columns)
            df.write_parquet(pq_path)

    return pl.scan_parquet(parquet_files)
