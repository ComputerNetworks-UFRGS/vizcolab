import React, {useState, useEffect} from 'react'
import { ForceGraph3D } from 'react-force-graph'
import { getAuthorsCollabs, getAuthorData } from '../helpers/neo4j_helper'
import { useRef } from 'react'
import SpriteText from 'three-spritetext'
import NodeDetailsOverlay from './NodeDetailsOverlay'
import DetailLevelSelector from './DetailLevelSelector'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { GlobalContext } from '../App'
import {
  sphereRadius, setZoomLevel, setLinkForce, setChargeForce, setCenterForce, getLegendData
} from '../helpers/graph_helper'
import * as THREE from 'three'

const COLOR_BY_PROP = 'research_line'

function AuthorGraph() {
  const [data, setData] = useState({nodes: [], links: []})
  const [authorData, setAuthorData] = useState(undefined)
  const [selectedAuthor, setSelectedAuthor] = useState(undefined)
  const [windowDimensions, setWindowDimensions] = useState({width: window.innerWidth, height: window.innerHeight})
  const [isLoading, setIsLoading] = useState(true)
  const [legendData, setLegendData] = useState(undefined)
  const [connectionDensity, setConnectionDensity] = useState(2)
  const fgRef = useRef();

  const { university, programs, setPrograms, author, setAuthor } = React.useContext(GlobalContext);

  useEffect(() => {
    setLinkForce(fgRef.current, 0.2);
    setChargeForce(fgRef.current, -500, 600);
    setCenterForce(fgRef.current, 1);

    window.addEventListener('resize', () => {
      setWindowDimensions({width: window.innerWidth, height: window.innerHeight})
    })
  }, []);

  useEffect(() => {
    getAuthorsCollabs(university, programs, connectionDensity)
      .then(data => {
        setData(data)
        setIsLoading(false)
        setTimeout(() => setLegendData(getLegendData(data, COLOR_BY_PROP)), 500)
      })
  }, [university, programs, connectionDensity])

  useEffect(() => {
    if (author) {
      setSelectedAuthor(author)
      setIsLoading(true)
      getAuthorData(author.id).then(data => {
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
  }, [author])

  const handleBackButton = () => {
    if (author) {
      setAuthor(null)
      setSelectedAuthor(null)
    } else {
      setPrograms([])
    }
  }

  const exploreNode = (node) => setAuthor(node)

  const handleNodeClick = (node, event) => {
    event.ctrlKey ? exploreNode(node) : setSelectedAuthor(node)
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
        {/* <GraphLegend legendData={legendData}/> */}
        { selectedAuthor &&
          <NodeDetailsOverlay nodeType='AUTOR' title={selectedAuthor.name} detailsSchema={{
            'Universidade': selectedAuthor.university,
            'Programa IES': selectedAuthor.ies_program,
            'Linha de Pesquisa': selectedAuthor.research_line,
            'Tipo': selectedAuthor.type,
            'Nome ABNT': selectedAuthor.abnt_name,
            'Número de Produções': selectedAuthor.prod_count
          }}
          exploreNode={!authorData ? () => exploreNode(selectedAuthor) : undefined}
          authorData={authorData} selectAuthor={setAuthor} />
        }
      </section>

      <DetailLevelSelector density={connectionDensity} setDensity={setConnectionDensity}/>

      <ForceGraph3D
        ref={fgRef}
        width={windowDimensions.width}
        height={windowDimensions.height - 50} // 50 is the height of the header
        graphData={authorData || data}
        nodeVal='prod_count'
        nodeLabel={node => `<div class="node-label">${node.name} (${node.university})<br><small>${node.research_line}</small></div>`}
        nodeAutoColorBy={COLOR_BY_PROP}
        nodeThreeObject={node => {
          const radius = sphereRadius(node.prod_count) * 8;
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
        linkOpacity={0.2}
        linkWidth={node => node.collabs_count}
        backgroundColor='#1e272e'
        enableNodeDrag={true}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setSelectedAuthor(undefined)}
      />
    </section>
  )
}

export default AuthorGraph