"""
productions.py — Deduplicate and build the Productions node CSV.

Reads all production CSVs, normalizes titles, deduplicates by title,
and exports:
  • output/processed_productions.csv   — one row per unique production
  • output/prod_id_replacements.json   — old-ID → canonical-ID mapping

Output is used downstream by authors.py and co_authorships.py.
"""

import json

import polars as pl
from scripts.config import (
    CSV_SEPARATOR,
    OUTPUT_DIR,
    PRODUCAO_GLOB,
    PRODUCTION_COLUMNS,
    concat_csvs,
)


# ── Title normalisation ─────────────────────────────────────────────────────

def _normalize_title_scalar(text: str | None) -> str:
    """Normalize a single production title string (used via map_elements)."""
    if text is None:
        return ""
    norm = text
    # Strip surrounding quotes
    if len(norm) >= 2 and norm[0] == '"' and norm[-1] == '"':
        norm = norm[1:-1]
    # Collapse whitespace
    norm = " ".join(norm.split())
    return norm.strip()


# ── Main logic ───────────────────────────────────────────────────────────────

def build_productions() -> tuple[pl.DataFrame, dict[int, int]]:
    """
    Read, normalise, and deduplicate productions.

    Returns
    -------
    productions : pl.DataFrame
        One row per unique production (canonical ID kept).
    replacements : dict[int, int]
        Maps every duplicate production ID to its canonical ID.
    """
    lf = concat_csvs(PRODUCAO_GLOB, columns=PRODUCTION_COLUMNS)

    # Cast ID and year to integers
    lf = lf.with_columns(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL").cast(pl.Int64),
        pl.col("AN_BASE").cast(pl.Int32),
    )

    # Normalize titles
    print("⚙️  Normalizing titles…")
    lf = lf.with_columns(
        pl.col("NM_PRODUCAO")
        .map_elements(_normalize_title_scalar, return_dtype=pl.String)
        .alias("NM_PRODUCAO")
    )

    # Collect here since we need to extract rows to build replacements dict
    df = lf.collect()
    total_before = df.height
    print(f"   {total_before} production records loaded")

    # ── Deduplication by title ───────────────────────────────────────────
    print("⚙️  Deduplicating productions by title…")
    grouped = df.group_by("NM_PRODUCAO", maintain_order=True).agg(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL").alias("ALL_IDS"),
        pl.col("NM_TIPO_PRODUCAO").first(),
        pl.col("NM_SUBTIPO_PRODUCAO").first(),
        pl.col("AN_BASE").first(),
        pl.col("SG_ENTIDADE_ENSINO").first(),
        pl.col("NM_PROGRAMA_IES").first(),
        pl.col("NM_AREA_CONCENTRACAO").first(),
        pl.col("NM_LINHA_PESQUISA").first(),
        pl.col("NM_PROJETO").first(),
    )

    # Build replacement map: every non-first ID → first ID
    replacements: dict[int, int] = {}
    all_ids_series = grouped.get_column("ALL_IDS")
    for id_list in all_ids_series:
        if len(id_list) > 1:
            canonical = id_list[0]
            for dup_id in id_list[1:]:
                replacements[int(dup_id)] = int(canonical)

    # Flatten to keep canonical ID only
    productions = grouped.with_columns(
        pl.col("ALL_IDS").list.first().alias("ID_ADD_PRODUCAO_INTELECTUAL")
    ).drop("ALL_IDS")

    total_after = productions.height
    print(f"   ✅ {total_after} unique productions ({total_before - total_after} duplicates merged)")
    print(f"   ✅ {len(replacements)} ID replacements generated")

    return productions, replacements


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    productions, replacements = build_productions()

    # Write productions CSV
    out_csv = OUTPUT_DIR / "processed_productions.csv"
    productions.write_csv(out_csv, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_csv}")

    # Write replacement map (JSON keys must be strings)
    out_json = OUTPUT_DIR / "prod_id_replacements.json"
    str_replacements = {str(k): v for k, v in replacements.items()}
    with open(out_json, "w") as f:
        json.dump(str_replacements, f)
    print(f"   📄 Written to {out_json}")


if __name__ == "__main__":
    main()
