"""
load_neo4j.py — Uploads processed CSVs to Neo4j.

Reads processed CSVs from `output/` using Polars in batches
and runs parameterised UNWIND Cypher queries against Neo4j.

Expects NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD to be set
in the environment or a .env file.
"""

import os
import time
from pathlib import Path

import polars as pl
from dotenv import load_dotenv
from neo4j import GraphDatabase, Session

from scripts.config import OUTPUT_DIR, CSV_SEPARATOR

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    raise ValueError("NEO4J_PASSWORD environment variable is required.")

# Database settings
DB_NAME = "vizcolab"

# Batch size for UNWIND queries
BATCH_SIZE = 10000

def run_batch(session: Session, query: str, rows: list[dict], description: str):
    """Execute an UNWIND query for a batch of rows."""
    if not rows:
        return
    session.run(query, rows=rows)

def process_file_in_batches(
    session: Session,
    file_name: str,
    query: str,
    description: str,
    batch_size: int = BATCH_SIZE,
    transform_row: callable = None,
):
    """Read a CSV file and execute a Cypher query in batches."""
    csv_path = OUTPUT_DIR / file_name
    if not csv_path.exists():
        print(f"   ⚠️  File not found: {csv_path}, skipping {description}")
        return

    print(f"⚙️  Importing {description} from {file_name}...")
    start_time = time.time()
    
    # Read the full file since Polars is very fast and memory-efficient
    df = pl.read_csv(csv_path, separator=CSV_SEPARATOR)
    total_rows = df.height
    
    # Convert to list of dicts for Neo4j Python driver
    # We do this iteratively to avoid memory spikes
    batch = []
    processed = 0
    
    # Iterate through rows efficiently
    for row in df.iter_rows(named=True):
        if transform_row:
            row = transform_row(row)
            
        batch.append(row)
        
        if len(batch) >= batch_size:
            run_batch(session, query, batch, description)
            processed += len(batch)
            print(f"   ... {processed}/{total_rows} rows processed")
            batch = []
            
    # Process remaining rows
    if batch:
        run_batch(session, query, batch, description)
        processed += len(batch)
        print(f"   ... {processed}/{total_rows} rows processed")
        
    elapsed = time.time() - start_time
    print(f"   ✅ Finished importing {description} in {elapsed:.1f}s")


def setup_system(driver):
    """Ensure the vizcolab database and web_user exist."""
    print("⚙️  Checking system setup (database and users)...")
    with driver.session(database="system") as session:
        # Create database
        print(f"   ... Ensuring database '{DB_NAME}' exists")
        session.run(f"CREATE DATABASE {DB_NAME} IF NOT EXISTS WAIT")
        
        # Create web_user
        print("   ... Ensuring 'web_user' exists")
        session.run("""
            CREATE USER web_user IF NOT EXISTS 
            SET PASSWORD 'web_user' 
            CHANGE NOT REQUIRED 
            SET PASSWORD CHANGE REQUIRED FALSE
        """)
        
        # Grant permissions
        session.run("GRANT ROLE reader TO web_user")
        session.run(f"GRANT ACCESS ON DATABASE {DB_NAME} TO web_user")
        
    print("   ✅ System setup complete.")


def clear_database(session: Session):
    """Clear the database and recreate constraints."""
    print("⚙️  Clearing existing database and setting constraints...")
    
    # Neo4j 5+ syntax for constraints
    try:
        session.run("MATCH (n) DETACH DELETE n")
        session.run("CREATE CONSTRAINT author_id IF NOT EXISTS FOR (a:Author) REQUIRE a.id IS UNIQUE")
        session.run("CREATE CONSTRAINT prod_id IF NOT EXISTS FOR (p:Production) REQUIRE p.id IS UNIQUE")
        print("   ✅ Database cleared and constraints created.")
    except Exception as e:
        print(f"   ⚠️  Warning during setup: {e}")


def import_authors(session: Session):
    """Import authors and their links to productions. (Replaces final_authors.csv import)"""
    # Note: processed_authors.csv is exploded, so each row represents an author-production pair
    query = """
    UNWIND $rows AS author
    
    // Merge Author
    MERGE (a:Author {id: toInteger(author.IDX)})
    ON CREATE SET
      a.name = author.NM_AUTOR,
      a.capes_id = toInteger(author.ID_PESSOA),
      a.university = author.SG_ENTIDADE_ENSINO,
      a.type = author.TP_AUTOR,
      a.abnt_name = author.NM_ABNT_AUTOR,
      a.id_ies_program = author.CD_PROGRAMA_IES,
      a.ies_program = author.NM_PROGRAMA_IES,
      a.prod_count = toInteger(author.PROD_COUNT),
      a.knowledge_area = author.NM_AREA_CONHECIMENTO
      
    // Merge Production
    MERGE (p:Production { id: toInteger(author.ID_ADD_PRODUCAO_INTELECTUAL) })
    
    // Create relationship
    MERGE (a)-[:AUTHOR]->(p)
    """
    
    # Since ID_PESSOA might be missing, make sure to parse it correctly or leave it null
    def clean_author_row(row):
        # We replace nulls with empty string or handle them in cypher
        return row
        
    process_file_in_batches(session, "processed_authors.csv", query, "Authors and Author->Production links")
    
    # 2. Update with yearly stats
    query_stats = """
    UNWIND $rows AS row
    MATCH (a:Author {id: toInteger(row.IDX)})
    SET a.prod_counts_per_year = row.prod_counts_per_year
    """
    process_file_in_batches(session, "author_yearly_stats.csv", query_stats, "Author Yearly Stats")


