import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import {
    GlobalContext,
    GraphLevel,
    GraphRef,
    PropsOfShareableGraph,
} from '../../App';
import {
    GraphData,
    getCaptionDict,
    setCenterForce,
    setChargeForce,
    setLinkForce,
    setZoomLevel,
    sphereRadius,
} from '../../helpers/graph_helper';
import { Link, Node, isSimulationOutput } from '../../helpers/neo4j_helper';
import DetailLevelSelector from '../DetailLevelSelector';
import GraphCaptions from '../GraphCaptions';
import NodeDetailsOverlay from '../NodeDetailsOverlay';
import { Program, getProgramsCollabs } from './data-fetching';

import * as THREE from 'three';

const COLOR_BY_PROP = 'wide_knowledge_area';

const Graph = forwardRef<GraphRef, PropsOfShareableGraph>((props, ref) => {
    const [data, setData] = useState<GraphData<Program>>();
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [selectedProgram, setSelectedProgram] = useState<Node<Program>>();
    const [isLoading, setIsLoading] = useState(true);
    const [captionDict, setCaptionsDict] = useState<Record<string, string>>();
    const [connectionDensity, setConnectionDensity] = useState(
        props.sharedState?.state.connectionDensity ?? 3,
    );
    const isFirstLoad = useRef(true);
    const fgRef =
        useRef<ForceGraphMethods<Node<Program>, Link<Node<Program>>>>();

    const { university, setUniversity, setPrograms } =
        React.useContext(GlobalContext);

    useImperativeHandle(
        ref,
        () => ({
            getViewState: () => {
                if (!fgRef.current || !isSimulationOutput(data)) {
                    return;
                }
                const camera = fgRef.current.camera();
                const linkDefinitions = data.links.map((l) => ({
                    ...l,
                    source: l.source.id,
                    target: l.target.id,
                }));
                return {
                    cameraPosition: camera.position,
                    graphData: { ...data, links: linkDefinitions },
                    connectionDensity: connectionDensity,
                    graphLevel: GraphLevel.Programs,
                };
            },
        }),
        [data, connectionDensity],
    );

    useEffect(() => {
        window.addEventListener('resize', () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        });
    }, []);

    useEffect(() => {
        setLinkForce(fgRef.current, 0.05);
        setChargeForce(fgRef.current, -500);
        setCenterForce(fgRef.current, 1);

        if (props.sharedState) {
            const { graphData, cameraPosition, connectionDensity } =
                props.sharedState.state;
            setData(graphData);
            fgRef.current!.cameraPosition(cameraPosition);
            setConnectionDensity(connectionDensity);
            setIsLoading(false);
            isFirstLoad.current = false;
            setTimeout(() => {
                return setCaptionsDict(
                    getCaptionDict(graphData, COLOR_BY_PROP),
                );
            }, 300);
        } else {
            setZoomLevel(fgRef.current, 1000);
            getProgramsCollabs(university, connectionDensity).then((data) => {
                setData(data);
                setIsLoading(false);
                setTimeout(
                    () => setCaptionsDict(getCaptionDict(data, COLOR_BY_PROP)),
                    300,
                );
            });
        }
    }, [university, connectionDensity, props.sharedState]);

    const handleBackButton = () => {
        setUniversity(null);
    };

    const exploreNode = (node) => setPrograms([node.name]);

    const handleNodeClick = (node, event) => {
        event.ctrlKey ? exploreNode(node) : setSelectedProgram(node);
    };

    return (
        <section className="graph">
            <div className="back-button" onClick={handleBackButton}>
                <FontAwesomeIcon icon={faArrowLeft} />
            </div>

            {isLoading && (
                <div className="graph-loading">
                    <FontAwesomeIcon icon={faSpinner} spin />
                </div>
            )}

            <section className="right-panel">
                <GraphCaptions captionData={captionDict} />
                {selectedProgram && (
                    <NodeDetailsOverlay
                        nodeType="PROGRAMA"
                        title={selectedProgram.full_name}
                        detailsSchema={{
                            'Grande Area de Conhecimento':
                                selectedProgram.wide_knowledge_area,
                            'Área de Conhecimento':
                                selectedProgram.knowledge_area,
                            'Sub-área de Conhecimento':
                                selectedProgram.knowledge_subarea,
                            Especialidade: selectedProgram.specialty,
                            'Área de Avaliação': selectedProgram.rating_area,
                            'Número de Produções': selectedProgram.prod_count,
                        }}
                        exploreNode={() => exploreNode(selectedProgram)}
                    />
                )}
            </section>

            <DetailLevelSelector
                density={connectionDensity}
                setDensity={setConnectionDensity}
            />

            <ForceGraph3D<Program, Link<Program>>
                ref={fgRef}
                width={windowDimensions.width}
                height={windowDimensions.height - 50} // 50 is the height of the header
                graphData={data}
                nodeVal="prod_count"
                nodeLabel="name"
                nodeAutoColorBy={COLOR_BY_PROP}
                nodeThreeObject={(node) => {
                    const radius = sphereRadius(node.prod_count) * 4;
                    const group = new THREE.Group();
                    const geometry = new THREE.SphereGeometry(radius);
                    const material = new THREE.MeshLambertMaterial({
                        color: node.color,
                        transparent: true,
                        opacity: 0.9,
                    });
                    const sphere = new THREE.Mesh(geometry, material);

                    const sprite = new SpriteText(node.name);
                    sprite.textHeight = 0.5 * radius;
                    //@ts-ignore
                    sprite.position.set(0, -(2 * radius), 0);

                    group.add(sphere);
                    group.add(sprite);
                    return group;
                }}
                linkColor="#d2dae2"
                linkOpacity={0.2}
                linkWidth={(node) => node.collabs_count / 5}
                backgroundColor="#1e272e"
                onNodeClick={handleNodeClick}
                onBackgroundClick={() => setSelectedProgram(undefined)}
                enableNodeDrag={true}
            />
        </section>
    );
});

export default Graph;
