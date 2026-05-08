"""
authors.py — Author entity-resolution and node CSV generation.

Phase 1 (this script):
  1. Unify the five person-ID columns into a single ID_PESSOA.
  2. Normalize author names (strip accents, remove special chars).
  3. Merge authors with a valid ID_PESSOA by that ID.
  4. Merge remaining authors (no ID) by exact normalised full name.
  5. Apply production-ID replacements from productions.py.
  6. Determine each author's primary type, category, university, etc.
     by taking the most-frequent value across their records.
  7. Count productions per author.
  8. Export output/processed_authors.csv

Phase 2 (TODO — future):
  • RapidFuzz-based fuzzy matching on orphan authors against the
    resolved set, weighted by co-authorship and institution overlap.

Output: output/processed_authors.csv
        output/processed_authors_compact.csv
"""

import json
import re
import unicodedata

import polars as pl
from scripts.config import (
    AUTORES_GLOB,
    AUTHOR_COLUMNS,
    AUTHOR_TYPE_TO_ID_COL,
    CSV_SEPARATOR,
    OUTPUT_DIR,
    PERSON_ID_COLUMNS,
    concat_csvs,
)


# ── Name normalisation helpers ───────────────────────────────────────────────

def _strip_accents(text: str) -> str:
    """Remove diacritical marks from a string."""
    nfkd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn")


def _normalize_name_scalar(name: str | None) -> str:
    """
    Normalize a single author name.
    Mirrors the legacy utils.normalize_name logic:
      - Reverses "LAST, FIRST" → "FIRST LAST"
      - Strips accents
      - Removes numbers, punctuation
      - Collapses whitespace
    """
    if name is None:
        return ""
    if "," in name:
        parts = name.split(", ")
        parts.reverse()
        norm = " ".join(parts)
    else:
        norm = name

    norm = _strip_accents(norm)
    norm = re.sub(r"[_-]", " ", norm)
    norm = re.sub(r"[0-9?&#;()]", "", norm)
    norm = " ".join(norm.split())  # collapse whitespace
    return norm.strip()


def _first_and_last_name(name: str | None) -> str:
    """Extract first and last name tokens."""
    if not name:
        return ""
    parts = name.split()
    if len(parts) <= 1:
        return name
    return f"{parts[0]} {parts[-1]}"


# ── ID unification ───────────────────────────────────────────────────────────

def unify_person_ids(df: pl.DataFrame) -> pl.DataFrame:
    """
    Create a single ID_PESSOA column from the five type-specific ID columns.
    Uses a vectorized when/then chain based on TP_AUTOR.
    """
    # Build a when/then chain for each author type
    expr = pl.lit(None).cast(pl.Int64)
    for tp_autor, id_col in AUTHOR_TYPE_TO_ID_COL.items():
        expr = (
            pl.when(
                (pl.col("TP_AUTOR") == tp_autor) & pl.col(id_col).is_not_null()
            )
            .then(pl.col(id_col).cast(pl.Int64))
            .otherwise(expr)
        )

    df = df.with_columns(expr.alias("ID_PESSOA"))
    df = df.drop(PERSON_ID_COLUMNS)
    return df


# ── Aggregation helper ───────────────────────────────────────────────────────

def _pick_most_frequent(col_name: str) -> pl.Expr:
    """
    Aggregation expression: within a group, return the most frequent
    non-null value of `col_name`.
    """
    return (
        pl.col(col_name)
        .drop_nulls()
        .mode()
        .first()
        .alias(col_name)
    )


# ── Main pipeline ────────────────────────────────────────────────────────────

def load_authors() -> pl.DataFrame:
    """Load and concatenate all author CSV files."""
    lf = concat_csvs(AUTORES_GLOB, columns=AUTHOR_COLUMNS)

    # Cast person-ID columns and production ID to Int64
    cast_cols = PERSON_ID_COLUMNS + ["ID_ADD_PRODUCAO_INTELECTUAL"]
    lf = lf.with_columns([
        pl.col(c).cast(pl.Int64, strict=False) for c in cast_cols
    ])
    
    # We collect here because the subsequent multi-pass resolution logic
    # uses many eager features (like filter height checks and map_elements).
    # Since we are backed by Parquet now, memory usage of the collected frame is much lower.
    df = lf.collect()
    print(f"   {df.height} author records loaded")
    return df


