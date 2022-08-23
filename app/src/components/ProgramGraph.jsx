import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { getProgramsCollabs } from '../helpers/neo4j_helper'
import { useRef } from 'react'
import SpriteText from 'three-spritetext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { GlobalContext } from '../App'
import GraphLegend from './GraphLegend'
import { 
  sphereRadius, setZoomLevel, setLinkForce, setChargeForce, setCenterForce, getLegendData
} from '../helpers/graph_helper'

import * as THREE from 'three'

const COLOR_BY_PROP = 'wide_knowledge_area'

function Graph() {
  const [data, setData] = useState({nodes: [], links: []})
  const [windowDimensions, setWindowDimensions] = useState({width: window.innerWidth, height: window.innerHeight})
  const [isLoading, setIsLoading] = useState(true)
  const [legendData, setLegendData] = useState(undefined)
  const fgRef = useRef();

  const { university, setUniversity, setPrograms } = React.useContext(GlobalContext);

  useEffect(() => {
    setLinkForce(fgRef.current, 0.05);
    setChargeForce(fgRef.current, -500);
    setCenterForce(fgRef.current, 1);

    setZoomLevel(fgRef.current, 1000);

    window.addEventListener('resize', () => {
      setWindowDimensions({width: window.innerWidth, height: window.innerHeight})
    })
  }, []);

  useEffect(() => {
    getProgramsCollabs(university)
      .then(data => {
        setData(data)
        setIsLoading(false)
        setTimeout(() => setLegendData(getLegendData(data, COLOR_BY_PROP)), 300)
    })
  }, [university])

  const handleBackButton = () => {
    setUniversity(null)
  }

  return (
    <section className='graph'>
      <div className='back-button' onClick={handleBackButton}>
        <FontAwesomeIcon icon={faArrowLeft}/>
      </div>

      { isLoading &&
        <div className='graph-loading'>
          <FontAwesomeIcon icon={faSpinner} spin />
        </div> }

      <section className='right-panel'>
        <GraphLegend legendData={legendData}/>
      </section>

      <ForceGraph3D
        ref={fgRef}
        width={windowDimensions.width}
        height={windowDimensions.height - 50} // 50 is the height of the header
        graphData={data}
        nodeVal='prod_count'
        nodeLabel='name'
        nodeAutoColorBy={COLOR_BY_PROP}
        nodeThreeObject={node => { 
            const radius = sphereRadius(node.prod_count) * 4;
            const group = new THREE.Group();
            const geometry = new THREE.SphereGeometry(radius);
            const material = new THREE.MeshLambertMaterial({
              color: node.color,
              transparent: true,
              opacity: 0.9
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
        linkOpacity={0.2}
        linkWidth={node => node.collabs_count / 15}
        backgroundColor='#1e272e'
        onNodeClick={p => setPrograms([p.name])}
        enableNodeDrag={true}
      />
    </section>
  )
}

export default Graph