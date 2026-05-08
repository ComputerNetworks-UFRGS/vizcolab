"""
programs.py — Build the Programs node CSV.

Reads the programs dataset (programas/) and groups by program code
to produce a deduplicated graduate-program reference table.

Output: output/programs.csv
"""

import polars as pl
from scripts.config import (
    CSV_SEPARATOR,
    OUTPUT_DIR,
    PROGRAM_COLUMNS,
    PROGRAMAS_GLOB,
    concat_csvs,
)


def build_programs() -> pl.DataFrame:
    """Scan all program CSVs and produce a deduplicated programs table."""
    lf = concat_csvs(PROGRAMAS_GLOB, columns=PROGRAM_COLUMNS)

    # Group by program code, take the last value for each descriptive column
    agg_exprs = [
        pl.col(c).last().alias(c)
        for c in PROGRAM_COLUMNS
        if c != "CD_PROGRAMA_IES"
    ]
    programs = lf.group_by("CD_PROGRAMA_IES").agg(agg_exprs).collect()

    print(f"   ✅ {programs.height} unique programs")
    return programs


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    programs = build_programs()

    out_path = OUTPUT_DIR / "programs.csv"
    programs.write_csv(out_path, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_path}")


if __name__ == "__main__":
    main()
