# Project Overview: Vizcolab Data Preparation

## Context
Vizcolab is a tool designed to visualize academic collaborations among Brazilian researchers using Neo4j. The source data comes from public CAPES datasets spanning 2021 to 2024. The current objective is to overhaul, optimize, and productionize the legacy data preparation scripts before ingesting the graph data into Neo4j.

## Legacy Stack vs. Target Architecture
* **Current State:** The existing data preparation logic is housed in Jupyter Notebooks (`.ipynb`) inside the `data_processing` folder and relies heavily on the `pandas` library. Processing takes hours due to single-threaded execution and memory bottlenecks.
* **Target Architecture:** The core logic must be migrated out of notebooks into modular Python scripts (`.py`) using **Polars**. Polars is mandated for its multithreaded performance and lazy evaluation capabilities to handle the millions of author and production records.

## Primary Objectives

### 1. Polars Migration & Optimization 
* **Refactor to Polars:** Rewrite all legacy Pandas logic using Polars. Utilize `pl.LazyFrame` (`pl.scan_csv`, `pl.scan_parquet`) wherever possible to build optimized query plans and prevent out-of-memory errors.
* **Vectorization:** Strictly avoid row-by-row iteration. Leverage Polars' native expressions API (e.g., `pl.col()`) for all transformations.
* **Modularize:** Extract the ETL logic into clean, reproducible Python modules. 

### 2. Improve Author Disambiguation (Entity Resolution)
Authors often appear under multiple name variations and are associated with different institutions. Implement robust heuristics to merge these entities:
* **Leverage Hard Identifiers:** Prioritize matching using explicit CAPES person IDs when available (e.g., `ID_PESSOA_DOCENTE`, `ID_PESSOA_DISCENTE`, `ID_PESSOA_EGRESSO`).
* **Standardize Names:** Utilize both the full author name (`NM_AUTOR`) and the ABNT formatted name (`NM_ABNT_AUTOR`) as baseline strings.
* **Implement Fuzzy Matching:** Integrate fast string-matching logic (e.g., using `RapidFuzz` applied via Polars' `map_elements` or native string distances if applicable) to catch typos and abbreviations. Use chunking if necessary.
* **Graph-Based Resolution:** Use co-authorship and institutional affiliation (`NM_ENTIDADE_ENSINO`) as secondary weights to confirm identities when names are similar but IDs are missing.

### 3. Neo4j Export Formatting
* Ensure the final output is strictly formatted as optimized CSV files representing Nodes and Edges, ready for rapid ingestion via Neo4j's `LOAD CSV` or the `neo4j-admin import` tool.

## Instructions for the AI Agent
1. **Analyze:** Review the legacy Jupyter notebooks in the workspace to understand the current extraction and transformation logic.
2. **Refactor:** Translate the transformations into a highly optimized Polars pipeline.
3. **Enhance:** Implement the improved deduplication heuristics outlined above.
4. **Test:** Set up a testing script to run the new pipeline on a small subset of the data to verify schema correctness and execution speed.