def normalize_and_prepare(df: pl.DataFrame) -> pl.DataFrame:
    """Normalize names, unify IDs, add helper columns."""
    print("⚙️  Normalizing author names…")
    df = df.with_columns(
        pl.col("NM_AUTOR")
        .map_elements(_normalize_name_scalar, return_dtype=pl.String)
        .alias("FULL_NAME")
    )

    print("⚙️  Creating FIRST_LAST_NAME helper…")
    df = df.with_columns(
        pl.col("FULL_NAME")
        .map_elements(_first_and_last_name, return_dtype=pl.String)
        .alias("FIRST_LAST_NAME")
    )

    print("⚙️  Unifying person IDs…")
    df = unify_person_ids(df)

    return df


def merge_by_id(df: pl.DataFrame) -> pl.DataFrame:
    """
    Group all author records that share the same ID_PESSOA.
    Aggregate metadata by most-frequent value; collect production IDs.
    """
    has_id = df.filter(pl.col("ID_PESSOA").is_not_null())
    print(f"⚙️  Merging {has_id.height} records with person IDs…")

    merged = has_id.group_by("ID_PESSOA", maintain_order=True).agg(
        pl.col("FULL_NAME").mode().first(),
        pl.col("FIRST_LAST_NAME").mode().first(),
        _pick_most_frequent("NM_AUTOR"),
        _pick_most_frequent("NM_ABNT_AUTOR"),
        _pick_most_frequent("TP_AUTOR"),
        _pick_most_frequent("NM_TP_CATEGORIA_DOCENTE"),
        _pick_most_frequent("NM_NIVEL_DISCENTE"),
        _pick_most_frequent("CD_PROGRAMA_IES"),
        _pick_most_frequent("NM_PROGRAMA_IES"),
        _pick_most_frequent("NM_AREA_CONHECIMENTO"),
        _pick_most_frequent("SG_ENTIDADE_ENSINO"),
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL"),  # keep as list
    )
    print(f"   ✅ {merged.height} unique authors with IDs")
    return merged


def merge_by_name(df: pl.DataFrame) -> pl.DataFrame:
    """
    Group all author records *without* an ID by their normalized full name.
    """
    no_id = df.filter(pl.col("ID_PESSOA").is_null())
    print(f"⚙️  Merging {no_id.height} records without person IDs (by name)…")

    merged = no_id.group_by("FULL_NAME", maintain_order=True).agg(
        pl.col("ID_PESSOA").first(),  # will be null
        pl.col("FIRST_LAST_NAME").first(),
        _pick_most_frequent("NM_AUTOR"),
        _pick_most_frequent("NM_ABNT_AUTOR"),
        _pick_most_frequent("TP_AUTOR"),
        _pick_most_frequent("NM_TP_CATEGORIA_DOCENTE"),
        _pick_most_frequent("NM_NIVEL_DISCENTE"),
        _pick_most_frequent("CD_PROGRAMA_IES"),
        _pick_most_frequent("NM_PROGRAMA_IES"),
        _pick_most_frequent("NM_AREA_CONHECIMENTO"),
        _pick_most_frequent("SG_ENTIDADE_ENSINO"),
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL"),  # keep as list
    )
    print(f"   ✅ {merged.height} unique authors without IDs")
    return merged


def merge_all_by_name(combined: pl.DataFrame) -> pl.DataFrame:
    """
    Final name-based merge pass: merges ID-matched authors with
    name-matched authors if they share the same FULL_NAME.
    Mirrors the legacy third-pass merge.
    """
    print(f"⚙️  Final merge pass on {combined.height} authors by FULL_NAME…")

    merged = combined.group_by("FULL_NAME", maintain_order=True).agg(
        pl.col("ID_PESSOA").drop_nulls().first(),
        pl.col("FIRST_LAST_NAME").first(),
        _pick_most_frequent("NM_AUTOR"),
        _pick_most_frequent("NM_ABNT_AUTOR"),
        _pick_most_frequent("TP_AUTOR"),
        _pick_most_frequent("NM_TP_CATEGORIA_DOCENTE"),
        _pick_most_frequent("NM_NIVEL_DISCENTE"),
        _pick_most_frequent("CD_PROGRAMA_IES"),
        _pick_most_frequent("NM_PROGRAMA_IES"),
        _pick_most_frequent("NM_AREA_CONHECIMENTO"),
        _pick_most_frequent("SG_ENTIDADE_ENSINO"),
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL").list.explode(keep_nulls=False, empty_as_null=False),
    )
    print(f"   ✅ {merged.height} authors after final merge")
    return merged


