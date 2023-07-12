import { runQuery } from '../../helpers/neo4j_helper';

export async function getUniversityNamesList() {
    const QUERY = `
    MATCH (u:University)
    WITH u.name as university
    ORDER BY university
    RETURN DISTINCT university;
  `;

    return (await runQuery(QUERY)).map((r) => r.get('university'));
}

export async function getUniversityProgramsList(university) {
    const QUERY = `
    MATCH (e1:Program {university: "${university}"})-[r:COLLABORATES_WITH]-(e2:Program {university: "${university}"})
        WITH e1, apoc.coll.sum(r.collab_counts_per_year[0..3]) as collabs_count
        WHERE collabs_count > 0
        RETURN DISTINCT e1.name as program
        ORDER BY program ASC;
  `;

    return (await runQuery(QUERY)).map((r) => r.get('program'));
}

export async function getProgramAuthorsList(university, programName) {
    const QUERY = `
    MATCH (e1:Author {university: "${university}"})-[r:CO_AUTHOR]-(e2:Author)
    WHERE e1.ies_program in ["${programName}"]
    WITH e1, e2, 
         apoc.coll.sum(r.collab_counts_per_year[0..3]) as collabs_count,
         apoc.coll.sum(e1.prod_counts_per_year[0..3]) as e1_prod_count,
         apoc.coll.sum(e2.prod_counts_per_year[0..3]) as e2_prod_count
    WHERE collabs_count > 0 AND e1_prod_count > 0 AND e2_prod_count > 0
    RETURN DISTINCT e1.name as author
    ORDER BY author ASC;
`;

    return (await runQuery(QUERY)).map((r) => r.get('author'));
}
