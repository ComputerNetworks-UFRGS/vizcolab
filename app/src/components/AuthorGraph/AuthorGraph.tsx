import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { ForceGraph2D } from 'react-force-graph';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import {
    ContentMode,
    GlobalContext,
    GraphLevel,
    GraphRef,
    PropsOfShareableGraph,
} from '../../App';
import {
    GraphData,
    setCenterForce,
    setChargeForce,
    setLinkForce,
    setZoomLevel,
    sphereRadius,
} from '../../helpers/graph_helper';
import { Link, Node, isSimulationOutput } from '../../helpers/neo4j_helper';
import DetailLevelSelector from '../DetailLevelSelector';
import NodeDetailsOverlay from '../NodeDetailsOverlay';
import YearRangeSlider from '../YearRangeSlider';
import { Author, getAuthorData, getAuthorsCollabs } from './data-fetching';

const COLOR_BY_PROP = 'research_line';

const Graph = forwardRef<GraphRef, PropsOfShareableGraph>((props, ref) => {
    const [data, setData] = useState<GraphData<Author>>();
    const [yearRange, setYearRange] = useState<[number, number]>(
        props.sharedState?.state.yearRange ?? [2017, 2020],
    );
    const [authorData, setAuthorData] = useState<GraphData<Author>>();
    const [selectedAuthor, setSelectedAuthor] = useState<Node<Author> | null>();
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [connectionDensity, setConnectionDensity] = useState(
        props.sharedState?.state.connectionDensity ?? 3,
    );
    const fgRef = useRef<ForceGraphMethods<Node<Author>, Link<Node<Author>>>>();

    const {
        university,
        setUniversity,
        programs,
        setPrograms,
        author,
        setAuthor,
        setSharedState,
    } = React.useContext(GlobalContext);

    useImperativeHandle(
        ref,
        () => ({
            getViewState: () => {
                if (!fgRef.current || !data) {
                    return;
                }
                const camera = fgRef.current.camera();
                const graphData = isSimulationOutput(data)
                    ? {
                          ...data,
                          links: data.links.map((l) => ({
                              ...l,
                              source: l.source.id,
                              target: l.target.id,
                          })),
                      }
                    : data;

                return {
                    cameraPosition: camera.position,
                    graphData,
                    connectionDensity: connectionDensity,
                    graphLevel: GraphLevel.Authors,
                    author,
                    programs,
                    university,
                };
            },
            focusAuthor: (authorName: string) => {
                if (!isSimulationOutput(data) || !fgRef.current) {
                    return;
                }
                const node = data?.nodes.find((n) => n.name === authorName);

                if (!node || !node.x || !node.y || !node.z) {
                    return;
                }
                // Aim at node from outside it
                const distance = 120 + node.prod_count / 100;
                const distRatio =
                    1 + distance / Math.hypot(node.x, node.y, node.z);

                fgRef.current.cameraPosition(
                    {
                        x: node.x * distRatio,
                        y: node.y * distRatio,
                        z: node.z * distRatio,
                    }, // new position
                    { x: node.x, y: node.y, z: node.z }, // lookAt ({ x, y, z })
                    3000, // ms transition duration
                );
            },
        }),
        [data, connectionDensity, author, university, programs],
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
        setChargeForce(fgRef.current, -500, 600);
        setCenterForce(fgRef.current, 1);
        if (props.sharedState && !programs.length && !author && !university) {
            const { graphData, cameraPosition, author, university, programs } =
                props.sharedState.state;
            setData(graphData);
            fgRef.current!.cameraPosition(cameraPosition);
            if (university) {
                setUniversity(university);
            }
            if (author) {
                setAuthor(author);
            }
            if (programs?.length) {
                setPrograms(props.sharedState.state.programs);
            }
            setIsLoading(false);
        } else {
            getAuthorsCollabs(
                university,
                programs,
                connectionDensity,
                yearRange,
            ).then((data) => {
                setData(data);
                setIsLoading(false);
            });
        }
    }, [
        university,
        programs,
        connectionDensity,
        props.sharedState,
        setUniversity,
        setAuthor,
        setPrograms,
        author,
        yearRange,
    ]);

    useEffect(() => {
        if (author) {
            setSelectedAuthor(author);
            setIsLoading(true);
            getAuthorData(author.id, yearRange).then((data) => {
                setAuthorData(data);
                setIsLoading(false);
            });

            // Set the camera to look at the selected author
            if (props.contentMode === ContentMode._3D) {
                setZoomLevel(fgRef.current, 500);
            }
            setLinkForce(fgRef.current, 0.02);
        } else {
            setAuthorData(undefined);

            // Reset camera
            if (props.contentMode === ContentMode._3D) {
                setZoomLevel(fgRef.current, 1000);
            }
            setLinkForce(fgRef.current, 0.2);
        }
    }, [author, yearRange, props.contentMode]);

    const handleBackButton = () => {
        if (author) {
            setAuthor(null);
            setSelectedAuthor(null);
        } else {
            setSharedState(undefined);
            setPrograms([]);
        }
    };

    const exploreNode = (node) => {
        window.history.replaceState(
            null,
            `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a
            partir de dados da CAPES`,
            '/',
        );
        setSharedState(null);
        return setAuthor(node);
    };

    const handleNodeClick = (node, event) => {
        event.ctrlKey ? exploreNode(node) : setSelectedAuthor(node);
    };

    const nodesOrderedByBetweenness = Array.from(data?.nodes ?? []).sort(
        (a, b) => {
            return b.betweenness_centrality - a.betweenness_centrality;
        },
    );

    const nodesOrderedByDegree = Array.from(data?.nodes ?? []).sort((a, b) => {
        return b.degree_centrality - a.degree_centrality;
    });

    return (
        <section className="graph">
            {isLoading && (
                <div className="graph-loading">
                    <FontAwesomeIcon icon={faSpinner} spin />
                </div>
            )}

            <div className="back-button" onClick={handleBackButton}>
                <FontAwesomeIcon icon={faArrowLeft} />
            </div>

            <section className="right-panel">
                {selectedAuthor && (
                    <NodeDetailsOverlay
                        nodeType="AUTOR"
                        title={selectedAuthor.name}
                        detailsSchema={{
                            Universidade: selectedAuthor.university,
                            'Programa IES': selectedAuthor.ies_program,
                            'Linha de Pesquisa': selectedAuthor.research_line,
                            Tipo: selectedAuthor.type,
                            'Nome ABNT': selectedAuthor.abnt_name,
                            'Número de Produções': selectedAuthor.prod_count,
                            [`Centralidade de Grau (${
                                nodesOrderedByDegree!.findIndex(
                                    (n) => n.id === selectedAuthor.id,
                                ) + 1
                            }º)`]: selectedAuthor.degree_centrality,
                            [`Centralidade de Intermediação (${
                                nodesOrderedByBetweenness!.findIndex(
                                    (n) => n.id === selectedAuthor.id,
                                ) + 1
                            }º)`]: selectedAuthor.betweenness_centrality,
                        }}
                        exploreNode={
                            !authorData || author.id !== selectedAuthor.id
                                ? () => exploreNode(selectedAuthor)
                                : undefined
                        }
                        authorData={authorData}
                        selectAuthor={setAuthor}
                    />
                )}
            </section>

            <YearRangeSlider
                yearRange={yearRange}
                setYearRange={setYearRange}
            />

            {!authorData && (
                <DetailLevelSelector
                    density={connectionDensity}
                    setDensity={setConnectionDensity}
                />
            )}

            {props.contentMode === ContentMode._3D && (
                <ForceGraph3D<Author, Link<Author>>
                    ref={fgRef}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50} // 50 is the height of the header
                    graphData={authorData || data}
                    nodeVal="prod_count"
                    nodeLabel={(node) =>
                        `<div class="node-label">${node.name} (${node.university})<br><small>${node.research_line}</small></div>`
                    }
                    nodeAutoColorBy={COLOR_BY_PROP}
                    nodeThreeObject={(node) => {
                        const radius = sphereRadius(node.prod_count) * 8;
                        const group = new THREE.Group();
                        const geometry = new THREE.SphereGeometry(radius);
                        const material = new THREE.MeshLambertMaterial({
                            color: node.color,
                            transparent: true,
                            opacity:
                                selectedAuthor && selectedAuthor.id === node.id
                                    ? 1.0
                                    : 0.9,
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
                    linkOpacity={0.15}
                    linkWidth={(node) => node.collabs_count}
                    backgroundColor="#1e272e"
                    enableNodeDrag={true}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedAuthor(undefined)}
                />
            )}
            {props.contentMode === ContentMode._2D && (
                <ForceGraph2D<Author, Link<Author>>
                    //@ts-ignore
                    ref={fgRef}
                    graphData={authorData || data}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50}
                    nodeVal="prod_count"
                    nodeLabel="name"
                    nodeAutoColorBy={COLOR_BY_PROP}
                    linkColor={() => '#d2dae2'}
                    linkOpacity={0.2}
                    linkWidth={(link) => {
                        return link.collabs_count / 5;
                    }}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedAuthor(undefined)}
                    enableNodeDrag={true}
                    backgroundColor="#1E272E"
                    nodeCanvasObject={(node, ctx) => {
                        const label = node.name;
                        const fontSize = 10;
                        ctx.font = `${fontSize}px Sans-Serif`;

                        // Circle size could depend on a node property or just a constant
                        const circleRadius = node.prod_count / 1.5;

                        // Draw the circle
                        ctx.beginPath();
                        ctx.arc(
                            node.x!,
                            node.y!,
                            circleRadius,
                            0,
                            2 * Math.PI,
                            false,
                        );
                        ctx.fillStyle = node.color;
                        ctx.fill();

                        // Draw the label
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'white';

                        // Add a border around the label
                        ctx.strokeStyle = 'black'; // Border color
                        ctx.lineWidth = 3; // Border width
                        ctx.strokeText(label, node.x!, node.y!);

                        ctx.fillText(label, node.x!, node.y!);
                    }}
                />
            )}
        </section>
    );
});

export default Graph;
