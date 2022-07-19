import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { testQueryCoAuthors } from '../helpers/neo4j_helper'
import AuthorTypeOverlay from './AuthorTypeOverlay'
import authorTypeColorMap from '../config/author_type_colors.json'
import { useCallback, useRef } from 'react'
import SpriteText from 'three-spritetext'

function Graph() {
  const [enabledTypes, setEnabledTypes] = useState(Object.keys(authorTypeColorMap))
  const [data, setData] = useState({nodes: [], links: []})
  const fgRef = useRef();

  useEffect(() => {
    testQueryCoAuthors().then(data => setData(data))
  }, []);

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
      <AuthorTypeOverlay enabledTypes={enabledTypes} setEnabledTypes={setEnabledTypes} />
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeVal='prod_count'
        nodeRelSize={3}
        nodeThreeObject={node => { 
          const sprite = new SpriteText(node.name);
          sprite.textHeight = 3;
          return sprite;
        }} 
        nodeThreeObjectExtend={true}
        linkColor='#d2dae2'
        linkOpacity={0.05}
        linkWidth='collabs'
        backgroundColor='#1e272e'
        enableNodeDrag={false}
        nodeVisibility={isNodeVisible}
        linkVisibility={isLinkVisible}
      />
    </div>
  )
}

export default Graph