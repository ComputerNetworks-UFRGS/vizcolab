"""
aggregate_yearly.py — Generates yearly production and collaboration counts.

Produces:
- output/author_yearly_stats.csv
- output/co_author_yearly_stats.csv
- output/university_yearly_stats.csv
- output/program_yearly_stats.csv
- output/university_collab_yearly_stats.csv
- output/program_collab_yearly_stats.csv
"""

import polars as pl
from pathlib import Path
from scripts.config import OUTPUT_DIR, CSV_SEPARATOR

# Starting year from application constants
FIRST_YEAR = 2017
# Current max year in data
LAST_YEAR = 2024
YEARS = list(range(FIRST_YEAR, LAST_YEAR + 1))

def list_to_cypher_array(l):
    """Convert a list of integers to a string format like [0, 1, 2]."""
    return "[" + ", ".join(map(str, l)) + "]"

def main():
    print("🚀 Starting yearly aggregation...")
    
    # 1. Load data
    print("⚙️  Loading base data...")
    productions = pl.read_csv(OUTPUT_DIR / "processed_productions.csv", separator=CSV_SEPARATOR)
    authors_compact = pl.read_csv(OUTPUT_DIR / "processed_authors_compact.csv", separator=CSV_SEPARATOR)
    co_authorships = pl.read_csv(OUTPUT_DIR / "co_authorships.csv", separator=CSV_SEPARATOR)
    
    # Filter productions to relevant years
    productions = productions.filter((pl.col("AN_BASE") >= FIRST_YEAR) & (pl.col("AN_BASE") <= LAST_YEAR))
    
    # 2. Author Yearly Production Counts
    print("⚙️  Aggregating Author yearly productions...")
    # Explode the production IDs list in authors_compact
    # The IDs are stored as strings like "[1, 2, 3]" in the CSV
    authors_exploded = authors_compact.with_columns(
        pl.col("ID_ADD_PRODUCAO_INTELECTUAL")
        .str.strip_chars("[]")
        .str.split(", ")
        .alias("PROD_ID_LIST")
    ).explode("PROD_ID_LIST")
    
    authors_exploded = authors_exploded.with_columns(
        pl.col("PROD_ID_LIST").cast(pl.Int64)
    )
    
    # Join with productions to get year
    author_prods_with_year = authors_exploded.join(
        productions.select(["ID_ADD_PRODUCAO_INTELECTUAL", "AN_BASE"]),
        left_on="PROD_ID_LIST",
        right_on="ID_ADD_PRODUCAO_INTELECTUAL"
    )
    
    author_yearly = author_prods_with_year.group_by(["IDX", "AN_BASE"]).count()
    
    # Pivot to get years as columns
    author_yearly_pivot = author_yearly.pivot(
        index="IDX", columns="AN_BASE", values="count"
    ).fill_null(0)
    
    # Ensure all years exist
    for year in YEARS:
        if str(year) not in author_yearly_pivot.columns:
            author_yearly_pivot = author_yearly_pivot.with_columns(pl.lit(0).alias(str(year)))
            
    # Create the list property
    author_yearly_pivot = author_yearly_pivot.with_columns(
        pl.concat_list([str(y) for y in YEARS]).alias("prod_counts_per_year")
    )
    
    author_yearly_pivot.select(["IDX", "prod_counts_per_year"]).write_csv(OUTPUT_DIR / "author_yearly_stats.csv", separator=CSV_SEPARATOR)
    print(f"   ✅ Author stats saved ({author_yearly_pivot.height} rows)")

    # 3. Co-Author Yearly Collaboration Counts
    print("⚙️  Aggregating Co-Author yearly collaborations...")
    co_author_with_year = co_authorships.join(
        productions.select(["ID_ADD_PRODUCAO_INTELECTUAL", "AN_BASE"]),
        left_on="PROD_ID",
        right_on="ID_ADD_PRODUCAO_INTELECTUAL"
    )
    
    co_author_yearly = co_author_with_year.group_by(["AUTHOR_1", "AUTHOR_2", "AN_BASE"]).count()
    
    co_author_yearly_pivot = co_author_yearly.pivot(
        index=["AUTHOR_1", "AUTHOR_2"], columns="AN_BASE", values="count"
    ).fill_null(0)
    
    for year in YEARS:
        if str(year) not in co_author_yearly_pivot.columns:
            co_author_yearly_pivot = co_author_yearly_pivot.with_columns(pl.lit(0).alias(str(year)))
            
    co_author_yearly_pivot = co_author_yearly_pivot.with_columns(
        pl.concat_list([str(y) for y in YEARS]).alias("collab_counts_per_year")
    )
    
    co_author_yearly_pivot.select(["AUTHOR_1", "AUTHOR_2", "collab_counts_per_year"]).write_csv(OUTPUT_DIR / "co_author_yearly_stats.csv", separator=CSV_SEPARATOR)
    print(f"   ✅ Co-Author stats saved ({co_author_yearly_pivot.height} rows)")

    # 4. University Yearly Production Counts
    print("⚙️  Aggregating University yearly productions...")
    uni_prods = productions.select(["SG_ENTIDADE_ENSINO", "AN_BASE", "ID_ADD_PRODUCAO_INTELECTUAL"]).unique()
    uni_yearly = uni_prods.group_by(["SG_ENTIDADE_ENSINO", "AN_BASE"]).count()
    
    uni_yearly_pivot = uni_yearly.pivot(
        index="SG_ENTIDADE_ENSINO", columns="AN_BASE", values="count"
    ).fill_null(0)
    
    for year in YEARS:
        if str(year) not in uni_yearly_pivot.columns:
            uni_yearly_pivot = uni_yearly_pivot.with_columns(pl.lit(0).alias(str(year)))
            
    uni_yearly_pivot = uni_yearly_pivot.with_columns(
        pl.concat_list([str(y) for y in YEARS]).alias("prod_counts_per_year")
    )
    
    uni_yearly_pivot.select(["SG_ENTIDADE_ENSINO", "prod_counts_per_year"]).write_csv(OUTPUT_DIR / "university_yearly_stats.csv", separator=CSV_SEPARATOR)
    print(f"   ✅ University stats saved ({uni_yearly_pivot.height} rows)")

    # 5. Program Yearly Production Counts
    print("⚙️  Aggregating Program yearly productions...")
    prog_prods = productions.select(["NM_PROGRAMA_IES", "AN_BASE", "ID_ADD_PRODUCAO_INTELECTUAL"]).unique()
    # Wait, we need Program ID (CD_PROGRAMA_IES) if possible, but productions only has NM_PROGRAMA_IES.
    # Let's check productions schema again.
    # Actually, authors has both. But let's use the one in productions if it's there.
    # The productions header was: NM_PRODUCAO;NM_TIPO_PRODUCAO;NM_SUBTIPO_PRODUCAO;AN_BASE;SG_ENTIDADE_ENSINO;NM_PROGRAMA_IES;...
    
    prog_yearly = prog_prods.group_by(["NM_PROGRAMA_IES", "AN_BASE"]).count()
    
    prog_yearly_pivot = prog_yearly.pivot(
        index="NM_PROGRAMA_IES", columns="AN_BASE", values="count"
    ).fill_null(0)
    
    for year in YEARS:
        if str(year) not in prog_yearly_pivot.columns:
            prog_yearly_pivot = prog_yearly_pivot.with_columns(pl.lit(0).alias(str(year)))
            
    prog_yearly_pivot = prog_yearly_pivot.with_columns(
        pl.concat_list([str(y) for y in YEARS]).alias("prod_counts_per_year")
    )
    
    prog_yearly_pivot.select(["NM_PROGRAMA_IES", "prod_counts_per_year"]).write_csv(OUTPUT_DIR / "program_yearly_stats.csv", separator=CSV_SEPARATOR)
    print(f"   ✅ Program stats saved ({prog_yearly_pivot.height} rows)")

    # 6. University Collaboration Yearly Counts
    print("⚙️  Aggregating University yearly collaborations...")
    # We need to find pairs of universities collaborating on the same production
    uni_pairs = productions.select(["ID_ADD_PRODUCAO_INTELECTUAL", "SG_ENTIDADE_ENSINO", "AN_BASE"])
    # Join with itself on production ID to find co-occurring universities
    uni_collabs = uni_pairs.join(uni_pairs, on="ID_ADD_PRODUCAO_INTELECTUAL", suffix="_right")
    uni_collabs = uni_collabs.filter(pl.col("SG_ENTIDADE_ENSINO") < pl.col("SG_ENTIDADE_ENSINO_right"))
    
    uni_collab_yearly = uni_collabs.group_by(["SG_ENTIDADE_ENSINO", "SG_ENTIDADE_ENSINO_right", "AN_BASE"]).count()
    
    uni_collab_pivot = uni_collab_yearly.pivot(
        index=["SG_ENTIDADE_ENSINO", "SG_ENTIDADE_ENSINO_right"], columns="AN_BASE", values="count"
    ).fill_null(0)
    
    for year in YEARS:
        if str(year) not in uni_collab_pivot.columns:
            uni_collab_pivot = uni_collab_pivot.with_columns(pl.lit(0).alias(str(year)))
            
    uni_collab_pivot = uni_collab_pivot.with_columns(
        pl.concat_list([str(y) for y in YEARS]).alias("collab_counts_per_year")
    )
    
    uni_collab_pivot.select(["SG_ENTIDADE_ENSINO", "SG_ENTIDADE_ENSINO_right", "collab_counts_per_year"]).write_csv(OUTPUT_DIR / "university_collab_yearly_stats.csv", separator=CSV_SEPARATOR)
    print(f"   ✅ University collaboration stats saved ({uni_collab_pivot.height} rows)")

    # 7. Program Collaboration Yearly Counts
    print("⚙️  Aggregating Program yearly collaborations...")
    prog_pairs = productions.select(["ID_ADD_PRODUCAO_INTELECTUAL", "NM_PROGRAMA_IES", "AN_BASE"])
    prog_collabs = prog_pairs.join(prog_pairs, on="ID_ADD_PRODUCAO_INTELECTUAL", suffix="_right")
    prog_collabs = prog_collabs.filter(pl.col("NM_PROGRAMA_IES") < pl.col("NM_PROGRAMA_IES_right"))
    
    prog_collab_yearly = prog_collabs.group_by(["NM_PROGRAMA_IES", "NM_PROGRAMA_IES_right", "AN_BASE"]).count()
    
    prog_collab_pivot = prog_collab_yearly.pivot(
        index=["NM_PROGRAMA_IES", "NM_PROGRAMA_IES_right"], columns="AN_BASE", values="count"
    ).fill_null(0)
    
    for year in YEARS:
        if str(year) not in prog_collab_pivot.columns:
            prog_collab_pivot = prog_collab_pivot.with_columns(pl.lit(0).alias(str(year)))
            
    prog_collab_pivot = prog_collab_pivot.with_columns(
        pl.concat_list([str(y) for y in YEARS]).alias("collab_counts_per_year")
    )
    
    prog_collab_pivot.select(["NM_PROGRAMA_IES", "NM_PROGRAMA_IES_right", "collab_counts_per_year"]).write_csv(OUTPUT_DIR / "program_collab_yearly_stats.csv", separator=CSV_SEPARATOR)
    print(f"   ✅ Program collaboration stats saved ({prog_collab_pivot.height} rows)")

    print("\n🎉 Yearly aggregation complete!")

if __name__ == "__main__":
    main()
