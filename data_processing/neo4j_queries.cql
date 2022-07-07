// IMPORTAÇÃO DE DADOS
// Apaga dados existentes
MATCH (a)
DETACH DELETE a;

// Contraints para evitar entradas duplicadas
CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (p:Production) REQUIRE p.id IS UNIQUE;

// Commit periodico dos dados importados
:auto USING PERIODIC COMMIT 10000

// Importação dos autores
LOAD CSV WITH HEADERS FROM 'file:///final_authors.csv' AS author FIELDTERMINATOR ';'
UNWIND split(replace(replace(author.ID_ADD_PRODUCAO_INTELECTUAL, '[', ''), ']', ''), ',') as prod_id
MERGE (a:Author { id: author.IDX })
ON CREATE SET
  a.name = author.NM_AUTOR,
  a.capes_id = author.ID,
  a.university = author.SG_ENTIDADE_ENSINO,
  a.type = author.TP_AUTOR,
  a.abnt_name = author.NM_ABNT_AUTOR,
  a.ies_program = author.NM_PROGRAMA_IES,
  a.knowledge_area = author.NM_AREA_CONHECIMENTO;

// Criação da entidade 'Production' para o id
MERGE (p:Production { prod_id: prod_id })

// Criação da relação de autoria autor -> produção
MERGE (a)-[:AUTHOR]->(p);

// Importação das produções
LOAD CSV WITH HEADERS FROM 'file:///final_productions.csv' AS prod FIELDTERMINATOR ';'
MERGE (p:Production { prod_id: prod.ID_ADD_PRODUCAO_INTELECTUAL })
SET p.name = prod.NM_PRODUCAO,
    p.universities = prod.SG_ENTIDADE_ENSINO,
    p.type = prod.NM_TIPO_PRODUCAO,
    p.subtype = prod.NM_SUBTIPO_PRODUCAO,
    p.year = prod.AN_BASE,
    p.focus_areas = prod.NM_AREA_CONCENTRACAO,
    p.ies_programs = prod.NM_PROGRAMA_IES,
    p.research_lines = prod.NM_LINHA_PESQUISA,
    p.projects = prod.NM_PROJETO,
    p.knowledge_area = prod.NM_AREA_CONHECIMENTO;
