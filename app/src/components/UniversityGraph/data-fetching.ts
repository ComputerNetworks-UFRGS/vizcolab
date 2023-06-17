import { parseCollabsResults, runQuery } from '../../helpers/neo4j_helper';
var centrality = require('ngraph.centrality');
var g = require('ngraph.graph')();

export type University = {
    uf: string;
    full_name: string;
    city: string;
    name: string;
    legal_status: string;
    region: string;
    betweenness_centrality: number;
    degree_centrality: number;
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
    const graphData = parseCollabsResults<University>(await runQuery(QUERY));

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
