import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { testQueryCoAuthors } from '../helpers/neo4j_helper'
import AuthorTypeOverlay from './AuthorTypeOverlay'
import authorTypeColorMap from '../config/author_type_colors.json'
import { useCallback, useRef } from 'react'
import SpriteText from 'three-spritetext'
import AuthorInfoOverlay from './AuthorInfoOverlay'
import { forceLink, forceManyBody } from 'd3-force-3d'

function Graph() {
  const [enabledTypes, setEnabledTypes] = useState(Object.keys(authorTypeColorMap))
  const [data, setData] = useState({nodes: [], links: []})
  const [selectedNode, setSelectedNode] = useState(undefined)
  const fgRef = useRef();

  useEffect(() => {
    testQueryCoAuthors().then(data => setData(data))

    fgRef.current.d3Force('link',
      forceLink()
        .strength(0.2)
    )
    fgRef.current.d3Force('charge',
      forceManyBody()
        .strength(-180)
        .distanceMin(0)
        .distanceMax(600)
    )
  }, []);

  useEffect(() => {
    if (selectedNode) {
      // Zoom and look-at node
      const distance = 400
      const distRatio = 1 + distance/Math.hypot(selectedNode.x, selectedNode.y, selectedNode.z)
      fgRef.current.cameraPosition(
        { x: selectedNode.x * distRatio, y: selectedNode.y * distRatio, z: selectedNode.z * distRatio }, // new position
        selectedNode, // lookAt ({ x, y, z })
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
  }, [selectedNode])

  const isNodeVisible = useCallback(node => {
    const nodeType = node.type
    return nodeType ? enabledTypes.includes(node.type) : true
  }, [enabledTypes])

  const isLinkVisible = useCallback(link => {
    const sourceType = link.source.type
    const targetType = link.target.type
    return sourceType && targetType ? enabledTypes.includes(sourceType) && enabledTypes.includes(targetType) : true
  }, [enabledTypes])

  return (
    <div>
      <section className='right-panel'>
        <AuthorTypeOverlay enabledTypes={enabledTypes} setEnabledTypes={setEnabledTypes} />
        { selectedNode && <AuthorInfoOverlay author={selectedNode} /> }
      </section>

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeVal='prod_count'
        nodeOpacity={0.9}
        nodeThreeObject={node => { 
          const sprite = new SpriteText(node.name);
          sprite.textHeight = 3;
          return sprite;
        }} 
        nodeThreeObjectExtend={true}
        linkColor='#d2dae2'
        linkOpacity={0.1}
        linkWidth='collabs'
        backgroundColor='#1e272e'
        enableNodeDrag={true}
        nodeVisibility={isNodeVisible}
        linkVisibility={isLinkVisible}
        onNodeClick={setSelectedNode}
        onBackgroundClick={() => setSelectedNode(undefined)}
      />
    </div>
  )
}

export default Graph