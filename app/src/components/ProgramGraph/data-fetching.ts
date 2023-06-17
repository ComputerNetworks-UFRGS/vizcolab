import { parseCollabsResults, runQuery } from '../../helpers/neo4j_helper';
var centrality = require('ngraph.centrality');
var g = require('ngraph.graph')();

export type Program = {
    name: string;
    full_name: string;
    knowledge_area: string;
    knowledge_subarea: string;
    rating_area: string;
    specialty: String;
    university: string;
    wide_knowledge_area: string;
    betweenness_centrality: number;
    degree_centrality: number;
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
    const graphData = parseCollabsResults<Program>(await runQuery(QUERY));

    g.clear();

    graphData.links.forEach((link) => {
        if (link.source === 'NaN' || link.target === 'NaN') return;
        g.addLink(link.source, link.target);
    });

    const betweennessCentralityDict = centrality.betweenness(g);
    const degreeCentralityDict = centrality.degree(g);

    const numberOfNodes = graphData.nodes.length;
    const numberOfPairsNotIncluding =
        ((numberOfNodes - 1) * (numberOfNodes - 2)) / 2;
    const numberOfPossibleLinks = numberOfNodes - 1;

    graphData.nodes.forEach((node) => {
        node.betweenness_centrality =
            betweennessCentralityDict[node.id] / numberOfPairsNotIncluding;
        node.degree_centrality =
            degreeCentralityDict[node.id] / numberOfPossibleLinks;
    });

    return graphData;
}
