import { parseCollabsResults, runQuery } from '../../helpers/neo4j_helper';

export type Program = {
    name: string;
    full_name: string;
    knowledge_area: string;
    knowledge_subarea: string;
    rating_area: string;
    specialty: String;
    university: string;
    wide_knowledge_area: string;
};

// University programs collaborations
export async function getProgramsCollabs(university, topConnectionsCount) {
    const QUERY = `
    MATCH (e1:Program {university: "${university}"})-[r:COLLABORATES_WITH]-(e2:Program {university: "${university}"})
    WITH e1, e2, r.collabs_count as collabs_count
    ORDER BY collabs_count DESC
    WITH e1, collect({e2: e2, count: collabs_count}) as collabs
    UNWIND collabs[0..${topConnectionsCount || 3}] as collab
    RETURN e1, collab.e2 as e2, collab.count as collabs_count;
  `;
    return parseCollabsResults<Program>(await runQuery(QUERY));
}
