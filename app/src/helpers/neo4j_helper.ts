import neo4j from 'neo4j-driver';
import { GraphData } from './graph_helper';

export type AbstractNodeBase = {
    id: string;
    prod_count: number;
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
    const links = records.map((r) => {
        const e1 = r.get('e1').properties;
        const e2 = r.get('e2').properties;
        const collabs_count = r.get('collabs_count');

        e1.id = parseInt(e1.id).toString();
        e2.id = parseInt(e2.id).toString();

        e1.prod_count = parseInt(e1.prod_count);
        e2.prod_count = parseInt(e2.prod_count);

        // Avoid duplicates
        idToNode[e1.id] = e1;
        idToNode[e2.id] = e2;

        return {
            source: e1.id,
            target: e2.id,
            collabs_count: parseInt(collabs_count),
        };
    });

    const nodes = Object.values(idToNode);

    return { nodes, links };
}

//               //
// GET NODE DATA //
//               //

export async function getAuthorData(author_id) {
    const QUERY = `
    MATCH (e1:Author {id: ${author_id}})-[r:CO_AUTHOR]-(e2:Author)
    RETURN e1, e2, r.collabs_count as collabs_count
    UNION ALL
    MATCH (a:Author {id: ${author_id}})-[:CO_AUTHOR]-(e1:Author)-[r:CO_AUTHOR]-(e2:Author)-[:CO_AUTHOR]-(a)
    RETURN e1, e2, r.collabs_count as collabs_count;
  `;

    return parseCollabsResults(await runQuery(QUERY));
}

//                    //
// GET ENTITIES LISTS //
//                    //

export async function getUniversitiesList() {
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
    MATCH (a:Author {university: "${university}"})
    WITH a.ies_program as program
    ORDER BY program
    RETURN DISTINCT program;
  `;

    return (await runQuery(QUERY)).map((r) => r.get('program'));
}

//                                      //
// GET COLLABORATION RELATIONSHIPS DATA //
//                                      //

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
    return parseCollabsResults(await runQuery(QUERY));
}

// Author collaborations
export async function getAuthorsCollabs(
    university,
    ies_programs,
    topConnectionsCount,
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
    return parseCollabsResults(await runQuery(QUERY));
}
