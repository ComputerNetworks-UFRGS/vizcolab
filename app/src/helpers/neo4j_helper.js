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
function getNodeColorByType(node) {
  return authorTypeColors[node.type] || '#c8d6e5'
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

function parseAuthorGraphData(records) {
  let nodes = {};
  let links = records.map(r => {
    const author1 = r.get("author1");
    const author2 = r.get("author2");
    const rel = r.get("relationship");
    nodes[author1.id] = author1;
    nodes[author2.id] = author2;
    return {source: parseInt(rel.source), target: parseInt(rel.target), collabs_count: parseInt(rel.collabs_count)}
  });

  nodes = Object.values(nodes).map(node => ({
    ...node,
    id: parseInt(node.id),
    // color: getNodeColorByType(node),
    prod_count: parseInt(node.prod_count),
  }));

  return { nodes, links }
}

export async function getUniversityProgramCoAuthors(university, ies_programs) {
  const QUERY = `
    MATCH
      (a1:Author {university: "${university}"})-[r:CO_AUTHOR]-(a2:Author)
    WHERE 
      a1.ies_program in ["${ies_programs.join('","')}"]
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
        collabs_count: r.collabs_count
      } as relationship;
  `

  return parseAuthorGraphData(await runQuery(QUERY))
}

export async function getUniversityProgramAuthors(university, ies_program) {
  function parseData(records) {
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

  const QUERY = `
    MATCH
      (a:Author {university: "${university}", ies_program: "${ies_program}"})-[:AUTHOR]->(p:Production)
    RETURN
      {id: a.id, name: a.name, type: a.type, prod_count: a.prod_count} as start,
      {id: p.id, name: p.name, type: 'prod'} as end;
  `

  return parseData(await runQuery(QUERY))
}

export async function getUniversityProgramsData(university) {
  function parseData(records) {
    let nodes = {};
    let links = records.map(r => {
      const program1 = r.get("p1");
      const program2 = r.get("p2");
      nodes[program1.name] = {id: program1.name, name: program1.name, prod_count: parseInt(program1.prod_count), type: 'program', opacity: 0.1};
      nodes[program2.name] = {id: program2.name, name: program2.name, prod_count: parseInt(program2.prod_count), type: 'program', opacity: 0.1};
      return {source: program1.name, target: program2.name, collabs_count: parseInt(r.get("collabs_count"))}
    });

    nodes = Object.values(nodes).map(node => node);

    return { nodes, links }
  }

  const QUERY = `
    MATCH (a1:Author {university: "UFRGS"})-[r:CO_AUTHOR]-(a2:Author {university: "UFRGS"})
    WHERE a1.ies_program > a2.ies_program and r.collabs_count > 1
    WITH
        { name: a1.ies_program, prod_count: sum(a1.prod_count) } as p1,
        { name: a2.ies_program, prod_count: sum(a2.prod_count) } as p2,
        sum(r.collabs_count) as collabs_count
    ORDER by collabs_count desc
    RETURN p1, p2, collabs_count;
  `

  return parseData(await runQuery(QUERY))
}

export async function getAuthorData(author_id) {
  const QUERY = `
  MATCH
    (a1:Author {id: ${author_id}})-[r:CO_AUTHOR]-(a2:Author)
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
      collabs_count: r.collabs_count
    } as relationship;
  `

  return parseAuthorGraphData(await runQuery(QUERY))
}

export async function getUniversitiesList() {
  const QUERY = `
    MATCH (u:University)
    WITH u.name as university
    ORDER BY university
    RETURN DISTINCT university;
  `

  return (await runQuery(QUERY)).map(r => r.get("university"));
}

export async function getUniversityProgramsList(university) {
  const QUERY = `
    MATCH (a:Author {university: "${university}"})
    WITH a.ies_program as program
    ORDER BY program
    RETURN DISTINCT program;
  `

  return (await runQuery(QUERY)).map(r => r.get("program"));
}

export async function getUniversitiesData() {
  function parseData(records) {
    let nodes = {};
    let links = records.map(r => {
      const u1 = r.get("u1").properties;
      const u2 = r.get("u2").properties;
      const collabs_count = r.get('collabs_count').toNumber();
      nodes[u1.name] = u1;
      nodes[u2.name] = u2;
      return {source: u1.name, target: u2.name, collabs_count: collabs_count}
    });
  
    nodes = Object.values(nodes).map(node => ({
      ...node,
      prod_count: parseInt(node.prod_count),
    }));
  
    return { nodes, links }
  }

  const QUERY_HIGHEST_COLLABS = `
    MATCH (u1:University)-[r:COLLABORATES_WITH]->(u2:University)
    WITH u1, u2, r
    ORDER BY r.collabs_count DESC
    RETURN u1, u2, r.collabs_count as collabs_count
    LIMIT 300;
  `

  const QUERY_IMPORTANT_COLLABS= `
    MATCH (u1:University)-[r:COLLABORATES_WITH]->(u2:University)
    WITH u1, u2, r, (toFloat(r.collabs_count) / u1.prod_count) as u1_collab_ratio, (toFloat(r.collabs_count) / u2.prod_count) as u2_collab_ratio
    WHERE u1_collab_ratio > 0.05 or u2_collab_ratio > 0.05
    WITH u1, u2, r
    ORDER BY r.collabs_count DESC
    RETURN u1, u2, r.collabs_count as collabs_count
    LIMIT 500;
  `

  const QUERY_TOP_COLLABS = `
    MATCH (u1:University)-[r:COLLABORATES_WITH]-(u2:University)
    WITH u1, u2, r ORDER BY r.collabs_count DESC
    WITH u1, collect({u2: u2, count: r.collabs_count}) as collabs
    UNWIND collabs[0..3] as collab
    RETURN u1, collab.u2 as u2, collab.count as collabs_count;
  `

  return parseData(await runQuery(QUERY_TOP_COLLABS));
}
