import { difference, uniqWith } from 'lodash';
import neo4j from 'neo4j-driver';
import { GraphData } from './graph_helper';

export const FIRST_YEAR_IN_DATASET = 2017;

export type AbstractNodeBase = {
    id: string;
    prod_count: number;
    betweenness_centrality: number;
    degree_centrality: number;
    closeness_centrality: number;
    eigenvector_centrality: number;
};

export type ThreeSimulationNodeBase = AbstractNodeBase & {
    index?: number;
    color?: string;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
};

export type SimulationInputNode<T> = T & AbstractNodeBase;
export type SimulationOutputNode<T> = T & ThreeSimulationNodeBase;

export type SimulationInputLink = {
    source: string;
    target: string;
    collabs_count: number;
};
export type SimulationOutputLink<T> = {
    source: SimulationOutputNode<T>;
    target: SimulationOutputNode<T>;
    collabs_count: number;
};

export type Node<T> = SimulationInputNode<T> | SimulationOutputNode<T>;
export type Link<T> = SimulationInputLink | SimulationOutputLink<T>;

export const isNodeSimulationOutput = <T>(
    n: Node<T>,
): n is SimulationOutputNode<T> => n.hasOwnProperty('index');
export const isLinkSimulationOutput = <T>(
    l: Link<T>,
): l is SimulationOutputLink<T> => typeof l.source !== 'string';

export const isSimulationOutput = <T>(
    data:
        | {
              nodes: Node<T>[];
              links: Link<T>[];
          }
        | undefined,
): data is {
    nodes: SimulationOutputNode<T>[];
    links: SimulationOutputLink<T>[];
} =>
    !!data &&
    data.nodes.every(isNodeSimulationOutput) &&
    data.links.every(isLinkSimulationOutput);

//                     //
// NEO4J CONFIGURATION //
//                     //

const {
    REACT_APP_NEO4J_ENDPOINT,
    REACT_APP_NEO4J_DATABASE,
    REACT_APP_NEO4J_USER,
    REACT_APP_NEO4J_PASSWORD,
} = process.env as Record<string, string>;

const driver = neo4j.driver(
    REACT_APP_NEO4J_ENDPOINT,
    neo4j.auth.basic(REACT_APP_NEO4J_USER, REACT_APP_NEO4J_PASSWORD),
    {
        logging: {
            level: 'info',
            logger: (level, message) => console.log(level + ' ' + message),
        },
    },
);

function createSession() {
    return driver.session({
        database: REACT_APP_NEO4J_DATABASE,
        defaultAccessMode: neo4j.session.READ,
    });
}

//                  //
// HELPER FUNCTIONS //
//                  //

export async function runQuery(query) {
    let result;
    const session = createSession();

    try {
        result = await session.run(query);
    } catch (error) {
        console.error(`Error executing query "${query}:\n ${error}`);
        throw error;
    } finally {
        session.close();
    }

    return result.records;
}

export function parseCollabsResults<T>(records: any[]): GraphData<T> {
    // That object is used to avoid duplicate nodes in the final array
    const idToNode: Record<string, Node<T>> = {};
    let links = records
        .map((r) => {
            const e1 = r.get('e1').properties;
            const e2 = r.get('e2').properties;
            const collabs_count = r.get('collabs_count');
            const e1_prod_count = r.get('e1_prod_count');
            const e2_prod_count = r.get('e2_prod_count');

            if (
                !e1_prod_count ||
                !e2_prod_count ||
                !collabs_count ||
                !e1.name ||
                !e2.name ||
                !e1.id ||
                !e2.id
            ) {
                return null;
            }

            e1.id = parseInt(e1.id).toString();
            e2.id = parseInt(e2.id).toString();

            e1.prod_count = parseInt(e1.prod_count);
            e2.prod_count = parseInt(e2.prod_count);

            e1.prod_count = e1_prod_count;
            e2.prod_count = e2_prod_count;

            // Avoid duplicates
            idToNode[e1.id] = e1;
            idToNode[e2.id] = e2;

            return {
                source: e1.id,
                target: e2.id,
                collabs_count: parseInt(collabs_count),
            };
        })
        .filter(Boolean) as {
        source: any;
        target: any;
        collabs_count: number;
    }[];

    links = uniqWith(
        links,
        (a, b) =>
            difference([a.source, a.target], [b.source, b.target]).length === 0,
    );

    let nodes = Object.values(idToNode);

    return { nodes, links };
}
