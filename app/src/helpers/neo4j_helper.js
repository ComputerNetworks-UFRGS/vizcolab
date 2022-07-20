import neo4j from 'neo4j-driver'
import authorTypeColors from '../config/author_type_colors.json'

// Neo4j Configuration
const {
  REACT_APP_NEO4J_ENDPOINT,
  REACT_APP_NEO4J_DATABASE,
  REACT_APP_NEO4J_USER,
  REACT_APP_NEO4J_PASSWORD
} = process.env

const driver = neo4j.driver(
  REACT_APP_NEO4J_ENDPOINT,
  neo4j.auth.basic(REACT_APP_NEO4J_USER, REACT_APP_NEO4J_PASSWORD),
  {
    logging: {
      level: 'info',
      logger: (level, message) => console.log(level + ' ' + message)
    },
  }
)

function createSession() {
  return driver.session({
    database: REACT_APP_NEO4J_DATABASE,
    defaultAccessMode: neo4j.session.READ
  })
}

// Helper Functions
function getNodeColor(node) {
  return authorTypeColors[node.type] || '#c8d6e5'
}

function parseAuthorsGraphData(records) {
  let nodes = {};
  let links = records.map(r => {
    let start = r.get("start");
    let end = r.get("end");
    nodes[start.id] = (start);
    nodes[end.id] = (end);
    return {source: parseInt(start.id), target: parseInt(end.id)}
  });

  nodes = Object.values(nodes).map(node => ({
    id: parseInt(node.id),
    name: node.name || node.id,
    type: node.name ? node.type : 'unnamed_prod',
    prod_count: node.prod_count && node.prod_count.toNumber()
  }));

  return { nodes, links }
}

function parseCoAuthorsGraphData(records) {
  let nodes = {};
  let links = records.map(r => {
    const author1 = r.get("author1");
    const author2 = r.get("author2");
    const rel = r.get("relationship");
    nodes[author1.id] = author1;
    nodes[author2.id] = author2;
    return {source: parseInt(rel.source), target: parseInt(rel.target), collabs: rel.collabs}
  });

  nodes = Object.values(nodes).map(node => ({
    ...node,
    id: parseInt(node.id),
    color: getNodeColor(node),
    prod_count: parseInt(node.prod_count),
  }));

  return { nodes, links }
}

// Queries
async function runQuery(query) {
  let result
  const session = createSession()

  try {
    result = await session.run(query)
  } catch (error) {
    console.error(`Error executing query "${query}:\n ${error}`)
    throw error
  } finally {
    session.close()
  }

  return result.records
}

export async function testQueryCoAuthors() {
  const QUERY = `
    MATCH
      path=(a1:Author {university: 'UFRGS', ies_program: 'COMPUTAÇÃO'})-[r:CO_AUTHOR]-(a2:Author)
    RETURN
      {
        id: a1.id,
        name: a1.name,
        type: a1.type,
        prod_count: a1.prod_count,
        university: a1.university,
        ies_program: a1.ies_program,
        abnt_name: a1.abnt_name
      } as author1,
      {
        id: a2.id,
        name: a2.name,
        type: a2.type,
        prod_count: a2.prod_count,
        university: a2.university,
        ies_program: a2.ies_program,
        abnt_name: a2.abnt_name
      } as author2,
      {
        source: a1.id,
        target: a2.id, 
        collabs: r.collaborations
      } as relationship;
  `

  return parseCoAuthorsGraphData(await runQuery(QUERY))
}

export async function testQueryAuthors() {
  const QUERY = `
    MATCH
      (a:Author {university: 'UFRGS', ies_program: 'COMPUTAÇÃO'})-[:AUTHOR]->(p:Production)
    RETURN
      {id: a.id, name: a.name, type: a.type, prod_count: a.prod_count} as start,
      {id: p.id, name: p.name, type: 'prod'} as end;
  `

  return parseAuthorsGraphData(await runQuery(QUERY))
}

export async function getAuthorInfo(authorId) {
  const QUERY = `
    MATCH
      (a:Author {id: ${authorId}})
    RETURN a as author;
  `

  const records = await runQuery(QUERY)

  if (records.length === 0) {
    return null
  } else {
    return records[0].get('author')
  }
}
