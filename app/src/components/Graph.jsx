import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { getUniversityProgramCoAuthors, getAuthorData } from '../helpers/neo4j_helper'
import AuthorTypeOverlay from './AuthorTypeOverlay'
import authorTypeColorMap from '../config/author_type_colors.json'
import { useCallback, useRef } from 'react'
import SpriteText from 'three-spritetext'
import AuthorInfoOverlay from './AuthorInfoOverlay'
import { forceLink, forceManyBody, forceCenter } from 'd3-force-3d'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons'
import * as THREE from 'three'

// Calcula o raio de uma esfera com base no volume
function sphereRadius(volume) {
  return Math.cbrt(3*volume/(4*Math.PI))
}

function Graph() {
  const [enabledTypes, setEnabledTypes] = useState(Object.keys(authorTypeColorMap))
  const [data, setData] = useState({nodes: [], links: []})
  const [authorData, setAuthorData] = useState(undefined)
  const [selectedAuthor, setSelectedAuthor] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const fgRef = useRef();

  useEffect(() => {
    getUniversityProgramCoAuthors('UFRGS', 'COMPUTAÇÃO')
      .then(data => {
        setData(data)
        setIsLoading(false)
      })

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
    fgRef.current.d3Force('center',
      forceCenter()
        .strength(1)
    )
  }, []);

  useEffect(() => {
    if (selectedAuthor) {
      setIsLoading(true)
      getAuthorData(selectedAuthor.id).then(data => {
        setAuthorData(data)
        setIsLoading(false)
      });
      
      // Zoom and look-at node
      const distance = 300
      const distRatio = 1 + distance/Math.hypot(selectedAuthor.x, selectedAuthor.y, selectedAuthor.z)
      fgRef.current.cameraPosition(
        { x: selectedAuthor.x * distRatio, y: selectedAuthor.y * distRatio, z: selectedAuthor.z * distRatio }, // new position
        { x: 0, y: 0, z: 0 }, // lookAt ({ x, y, z })
        0 // ms transition duration
      )
    } else {
      setAuthorData(undefined);

      // Reset camera
      const camera = fgRef.current.camera
      fgRef.current.cameraPosition(
        { x: camera.x, y: camera.y, z: camera.z }, // new position
        undefined, // lookAt
        0 // ms transition duration
      );
    }
  }, [selectedAuthor])

  const isNodeVisible = useCallback(node => {
    const nodeType = node.type
    return nodeType ? enabledTypes.includes(node.type) : true
  }, [enabledTypes])

  const isLinkVisible = useCallback(link => {
    const sourceType = link.source.type
    const targetType = link.target.type
    return sourceType && targetType ? enabledTypes.includes(sourceType) && enabledTypes.includes(targetType) : true
  }, [enabledTypes])

  const handleBackButton = () => {
    if (selectedAuthor) setSelectedAuthor(undefined)
  }

  return (
    <div>
      { isLoading &&
        <div className='graph-loading'>
          <FontAwesomeIcon icon={faSpinner} spin />
        </div> }

      { selectedAuthor && 
        <div className='back-button' onClick={handleBackButton}>
          <FontAwesomeIcon icon={faArrowLeft}/>
        </div> }
      
      <section className='right-panel'>
        <AuthorTypeOverlay enabledTypes={enabledTypes} setEnabledTypes={setEnabledTypes} />
        { selectedAuthor && <AuthorInfoOverlay author={selectedAuthor} authorData={authorData}  selectAuthor={setSelectedAuthor} /> }
      </section>

      <ForceGraph3D
        ref={fgRef}
        graphData={authorData || data}
        nodeVal='prod_count'
        nodeLabel={node => `${node.name} (${node.university})`}
        nodeAutoColorBy='university'
        nodeThreeObject={node => { 
          const radius = sphereRadius(node.prod_count) * 6;
          const group = new THREE.Group();
          const geometry = new THREE.SphereGeometry(radius);
          const material = new THREE.MeshLambertMaterial({
            color: node.color,
            transparent: true,
            opacity: selectedAuthor && selectedAuthor.id === node.id ? 1.0 : 0.9
          });
          const sphere = new THREE.Mesh( geometry, material );

          const sprite = new SpriteText(node.name);
          sprite.textHeight = 3;
          sprite.position.set(0, -(radius + 5), 0);

          group.add(sphere);
          group.add(sprite);
          return group;
        }} 
        linkColor='#d2dae2'
        linkOpacity={selectedAuthor ? 0.2 : 0.1}
        linkWidth='collabs'
        backgroundColor='#1e272e'
        enableNodeDrag={true}
        nodeVisibility={isNodeVisible}
        linkVisibility={isLinkVisible}
        onNodeClick={setSelectedAuthor}
        onBackgroundClick={() => setSelectedAuthor(undefined)}
      />
    </div>
  )
}

export default Graph