import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { testQueryCoAuthors } from '../helpers/neo4j_helper'

function Graph() {
  const [data, setData] = useState({nodes: [], links: []})

  useEffect(() => {
    testQueryCoAuthors().then(data => {
      setData(data)
    })
  }, []);

  return (
    <div>
      <ForceGraph3D
        graphData={data}
        nodeAutoColorBy='type'
        nodeVal='prod_count'
        linkColor='#d2dae2'
        linkOpacity={0.1}
        linkWidth='collabs'
        backgroundColor='#1e272e'
        enableNodeDrag={true}
      />
    </div>
  )
}

export default Graph