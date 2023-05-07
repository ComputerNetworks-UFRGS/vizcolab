import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { GlobalContext, GraphLevel, SharedState } from '../App';
import {
    getCaptionDict,
    setCenterForce,
    setChargeForce,
    setLinkForce,
    setZoomLevel,
    sphereRadius,
} from '../helpers/graph_helper';
import {
    HexColor,
    LinkDefinition,
    LinkLike,
    UniversityNode,
    getUniversitiesCollabs,
} from '../helpers/neo4j_helper';
import DetailLevelSelector from './DetailLevelSelector';
import GraphCaptions from './GraphCaptions';
import NodeDetailsOverlay from './NodeDetailsOverlay';

const COLOR_BY_PROP = 'region';

const Graph = forwardRef<{}, { sharedState?: SharedState | null }>(
    (props, ref) => {
        const [data, setData] = useState<
            | {
                  nodes: UniversityNode[];
                  links: LinkLike[];
              }
            | undefined
        >();
        const [windowDimensions, setWindowDimensions] = useState({
            width: window.innerWidth,
            height: window.innerHeight,
        });
        const [selectedUniversity, setSelectedUniversity] = useState<
            UniversityNode | undefined
        >(undefined);
        const [isLoading, setIsLoading] = useState(true);
        const [captionsDict, setCaptionsDict] = useState<
            Record<string, HexColor> | undefined
        >(undefined);
        const [connectionDensity, setConnectionDensity] = useState(3);
        const fgRef = useRef<ForceGraphMethods<UniversityNode, LinkLike>>();
        useImperativeHandle(
            ref,
            () => ({
                getViewState: () => {
                    if (!fgRef.current) return;
                    const camera = fgRef.current.camera();
                    return {
                        cameraPosition: camera.position,
                        graphData: data,
                        connectionDensity: connectionDensity,
                        graphLevel: GraphLevel.Universities,
                    };
                },
            }),
            [data, connectionDensity],
        );

        const { setUniversity } = React.useContext(GlobalContext);

        useEffect(() => {
            window.addEventListener('resize', () => {
                setWindowDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            });
        }, [data]);

        useEffect(() => {
            setLinkForce(fgRef.current, 0.05);
            setChargeForce(fgRef.current, -500);
            setCenterForce(fgRef.current, 1);
            setZoomLevel(fgRef.current, 3500);
            if (props.sharedState) {
                const linkDefinitions: LinkDefinition[] =
                    props.sharedState.state.graphData.links.map((link) => {
                        return {
                            source: link.source.id,
                            target: link.target.id,
                            collabs_count: link.collabs_count,
                        };
                    });

                const newGraphData = {
                    nodes: props.sharedState.state.graphData.nodes,
                    links: linkDefinitions,
                };
                setData(newGraphData);
                fgRef.current!.cameraPosition(
                    props.sharedState.state.cameraPosition,
                );
                setIsLoading(false);
                setTimeout(() => {
                    return setCaptionsDict(
                        getCaptionDict(newGraphData, COLOR_BY_PROP),
                    );
                }, 300);
            } else {
                getUniversitiesCollabs(connectionDensity).then((data) => {
                    setData(data);
                    setIsLoading(false);
                    setTimeout(
                        () =>
                            setCaptionsDict(
                                getCaptionDict(data, COLOR_BY_PROP),
                            ),
                        300,
                    );
                });
            }
        }, [connectionDensity, props.sharedState]);

        const exploreNode = (node) => setUniversity(node.name);

        const handleNodeClick = (node, event) => {
            event.ctrlKey ? exploreNode(node) : setSelectedUniversity(node);
        };

        return (
            <section className="graph">
                {isLoading && (
                    <div className="graph-loading">
                        <FontAwesomeIcon icon={faSpinner} spin />
                    </div>
                )}

                <section className="right-panel">
                    <GraphCaptions captionData={captionsDict} />
                    {selectedUniversity && (
                        <NodeDetailsOverlay
                            nodeType="UNIVERSIDADE"
                            title={selectedUniversity.full_name}
                            detailsSchema={{
                                Sigla: selectedUniversity.name,
                                'Status Jurídico':
                                    selectedUniversity.legal_status,
                                Região: selectedUniversity.region,
                                UF: selectedUniversity.uf,
                                Cidade: selectedUniversity.city,
                                'Número de Produções':
                                    selectedUniversity.prod_count,
                            }}
                            exploreNode={() => exploreNode(selectedUniversity)}
                        />
                    )}
                </section>

                <DetailLevelSelector
                    density={connectionDensity}
                    setDensity={setConnectionDensity}
                />

                <ForceGraph3D<UniversityNode, LinkLike>
                    ref={fgRef}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50} // 50 is the height of the header
                    graphData={data}
                    nodeVal="prod_count"
                    nodeLabel="name"
                    nodeAutoColorBy={COLOR_BY_PROP}
                    nodeThreeObject={(node) => {
                        const radius = sphereRadius(node.prod_count) * 1.5;
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
                    linkWidth={(link) => {
                        return link.collabs_count / 150;
                    }}
                    backgroundColor="#1e272e"
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedUniversity(undefined)}
                    enableNodeDrag={true}
                />
            </section>
        );
    },
);

export default Graph;
