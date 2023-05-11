import { parseCollabsResults, runQuery } from '../../helpers/neo4j_helper';

export type University = {
    uf: string;
    full_name: string;
    city: string;
    name: string;
    legal_status: string;
    region: string;
};

export async function getUniversitiesCollabs(topConnectionsCount: number) {
    const QUERY = `
    MATCH (e1:University)-[r:COLLABORATES_WITH]-(e2:University)
    WITH e1, e2, r.collabs_count as collabs_count
    ORDER BY collabs_count DESC
    WITH e1, collect({e2: e2, count: collabs_count}) as collabs
    UNWIND collabs[0..${topConnectionsCount || 3}] as collab
    RETURN e1, collab.e2 as e2, collab.count as collabs_count;
  `;
    return parseCollabsResults<University>(await runQuery(QUERY));
}
