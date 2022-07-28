import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { getUniversityProgramsCollabs } from '../helpers/neo4j_helper'
import AuthorTypeOverlay from './AuthorTypeOverlay'
import authorTypeColorMap from '../config/author_type_colors.json'
import { useRef } from 'react'
import SpriteText from 'three-spritetext'
import AuthorInfoOverlay from './AuthorInfoOverlay'
import { forceLink, forceManyBody, forceCenter } from 'd3-force-3d'

function Graph() {
  const [enabledTypes, setEnabledTypes] = useState(Object.keys(authorTypeColorMap))
  const [data, setData] = useState({nodes: [], links: []})
  const [selectedAuthor, setSelectedAuthor] = useState(undefined)
  const fgRef = useRef();

  useEffect(() => {
    getUniversityProgramsCollabs('UFRGS').then(data => setData(data))

    fgRef.current.d3Force('link',
      forceLink()
        .strength(0.01)
    )
    fgRef.current.d3Force('charge',
      forceManyBody()
        .strength(-300)
        .distanceMin(0)
        .distanceMax(600)
    )
    fgRef.current.d3Force('center',
      forceCenter()
        .strength(0.05)
    )
  }, []);

  useEffect(() => {
    if (selectedAuthor) {
      // Zoom and look-at node
      const distance = 400
      const distRatio = 1 + distance/Math.hypot(selectedAuthor.x, selectedAuthor.y, selectedAuthor.z)
      fgRef.current.cameraPosition(
        { x: selectedAuthor.x * distRatio, y: selectedAuthor.y * distRatio, z: selectedAuthor.z * distRatio }, // new position
        selectedAuthor, // lookAt ({ x, y, z })
        1000 // ms transition duration
      )
    } else {
      // Reset camera
      const camera = fgRef.current.camera
      fgRef.current.cameraPosition(
        { x: camera.x, y: camera.y, z: camera.z }, // new position
        undefined, // lookAt
        1000 // ms transition duration
      );
    }
  }, [selectedAuthor])

  return (
    <div>
      <section className='right-panel'>
        <AuthorTypeOverlay enabledTypes={enabledTypes} setEnabledTypes={setEnabledTypes} />
        { selectedAuthor && <AuthorInfoOverlay author={selectedAuthor} selectAuthor={setSelectedAuthor} /> }
      </section>

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeVal='prod_count'
        nodeAutoColorBy='name'
        nodeOpacity={0.9}
        nodeThreeObject={node => { 
          const sprite = new SpriteText(node.name);
          sprite.textHeight = 3;
          return sprite;
        }} 
        nodeThreeObjectExtend={true}
        linkColor='#d2dae2'
        linkOpacity={0.2}
        linkWidth='collabs'
        backgroundColor='#1e272e'
        enableNodeDrag={true}
        onNodeClick={setSelectedAuthor}
        onBackgroundClick={() => setSelectedAuthor(undefined)}
      />
    </div>
  )
}

export default Graph