import React, {useState, useEffect} from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { testQuery } from '../helpers/neo4j_helper'

function Graph() {
  const [data, setData] = useState({nodes: [], links: []})

  useEffect(() => {
    testQuery().then(data => {
      setData(data)
    })
  }, []);

  return (
    <div>
      <ForceGraph3D
        graphData={data}
        nodeAutoColorBy='type'
        nodeVal='prod_count'
        enableNodeDrag={false}
      />
    </div>
  )
}

export default Graph