"""
universities.py — Build the Universities node CSV.

Reads the courses dataset (cursos/) and groups by institution acronym
to produce a deduplicated university reference table.

Output: output/universities.csv
"""

import polars as pl
from scripts.config import (
    CSV_SEPARATOR,
    CURSOS_GLOB,
    OUTPUT_DIR,
    UNIVERSITY_COLUMNS,
    concat_csvs,
)


def build_universities() -> pl.DataFrame:
    """Scan all courses CSVs and produce a deduplicated universities table."""
    lf = concat_csvs(CURSOS_GLOB, columns=UNIVERSITY_COLUMNS)

    # Group by institution acronym, take the *last* value of every other column
    # (mirrors the legacy "agg('last')" behaviour — latest year wins)
    agg_exprs = [
        pl.col(c).last().alias(c)
        for c in UNIVERSITY_COLUMNS
        if c != "SG_ENTIDADE_ENSINO"
    ]
    universities = lf.group_by("SG_ENTIDADE_ENSINO").agg(agg_exprs).collect()

    print(f"   ✅ {universities.height} unique universities")
    return universities


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    universities = build_universities()

    out_path = OUTPUT_DIR / "universities.csv"
    universities.write_csv(out_path, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_path}")


if __name__ == "__main__":
    main()
