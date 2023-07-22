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
        RETURN DISTINCT e1.name as e1_author, e2.name as e2_author
        ORDER BY e1_author ASC, e2_author ASC;
    `;

    const result = await runQuery(QUERY);
    const authorList: string[] = [];
    for (let r of result) {
        authorList.push(r.get('e1_author'));
        authorList.push(r.get('e2_author'));
    }

    // Remove duplicates
    const uniqueAuthorList = [...new Set(authorList)];
    return uniqueAuthorList;
}

export async function getAuthorCoauthorsList(author_id) {
    const QUERY = `
        MATCH (e1:Author {id: ${author_id}})-[r:CO_AUTHOR]-(e2:Author)
        WITH e1, e2
        RETURN DISTINCT e2.name as author
        UNION
        MATCH (a:Author {id: ${author_id}})-[:CO_AUTHOR]-(e1:Author)-[r:CO_AUTHOR]-(e2:Author)-[:CO_AUTHOR]-(a)
        WITH e1, e2
        RETURN DISTINCT e2.name as author;
    `;

    const result = await runQuery(QUERY);
    const authorList: string[] = [];
    for (let r of result) {
        authorList.push(r.get('author'));
    }

    // Remove duplicates
    const uniqueAuthorList = [...new Set(authorList)];
    return uniqueAuthorList;
}

