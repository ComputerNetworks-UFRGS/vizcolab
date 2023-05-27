import { parseCollabsResults, runQuery } from '../../helpers/neo4j_helper';

export type Author = {
    abnt_name: string;
    capes_id: { ['high']: number; ['low']: number };
    id_ies_program: string;
    ies_program: string;
    knowledge_area: string;
    name: string;
    research_line: string;
    type: string;
    university: string;
};

export async function getAuthorsCollabs(
    university: string,
    ies_programs: string[],
    topConnectionsCount: number,
) {
    const QUERY = `
    MATCH (e1:Author {university: "${university}"})-[r:CO_AUTHOR]-(e2:Author)
    WHERE e1.ies_program in ["${ies_programs.join('","')}"]
    WITH e1, e2, r.collabs_count as collabs_count
    ORDER BY collabs_count DESC
    WITH e1, collect({e2: e2, count: collabs_count}) as collabs
    UNWIND collabs[0..${topConnectionsCount || 3}] as collab
    RETURN e1, collab.e2 as e2, collab.count as collabs_count;
  `;
    return parseCollabsResults<Author>(await runQuery(QUERY));
}

export async function getAuthorData(author_id) {
    const QUERY = `
    MATCH (e1:Author {id: ${author_id}})-[r:CO_AUTHOR]-(e2:Author)
    RETURN e1, e2, r.collabs_count as collabs_count
    UNION ALL
    MATCH (a:Author {id: ${author_id}})-[:CO_AUTHOR]-(e1:Author)-[r:CO_AUTHOR]-(e2:Author)-[:CO_AUTHOR]-(a)
    RETURN e1, e2, r.collabs_count as collabs_count;
  `;

    return parseCollabsResults<Author>(await runQuery(QUERY));
}
