import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { getUniversitiesData } from '../helpers/neo4j_helper'
import { useRef } from 'react'
import SpriteText from 'three-spritetext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { GlobalContext } from '../App'
import {
  sphereRadius, setZoomLevel, setLinkForce, setChargeForce, setCenterForce
} from '../helpers/3d_graph_helper'
import * as THREE from 'three'

function Graph() {
  const [data, setData] = useState({nodes: [], links: []})
  const [windowDimensions, setWindowDimensions] = useState({width: window.innerWidth, height: window.innerHeight})
  const [isLoading, setIsLoading] = useState(true)
  const fgRef = useRef();

  const { setUniversity } = React.useContext(GlobalContext);

  useEffect(() => {
    setLinkForce(fgRef.current, 0.05);
    setChargeForce(fgRef.current, -1500);
    setCenterForce(fgRef.current, 1);

    setZoomLevel(fgRef.current, 3500);

    window.addEventListener('resize', () => {
      setWindowDimensions({width: window.innerWidth, height: window.innerHeight})
    })

    getUniversitiesData()
      .then(data => {
        setData(data)
        setIsLoading(false)
      })
  }, []);

  return (
    <section className='graph'>
      { isLoading &&
        <div className='graph-loading'>
          <FontAwesomeIcon icon={faSpinner} spin />
        </div> }

      <ForceGraph3D
        ref={fgRef}
        width={windowDimensions.width}
        height={windowDimensions.height - 50} // 50 is the height of the header
        graphData={data}
        nodeId='name'
        nodeVal='prod_count'
        nodeLabel='name'
        nodeAutoColorBy='name'
        nodeThreeObject={node => { 
            const radius = sphereRadius(node.prod_count) * 3;
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
        onNodeClick={u => setUniversity(u.name)}
        enableNodeDrag={true}
      />
    </section>
  )
}

export default Graph