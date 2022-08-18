import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { getAuthorsCollabs, getAuthorData } from '../helpers/neo4j_helper'
import AuthorTypeOverlay from './AuthorTypeOverlay'
import authorTypeColorMap from '../config/author_type_colors.json'
import { useCallback, useRef } from 'react'
import SpriteText from 'three-spritetext'
import AuthorInfoOverlay from './AuthorInfoOverlay'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { GlobalContext } from '../App'
import {
  sphereRadius, setZoomLevel, setLinkForce, setChargeForce, setCenterForce,
} from '../helpers/3d_graph_helper'
import * as THREE from 'three'

function AuthorGraph() {
  const [enabledTypes, setEnabledTypes] = useState(Object.keys(authorTypeColorMap))
  const [data, setData] = useState({nodes: [], links: []})
  const [authorData, setAuthorData] = useState(undefined)
  const [selectedAuthor, setSelectedAuthor] = useState(undefined)
  const [windowDimensions, setWindowDimensions] = useState({width: window.innerWidth, height: window.innerHeight})
  const [isLoading, setIsLoading] = useState(true)
  const fgRef = useRef();

  const { university, programs, setPrograms } = React.useContext(GlobalContext);

  useEffect(() => {
    setLinkForce(fgRef.current, 0.2);
    setChargeForce(fgRef.current, -500, 600);
    setCenterForce(fgRef.current, 1);

    window.addEventListener('resize', () => {
      setWindowDimensions({width: window.innerWidth, height: window.innerHeight})
    })
  }, []);

  useEffect(() => {
    getAuthorsCollabs(university, programs, 2)
      .then(data => {
        setData(data)
        setIsLoading(false)
      })
  }, [university, programs])

  useEffect(() => {
    if (selectedAuthor) {
      setIsLoading(true)
      getAuthorData(selectedAuthor.id).then(data => {
        setAuthorData(data)
        setIsLoading(false)
      });
      
      // Set the camera to look at the selected author
      setZoomLevel(fgRef.current, 500)
    } else {
      setAuthorData(undefined);

      // Reset camera
      setZoomLevel(fgRef.current, 1000)
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
    if (selectedAuthor)
      setSelectedAuthor(null)
    else {
      setPrograms([])
    }
  }

  return (
    <section className='graph'>
      { isLoading &&
        <div className='graph-loading'>
          <FontAwesomeIcon icon={faSpinner} spin />
        </div> }

      <div className='back-button' onClick={handleBackButton}>
        <FontAwesomeIcon icon={faArrowLeft}/>
      </div>
      
      <section className='right-panel'>
        <AuthorTypeOverlay enabledTypes={enabledTypes} setEnabledTypes={setEnabledTypes} />
        { selectedAuthor && <AuthorInfoOverlay author={selectedAuthor} authorData={authorData} selectAuthor={setSelectedAuthor} /> }
      </section>

      <ForceGraph3D
        ref={fgRef}
        width={windowDimensions.width}
        height={windowDimensions.height - 50} // 50 is the height of the header
        graphData={authorData || data}
        nodeVal='prod_count'
        nodeLabel={node => `${node.name} (${node.university})`}
        nodeAutoColorBy='university'
        nodeThreeObject={node => { 
          const radius = sphereRadius(node.prod_count) * 7;
          const group = new THREE.Group();
          const geometry = new THREE.SphereGeometry(radius);
          const material = new THREE.MeshLambertMaterial({
            color: node.color,
            transparent: true,
            opacity: selectedAuthor && selectedAuthor.id === node.id ? 1.0 : 0.9
          });
          const sphere = new THREE.Mesh( geometry, material );

          const sprite = new SpriteText(node.name);
          sprite.textHeight = 0.5 * radius;
          sprite.position.set(0, -(2 * radius), 0);

          group.add(sphere);
          group.add(sprite);
          return group;
        }} 
        linkColor='#d2dae2'
        linkOpacity={selectedAuthor ? 0.2 : 0.1}
        linkWidth={node => node.collabs_count / 5}
        backgroundColor='#1e272e'
        enableNodeDrag={true}
        nodeVisibility={isNodeVisible}
        linkVisibility={isLinkVisible}
        onNodeClick={setSelectedAuthor}
        onBackgroundClick={() => setSelectedAuthor(undefined)}
      />
    </section>
  )
}

export default AuthorGraph