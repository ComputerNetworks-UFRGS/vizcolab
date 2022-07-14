import neo4j from 'neo4j-driver'

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
function parseGraphData(records) {
  let nodes = {};
  let links = records.map(r => {
    let source = r.get("source");
    let target = r.get("target");
    nodes[source.id] = (source);
    nodes[target.id] = (target);
    return {source: parseInt(source.id), target: parseInt(target.id)}
  });

  nodes = Object.values(nodes).map(node => ({
    id: parseInt(node.id),
    name: node.name || node.id,
    type: node.name ? node.type : 'unnamed_prod',
    prod_count: node.prod_count && node.prod_count.toNumber()
  }));

  return { nodes, links }
}

// Queries
async function query(query) {
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

  return parseGraphData(result.records)
}

export async function testQuery() {
  const data = await query(`
  MATCH
    (a:Author {university: 'UFRGS', ies_program: 'COMPUTAÇÃO'})-[:AUTHOR]->(p:Production)
  RETURN
    {id: a.id, name: a.name, type: 'author', prod_count: a.prod_count} as source,
    {id: p.id, name: p.name, type: 'prod'} as target;
  `)
  console.debug(data)
  return data
}