def apply_prod_replacements(df: pl.DataFrame) -> pl.DataFrame:
    """
    Replace duplicate production IDs with their canonical IDs using
    the mapping from productions.py.
    """
    replacements_path = OUTPUT_DIR / "prod_id_replacements.json"
    if not replacements_path.exists():
        print("   ⚠️  No prod_id_replacements.json found, skipping replacements")
        return df

    print("⚙️  Applying production ID replacements natively…")
    with open(replacements_path) as f:
        raw = json.load(f)
    replacements = {int(k): int(v) for k, v in raw.items()}

    if not replacements:
        print("   (no replacements to apply)")
        return df

    # Create a DataFrame for fast native join
    replacements_df = pl.DataFrame({
        "old_id": list(replacements.keys()),
        "new_id": list(replacements.values())
    }, schema={"old_id": pl.Int64, "new_id": pl.Int64})

    # Add a temporary row index to track rows across explode and group_by
    df = df.with_row_index("__row_idx")

    # Extract, explode and join
    exploded = df.select("__row_idx", "ID_ADD_PRODUCAO_INTELECTUAL").explode("ID_ADD_PRODUCAO_INTELECTUAL")
    exploded = exploded.join(replacements_df, left_on="ID_ADD_PRODUCAO_INTELECTUAL", right_on="old_id", how="left")

    # Replace old with new where matched, drop nulls just in case
    exploded = exploded.with_columns(
        pl.coalesce(["new_id", "ID_ADD_PRODUCAO_INTELECTUAL"]).alias("ID_ADD_PRODUCAO_INTELECTUAL")
    ).drop_nulls("ID_ADD_PRODUCAO_INTELECTUAL")

    # Group back to unique lists
    grouped = exploded.group_by("__row_idx", maintain_order=True).agg(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL").unique()
    )

    # Join back and cleanup
    df = df.drop("ID_ADD_PRODUCAO_INTELECTUAL").join(grouped, on="__row_idx", how="left").drop("__row_idx")

    print("   ✅ Replacements applied")
    return df


def finalize_authors(df: pl.DataFrame) -> pl.DataFrame:
    """
    Add production count, fill nulls, assign sequential index.
    """
    print("⚙️  Finalizing author records…")

    # Add production count
    df = df.with_columns(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL").list.len().alias("PROD_COUNT")
    )

    # Fill null TP_AUTOR
    df = df.with_columns(
        pl.col("TP_AUTOR").fill_null("NÃO INFORMADO")
    )

    # Drop helper columns
    df = df.drop(["FULL_NAME", "FIRST_LAST_NAME"])

    # Add an integer index (IDX) starting from 0
    df = df.with_row_index("IDX")

    return df


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load
    df = load_authors()

    # 2. Normalize & prepare
    df = normalize_and_prepare(df)

    # 3. Merge by ID
    merged_by_id = merge_by_id(df)

    # 4. Merge remaining by name
    merged_by_name = merge_by_name(df)

    # 5. Combine and do a final name-based pass
    #    Align column order (group_by key becomes first column in each)
    target_cols = merged_by_id.columns
    merged_by_name = merged_by_name.select(target_cols)
    combined = pl.concat([merged_by_id, merged_by_name])
    all_authors = merge_all_by_name(combined)

    # 6. Apply production ID replacements
    all_authors = apply_prod_replacements(all_authors)

    # 7. Finalize (add PROD_COUNT, fill nulls, add index)
    all_authors = finalize_authors(all_authors)

    # 8. Export — compact (one row per author, prod IDs as list)
    out_compact = OUTPUT_DIR / "processed_authors_compact.csv"
    compact_df = all_authors.with_columns(
        ("[" + pl.col("ID_ADD_PRODUCAO_INTELECTUAL").list.eval(pl.element().cast(pl.String)).list.join(", ") + "]")
        .alias("ID_ADD_PRODUCAO_INTELECTUAL")
    )
    compact_df.write_csv(out_compact, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_compact} ({all_authors.height} rows)")

    # 9. Export — exploded (one row per author×production, for Neo4j)
    authors_exploded = all_authors.explode("ID_ADD_PRODUCAO_INTELECTUAL")
    out_path = OUTPUT_DIR / "processed_authors.csv"
    authors_exploded.write_csv(out_path, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_path} ({authors_exploded.height} rows)")


if __name__ == "__main__":
    main()
