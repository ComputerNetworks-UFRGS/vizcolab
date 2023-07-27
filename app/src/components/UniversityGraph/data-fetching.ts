import {
    FIRST_YEAR_IN_DATASET,
    parseCollabsResults,
    runQuery,
} from '../../helpers/neo4j_helper';
var centrality = require('ngraph.centrality');
var g = require('ngraph.graph')();

export type University = {
    uf: string;
    full_name: string;
    city: string;
    name: string;
    legal_status: string;
    region: string;
};

export async function getUniversitiesCollabs(
    topConnectionsCount: number,
    yearRange: [number, number],
) {
    const yearStartIndex = yearRange[0] - FIRST_YEAR_IN_DATASET;
    const yearEndIndex = yearRange[1] - FIRST_YEAR_IN_DATASET;

    const QUERY = `
    MATCH (e1:University)-[r:COLLABORATES_WITH]-(e2:University)
    WITH e1, e2, 
         apoc.coll.sum(r.collab_counts_per_year[${yearStartIndex}..${
        yearEndIndex + 1
    }]) as collabs_count,
         apoc.coll.sum(e1.prod_counts_per_year[${yearStartIndex}..${
        yearEndIndex + 1
    }]) as e1_prod_count,
         apoc.coll.sum(e2.prod_counts_per_year[${yearStartIndex}..${
        yearEndIndex + 1
    }]) as e2_prod_count
    ORDER BY collabs_count DESC
    WITH e1, e2, collabs_count, e1_prod_count, e2_prod_count
    WITH e1, collect({e2: e2, count: collabs_count, e1_prod_count: e1_prod_count, e2_prod_count: e2_prod_count})[0..${
        topConnectionsCount || 3
    }] as collabs
    UNWIND collabs as collab
    RETURN e1 as e1, collab.e2 as e2, collab.count as collabs_count, collab.e1_prod_count as e1_prod_count, collab.e2_prod_count as e2_prod_count;
  `;
    const graphData = parseCollabsResults<University>(await runQuery(QUERY));

    g.clear();

    graphData.links.forEach((link) => {
        if (link.source === 'NaN' || link.target === 'NaN') return;
        g.addLink(link.source, link.target);
    });

    const betweennessCentralityDict = centrality.betweenness(g);
    const degreeCentralityDict = centrality.degree(g);
    const closenessCentralityDict = centrality.closeness(g);

    const numberOfNodes = graphData.nodes.length;
    const numberOfPairsNotIncluding =
        ((numberOfNodes - 1) * (numberOfNodes - 2)) / 2;
    const numberOfPossibleLinks = numberOfNodes - 1;

    graphData.nodes.forEach((node) => {
        node.betweenness_centrality =
            betweennessCentralityDict[node.id] / numberOfPairsNotIncluding;
        node.degree_centrality =
            degreeCentralityDict[node.id] / numberOfPossibleLinks;
        node.closeness_centrality = closenessCentralityDict[node.id];
    });

    return graphData;
}
