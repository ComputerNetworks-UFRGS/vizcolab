"""
05_co_authorships.py — Build co-authorship edge CSVs.

Reads the processed authors (compact form — one row per author with a
list of production IDs), explodes, and self-joins to generate unique
co-author pairs.

Outputs:
  • output/co_authorships.csv              — (AUTHOR_1, AUTHOR_2, PROD_ID)
  • output/co_author_collabs_per_year.csv  — pivoted by AN_BASE
"""

import polars as pl
from scripts.config import CSV_SEPARATOR, OUTPUT_DIR


def build_co_authorships() -> pl.DataFrame:
    """
    Generate co-authorship pairs from the compact authors file.

    Each row in the output represents one co-authorship event:
    (AUTHOR_1, AUTHOR_2, PROD_ID) where AUTHOR_1 < AUTHOR_2.
    """
    compact_path = OUTPUT_DIR / "processed_authors_compact.csv"
    if not compact_path.exists():
        raise FileNotFoundError(
            f"{compact_path} not found. Run 04_authors.py first."
        )

    print("⚙️  Loading compact authors…")
    authors = pl.read_csv(compact_path, separator=CSV_SEPARATOR)

    # The ID_ADD_PRODUCAO_INTELECTUAL column is stored as a string repr
    # of a list (e.g. "[123, 456]"). Parse it back.
    authors = authors.with_columns(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL")
        .str.replace_all(r"[\[\] ]", "")
        .str.split(",")
        .list.eval(pl.element().cast(pl.Int64, strict=False))
        .list.drop_nulls()
        .alias("PROD_IDS")
    )

    # Explode to (IDX, PROD_ID)
    author_prod = (
        authors
        .select(pl.col("IDX"), pl.col("PROD_IDS"))
        .explode("PROD_IDS")
        .rename({"PROD_IDS": "PROD_ID"})
        .filter(pl.col("PROD_ID").is_not_null())
    )

    print(f"   {author_prod.height} (author, production) pairs")

    # Self-join on PROD_ID to get co-author pairs
    print("⚙️  Computing co-authorship pairs (self-join)…")
    co_auth = (
        author_prod
        .join(author_prod, on="PROD_ID", suffix="_right")
        .filter(pl.col("IDX") < pl.col("IDX_right"))
        .select(
            pl.col("IDX").alias("AUTHOR_1"),
            pl.col("IDX_right").alias("AUTHOR_2"),
            pl.col("PROD_ID"),
        )
    )

    print(f"   ✅ {co_auth.height} co-authorship events")
    return co_auth


def build_collabs_per_year(co_auth: pl.DataFrame) -> pl.DataFrame:
    """
    Pivot co-authorships by year using production metadata.
    """
    prod_path = OUTPUT_DIR / "processed_productions.csv"
    if not prod_path.exists():
        raise FileNotFoundError(
            f"{prod_path} not found. Run 03_productions.py first."
        )

    print("⚙️  Pivoting collaborations by year…")
    productions = pl.read_csv(prod_path, separator=CSV_SEPARATOR)
    productions = productions.select(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL"),
        pl.col("AN_BASE").cast(pl.Int32),
    )

    # Join co-authorships with production year
    merged = co_auth.join(
        productions,
        left_on="PROD_ID",
        right_on="ID_ADD_PRODUCAO_INTELECTUAL",
        how="left",
    )

    # Count collaborations per (author pair, year)
    collabs = (
        merged
        .group_by(["AUTHOR_1", "AUTHOR_2", "AN_BASE"])
        .agg(pl.len().alias("collabs_count"))
    )

    # Pivot years into columns
    pivoted = collabs.pivot(
        on="AN_BASE",
        index=["AUTHOR_1", "AUTHOR_2"],
        values="collabs_count",
    ).fill_null(0)

    # Sort year columns
    year_cols = sorted([c for c in pivoted.columns if c not in ("AUTHOR_1", "AUTHOR_2")])
    pivoted = pivoted.select(["AUTHOR_1", "AUTHOR_2"] + year_cols)

    print(f"   ✅ {pivoted.height} unique co-author pairs with yearly breakdown")
    return pivoted


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    co_auth = build_co_authorships()

    # Write raw co-authorships
    out_co = OUTPUT_DIR / "co_authorships.csv"
    co_auth.write_csv(out_co, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_co}")

    # Write yearly pivot
    pivoted = build_collabs_per_year(co_auth)
    out_yearly = OUTPUT_DIR / "co_author_collabs_per_year.csv"
    pivoted.write_csv(out_yearly, separator=CSV_SEPARATOR)
    print(f"   📄 Written to {out_yearly}")


if __name__ == "__main__":
    main()