def import_productions(session: Session):
    """Import production metadata."""
    query = """
    UNWIND $rows AS prod
    MATCH (p:Production { id: toInteger(prod.ID_ADD_PRODUCAO_INTELECTUAL) })
    SET
      p.name = prod.NM_PRODUCAO,
      p.universities = prod.SG_ENTIDADE_ENSINO,
      p.type = prod.NM_TIPO_PRODUCAO,
      p.subtype = prod.NM_SUBTIPO_PRODUCAO,
      p.year = toInteger(prod.AN_BASE),
      p.focus_areas = prod.NM_AREA_CONCENTRACAO,
      p.ies_programs = prod.NM_PROGRAMA_IES,
      p.research_lines = prod.NM_LINHA_PESQUISA,
      p.projects = prod.NM_PROJETO,
      p.knowledge_area = prod.NM_AREA_CONHECIMENTO
    """
    process_file_in_batches(session, "processed_productions.csv", query, "Production Metadata")


def import_coauthorships(session: Session):
    """Import co-authorship relationships."""
    query = """
    UNWIND $rows AS row
    MATCH (a1:Author {id: toInteger(row.AUTHOR_1)}), (a2:Author {id: toInteger(row.AUTHOR_2)})
    MERGE (a1)-[coauthor:CO_AUTHOR]-(a2)
    ON CREATE SET 
      coauthor.collabs_count = 1,
      coauthor.collaborations = [row.PROD_ID]
    ON MATCH SET
      coauthor.collabs_count = coauthor.collabs_count + 1,
      // Note: Cypher doesn't allow set addition natively like Python.
      // We append using list concatenation:
      coauthor.collaborations = coauthor.collaborations + row.PROD_ID
    """
    process_file_in_batches(session, "co_authorships.csv", query, "Co-Authorships")
    
    # 2. Update with yearly stats
    query_stats = """
    UNWIND $rows AS row
    MATCH (a1:Author {id: toInteger(row.AUTHOR_1)})-[r:CO_AUTHOR]-(a2:Author {id: toInteger(row.AUTHOR_2)})
    SET r.collab_counts_per_year = row.collab_counts_per_year
    """
    process_file_in_batches(session, "co_author_yearly_stats.csv", query_stats, "Co-Author Yearly Stats")


def import_universities(session: Session):
    """Import universities."""
    # 1. First, create base University nodes from Authors (mimicking legacy query)
    print("⚙️  Creating base University nodes from Authors...")
    query_base = """
    MATCH (a:Author)
    WITH a.university as university, sum(a.prod_count) AS total_prod_count
    MERGE (u:University { name: university })
    SET u.prod_count = total_prod_count
    """
    session.run(query_base)
    print("   ✅ Base University nodes created.")
    
    # 2. Update with university.csv metadata
    query_update = """
    UNWIND $rows AS row
    MATCH (u:University { name: row.SG_ENTIDADE_ENSINO })
    SET
      u.id = row.CD_ENTIDADE_CAPES,
      u.full_name = row.NM_ENTIDADE_ENSINO,
      u.legal_status = row.CS_STATUS_JURIDICO,
      u.region = row.NM_REGIAO,
      u.uf = row.SG_UF_PROGRAMA,
      u.city = row.NM_MUNICIPIO_PROGRAMA_IES
    """
    process_file_in_batches(session, "universities.csv", query_update, "University Metadata")
    
    # Update with yearly stats
    query_stats = """
    UNWIND $rows AS row
    MATCH (u:University { name: row.SG_ENTIDADE_ENSINO })
    SET u.prod_counts_per_year = row.prod_counts_per_year
    """
    process_file_in_batches(session, "university_yearly_stats.csv", query_stats, "University Yearly Stats")
    
    # 3. Create Author -> University relationship
    print("⚙️  Creating Author -> University relationships...")
    query_rel = """
    CALL {
        MATCH (a:Author)
        MATCH (u:University { name: a.university })
        MERGE (a)-[:WORKS_AT]->(u)
    } IN TRANSACTIONS OF 10000 ROWS
    """
    session.run(query_rel)
    print("   ✅ Author -> University relationships created.")


