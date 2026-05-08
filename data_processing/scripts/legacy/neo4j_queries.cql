// IMPORTAÇÃO DE DADOS
// Recria database (0s)
CREATE OR REPLACE DATABASE vizcolab;
:use vizcolab;

// Contraints para evitar entradas duplicadas (0s)
CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (p:Production) REQUIRE p.id IS UNIQUE;

// Importação dos autores (5m 13s)
:auto LOAD CSV WITH HEADERS FROM 'file:///final_authors.csv' AS author FIELDTERMINATOR ';'
CALL {
  WITH author
  MERGE (a:Author {id: toInteger(author.IDX)})
  ON CREATE SET
    a.name = author.NM_AUTOR,
    a.capes_id = toInteger(author.ID),
    a.university = author.SG_ENTIDADE_ENSINO,
    a.type = author.TP_AUTOR,
    a.abnt_name = author.NM_ABNT_AUTOR,
    a.id_ies_program = author.CD_PROGRAMA_IES,
    a.ies_program = author.NM_PROGRAMA_IES,
    a.prod_count = toInteger(author.PROD_COUNT),
    a.knowledge_area = author.NM_AREA_CONHECIMENTO,
    a.research_line = author.NM_LINHA_PESQUISA
  // Criação das entidades 'Production' pelo id da produção
  MERGE (p:Production { id: toInteger(author.ID_ADD_PRODUCAO_INTELECTUAL) })
  // Criação da relação de autoria autor -> produção
  MERGE (a)-[:AUTHOR]->(p)
} IN TRANSACTIONS OF 20000 ROWS;


// Importação das produções (1m 11s)
:auto LOAD CSV WITH HEADERS FROM 'file:///processed_productions.csv' AS prod FIELDTERMINATOR ';'
CALL {
  WITH prod
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
} IN TRANSACTIONS OF 20000 ROWS;

// Cria relações de co-autoria entre autores de uma mesma produção (22m 4s)
:auto LOAD CSV WITH HEADERS FROM 'file:///co_authorships.csv' AS row FIELDTERMINATOR ';'
CALL {
  WITH row
  WITH row.AUTHOR_1 as a1_id, row.AUTHOR_2 as a2_id, row.PROD_ID as prod_id
  MATCH (a1:Author {id: toInteger(a1_id)}), (a2:Author {id: toInteger(a2_id)})
  MERGE (a1)-[coauthor:CO_AUTHOR]-(a2)
  ON CREATE SET 
    coauthor.collabs_count = 1,
    coauthor.collaborations = [prod_id]
  ON MATCH SET
    coauthor.collabs_count = coauthor.collabs_count + 1,
    coauthor.collaborations = coauthor.collaborations + [prod_id]
} IN TRANSACTIONS OF 20000 ROWS;

// Cria entidades universidade (2s)
MATCH (a:Author)
WITH a.university as university, sum(a.prod_count) AS total_prod_count
MERGE (u:University { name: university, prod_count: total_prod_count });

// Importa informações sobre universidades (1s)
:auto LOAD CSV WITH HEADERS FROM 'file:///universities.csv' AS row FIELDTERMINATOR ';'
MATCH (u:University { name: row.SG_ENTIDADE_ENSINO })
SET
  u.id = row.CD_ENTIDADE_CAPES,
  u.full_name = row.NM_ENTIDADE_ENSINO,
  u.legal_status = row.CS_STATUS_JURIDICO,
  u.region = row.NM_REGIAO,
  u.uf = row.SG_UF_PROGRAMA,
  u.city = row.NM_MUNICIPIO_PROGRAMA_IES;

// Cria relação author -> university (1m 55s)
MATCH (a:Author)
MATCH (u:University { name: a.university })
MERGE (a)-[:WORKS_AT]->(u);

// Cria entidades programas IES (29s)
MATCH (a:Author)
WITH a.id_ies_program as program_id, a.ies_program as program_name, a.university as university, sum(a.prod_count) AS total_prod_count
MERGE (p:Program { id: program_id })
ON CREATE SET
  p.name = program_name,
  p.university = university,
  p.prod_count = total_prod_count;

// Importa informações sobre programas IES (13s)
:auto LOAD CSV WITH HEADERS FROM 'file:///programs.csv' AS row FIELDTERMINATOR ';'
CALL {
  WITH row
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
} IN TRANSACTIONS OF 20000 ROWS;

// Cria relação de colaboração entre universidades (29s)
MATCH (u1:University)<-[:WORKS_AT]-(:Author)-[:AUTHOR]-(p: Production)-[:AUTHOR]-(:Author)-[:WORKS_AT]->(u2:University)
WHERE u1.name <> u2.name
WITH u1, u2, count(DISTINCT p) AS collabs_count
MERGE (u1)-[:COLLABORATES_WITH {collabs_count: collabs_count}]-(u2);

// Cria relação author -> programa IES (9s)
MATCH (a:Author)
MATCH (p:Program { id: a.id_ies_program })
MERGE (a)-[:MEMBER_OF]->(p);

// Cria relação de colaboração entre programas IES (1m 50s)
MATCH (p1:Program)<-[:MEMBER_OF]-(:Author)-[:AUTHOR]-(prod: Production)-[:AUTHOR]-(:Author)-[:MEMBER_OF]->(p2:Program)
WHERE p1.name <> p2.name OR p1.university <> p2.university
WITH p1, p2, count(DISTINCT prod) AS collabs_count
MERGE (p1)-[:COLLABORATES_WITH {collabs_count: collabs_count}]-(p2);


// TEMPO TOTAL DE PROCESSAMENTO: 33m 36s
// * Tempo medido em um MacBook Pro 2021 com Chip M1 Pro de 8 núcleos e 16 GB de RAM


// QUERIES DE MANUTENÇÃO
// Atualizar universidade de um autor
MATCH (a:Author {id: 293829})
SET a.university = 'UFRGS'
WITH a MATCH (a)-[r:WORKS_AT]-()
DELETE r
WITH a MATCH (u:University {name: 'UFRGS'})
CREATE (a)-[:WORKS_AT]->(u);