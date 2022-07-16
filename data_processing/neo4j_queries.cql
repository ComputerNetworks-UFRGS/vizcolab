// IMPORTAÇÃO DE DADOS
// Recria database
CREATE OR REPLACE DATABASE vizcolab;
:use vizcolab;

// Contraints para evitar entradas duplicadas
CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (p:Production) REQUIRE p.id IS UNIQUE;

// Importação dos autores
:auto USING PERIODIC COMMIT 1000
LOAD CSV WITH HEADERS FROM 'file:///final_authors.csv' AS author FIELDTERMINATOR ';'
MERGE (a:Author {id: toInteger(author.IDX)})
ON CREATE SET
  a.name = author.NM_AUTOR,
  a.capes_id = toInteger(author.ID),
  a.university = author.SG_ENTIDADE_ENSINO,
  a.type = author.TP_AUTOR,
  a.abnt_name = author.NM_ABNT_AUTOR,
  a.ies_program = author.NM_PROGRAMA_IES,
  a.prod_count = toInteger(author.PROD_COUNT),
  a.knowledge_area = author.NM_AREA_CONHECIMENTO;

// Criação das entidades 'Production' pelo id da produção
:auto USING PERIODIC COMMIT 1000
LOAD CSV WITH HEADERS FROM 'file:///final_authors.csv' AS author FIELDTERMINATOR ';'
MATCH (a:Author { id: toInteger(author.IDX) })
MERGE (p:Production { id: toInteger(author.ID_ADD_PRODUCAO_INTELECTUAL) })

// Criação da relação de autoria autor -> produção
CREATE (a)-[:AUTHOR]->(p);

// Importação das produções
:auto USING PERIODIC COMMIT 1000
LOAD CSV WITH HEADERS FROM 'file:///processed_productions.csv' AS prod FIELDTERMINATOR ';'
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
  p.knowledge_area = prod.NM_AREA_CONHECIMENTO;

// Cria relações de co-autoria entre autores de uma mesma produção
// https://towardsdatascience.com/link-prediction-with-neo4j-part-2-predicting-co-authors-using-scikit-learn-78b42356b44c
MATCH (a1:Author)-[:AUTHOR]->(p:Production)<-[:AUTHOR]-(a2:Author)
WITH a1, a2, p
ORDER BY a1
WITH a1, a2, count(*) AS collaborations
MERGE (a1)-[coauthor:CO_AUTHOR]-(a2)
SET coauthor.collaborations = collaborations;