def import_programs(session: Session):
    """Import programs."""
    # 1. Create base Program nodes from Authors
    print("⚙️  Creating base Program nodes from Authors...")
    query_base = """
    MATCH (a:Author)
    WITH a.id_ies_program as program_id, a.ies_program as program_name, a.university as university, sum(a.prod_count) AS total_prod_count
    MERGE (p:Program { id: program_id })
    ON CREATE SET
      p.name = program_name,
      p.university = university,
      p.prod_count = total_prod_count
    """
    session.run(query_base)
    print("   ✅ Base Program nodes created.")
    
    # 2. Update with programs.csv metadata
    query_update = """
    UNWIND $rows AS row
    MATCH (p:Program { id: row.CD_PROGRAMA_IES })
    SET
      p.id = row.CD_PROGRAMA_IES,
      p.full_name = row.NM_PROGRAMA_IES,
      p.wide_knowledge_area = row.NM_GRANDE_AREA_CONHECIMENTO,
      p.knowledge_area = row.NM_AREA_CONHECIMENTO,
      p.knowledge_subarea = row.NM_SUBAREA_CONHECIMENTO,
      p.specialty = row.NM_ESPECIALIDADE,
      p.university = row.SG_ENTIDADE_ENSINO,
      p.rating_area = row.NM_AREA_AVALIACAO
    """
    process_file_in_batches(session, "programs.csv", query_update, "Program Metadata")
    
    # Update with yearly stats
    query_stats = """
    UNWIND $rows AS row
    MATCH (p:Program { name: row.NM_PROGRAMA_IES })
    SET p.prod_counts_per_year = row.prod_counts_per_year
    """
    process_file_in_batches(session, "program_yearly_stats.csv", query_stats, "Program Yearly Stats")
    
    # 3. Create Author -> Program relationship
    print("⚙️  Creating Author -> Program relationships...")
    query_rel = """
    CALL {
        MATCH (a:Author)
        MATCH (p:Program { id: a.id_ies_program })
        MERGE (a)-[:MEMBER_OF]->(p)
    } IN TRANSACTIONS OF 10000 ROWS
    """
    session.run(query_rel)
    print("   ✅ Author -> Program relationships created.")


def create_collaborations(session: Session):
    """Create university and program collaboration links."""
    print("⚙️  Creating University collaborations...")
    query_uni_collabs = """
    CALL {
        MATCH (u1:University)<-[:WORKS_AT]-(:Author)-[:AUTHOR]-(p: Production)-[:AUTHOR]-(:Author)-[:WORKS_AT]->(u2:University)
        WHERE u1.name <> u2.name
        WITH u1, u2, count(DISTINCT p) AS collabs_count
        MERGE (u1)-[r:COLLABORATES_WITH]-(u2)
        SET r.collabs_count = collabs_count
    } IN TRANSACTIONS OF 10000 ROWS
    """
    session.run(query_uni_collabs)
    print("   ✅ University collaborations created.")
    
    print("⚙️  Creating Program collaborations...")
    query_prog_collabs = """
    CALL {
        MATCH (p1:Program)<-[:MEMBER_OF]-(:Author)-[:AUTHOR]-(prod: Production)-[:AUTHOR]-(:Author)-[:MEMBER_OF]->(p2:Program)
        WHERE p1.name <> p2.name OR p1.university <> p2.university
        WITH p1, p2, count(DISTINCT prod) AS collabs_count
        MERGE (p1)-[r:COLLABORATES_WITH]-(p2)
        SET r.collabs_count = collabs_count
    } IN TRANSACTIONS OF 10000 ROWS
    """
    session.run(query_prog_collabs)
    print("   ✅ Program collaborations created.")

    # 3. Update with yearly stats
    print("⚙️  Importing University collaboration yearly stats...")
    query_uni_stats = """
    UNWIND $rows AS row
    MATCH (u1:University { name: row.SG_ENTIDADE_ENSINO })-[r:COLLABORATES_WITH]-(u2:University { name: row.SG_ENTIDADE_ENSINO_right })
    SET r.collab_counts_per_year = row.collab_counts_per_year
    """
    process_file_in_batches(session, "university_collab_yearly_stats.csv", query_uni_stats, "University Collab Stats")

    print("⚙️  Importing Program collaboration yearly stats...")
    query_prog_stats = """
    UNWIND $rows AS row
    MATCH (p1:Program { name: row.NM_PROGRAMA_IES })-[r:COLLABORATES_WITH]-(p2:Program { name: row.NM_PROGRAMA_IES_right })
    SET r.collab_counts_per_year = row.collab_counts_per_year
    """
    process_file_in_batches(session, "program_collab_yearly_stats.csv", query_prog_stats, "Program Collab Stats")


def main():
    print(f"🔌 Connecting to Neo4j at {NEO4J_URI} as {NEO4J_USER}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    start_total = time.time()
    
    try:
        # Verify connection
        driver.verify_connectivity()
        
        # Setup database and user
        setup_system(driver)
        
        with driver.session(database=DB_NAME) as session:
            clear_database(session)
            
            import_authors(session)
            import_productions(session)
            import_coauthorships(session)
            
            import_universities(session)
            import_programs(session)
            
            create_collaborations(session)
            
        elapsed = time.time() - start_total
        print(f"\n🎉 Neo4j Import Complete! (Total time: {elapsed:.1f}s)")
        
    except Exception as e:
        print(f"\n❌ Error connecting to Neo4j or executing queries: {e}")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
