import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import {
    ContentMode,
    GlobalContext,
    GraphLevel,
    GraphRef,
    PropsOfShareableGraph,
    captionModes,
} from '../../App';
import {
    GraphData,
    convertRGBtoRGBA,
    getCaptionDict,
    getNodeColor,
    hexToRgba,
    setCenterForce,
    setChargeForce,
    setLinkForce,
    setZoomLevel,
    sphereRadius,
} from '../../helpers/graph_helper';
import { Link, Node, isSimulationOutput } from '../../helpers/neo4j_helper';
import DetailLevelSelector from '../DetailLevelSelector';
import GraphCaptions from '../GraphCaptionsPanel/GraphCaptions';
import NodeDetailsOverlay from '../NodeDetails/NodeDetailsOverlay';
import { Program, getProgramsCollabs } from './data-fetching';

import { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { ForceGraph2D } from 'react-force-graph';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { AG_GRID_LOCALE_PT_BR } from '../../config/ag-grid-ptbr.locale.js';
import VisibilityTooltipHeader from '../AgGridVisibilityTooltipHeader';
import YearRangeSlider from '../YearRangeSlider';

const COLOR_BY_PROP = 'wide_knowledge_area';

const Graph = forwardRef<GraphRef, PropsOfShareableGraph>((props, ref) => {
    const [data, setData] = useState<GraphData<Program>>();
    const [yearRange, setYearRange] = useState<[number, number]>(
        props.sharedState?.state.yearRange ?? [2017, 2020],
    );
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [selectedProgram, setSelectedProgram] = useState<Node<Program>>();
    const [isLoading, setIsLoading] = useState(true);
    const [captionDict, setCaptionDict] = useState<Record<string, string>>();
    const [connectionDensity, setConnectionDensity] = useState(
        props.sharedState?.state.connectionDensity ?? 3,
    );
    const fgRef =
        useRef<ForceGraphMethods<Node<Program>, Link<Node<Program>>>>();

    const { university, setUniversity, setPrograms, setSharedState } =
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
                    university,
                };
            },
            focusProgram: (programName: string) => {
                if (!isSimulationOutput(data) || !fgRef.current) {
                    return;
                }
                const node = data?.nodes.find((n) => n.name === programName);

                if (
                    !node ||
                    !node.x ||
                    !node.y ||
                    (props.contentMode === ContentMode._3D && !node.z)
                ) {
                    return;
                }

                if (props.contentMode === ContentMode._3D) {
                    // Aim at node from outside it
                    const distance = 120 + node.prod_count / 100;
                    const distRatio =
                        1 + distance / Math.hypot(node.x, node.y, node.z!);

                    fgRef.current.cameraPosition(
                        {
                            x: node.x * distRatio,
                            y: node.y * distRatio,
                            z: node.z! * distRatio,
                        }, // new position
                        { x: node.x, y: node.y, z: node.z! }, // lookAt ({ x, y, z })
                        3000, // ms transition duration
                    );
                }

                if (props.contentMode === ContentMode._2D) {
                    fgRef.current.zoomToFit(
                        3000,
                        300 + node.name.length,
                        (nodeCandidate) => nodeCandidate.id === node.id,
                    );
                }
            },
        }),
        [data, connectionDensity, university],
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
        if (props.contentMode !== ContentMode.Rankings) {
            setLinkForce(fgRef.current, 0.05);
            setCenterForce(fgRef.current, 1);
        }
        if (props.contentMode === ContentMode._3D) {
            setChargeForce(fgRef.current, -500);
            setZoomLevel(fgRef.current, 3500);
        }
        if (props.contentMode === ContentMode._2D) {
            setChargeForce(fgRef.current, -1500);
        }
        if (props.sharedState) {
            const { graphData, cameraPosition, connectionDensity } =
                props.sharedState.state;
            setData(graphData);
            fgRef.current!.cameraPosition(cameraPosition);
            setConnectionDensity(connectionDensity);
            setIsLoading(false);
            setUniversity(props.sharedState.state.university);
            setTimeout(() => {
                return setCaptionDict(getCaptionDict(graphData, COLOR_BY_PROP));
            }, 300);
        } else {
            if (props.contentMode === ContentMode._3D) {
                setZoomLevel(fgRef.current, 1000);
            }
            getProgramsCollabs(university, connectionDensity, yearRange).then(
                (data) => {
                    setData(data);
                    setIsLoading(false);
                    setTimeout(
                        () =>
                            setCaptionDict(getCaptionDict(data, COLOR_BY_PROP)),
                        300,
                    );
                },
            );
        }
    }, [
        university,
        connectionDensity,
        props.sharedState,
        setUniversity,
        yearRange,
    ]);

    const [currentCaptionModeIndex, setCurrentCaptionModeIndex] = useState(0);
    const captionMode = captionModes[currentCaptionModeIndex];
    useEffect(() => {
        if (!data) return;

            data.nodes.forEach((n) => {
                if (captionMode === 'degree') {
                    //@ts-ignore
                    n.color = getNodeColor(n.degree_centrality);
                }
                if (captionMode === 'betweenness') {
                    //@ts-ignore
                    n.color = getNodeColor(n.betweenness_centrality);
                }
                if (captionMode === 'closeness') {
                    //@ts-ignore
                    n.color = getNodeColor(n.closeness_centrality);
                }
            if (captionMode === 'colorKey') {
                //@ts-ignore
                n.color = getNodeColor(n[COLOR_BY_PROP]);
            }
            });

            setTimeout(
                () => setCaptionDict(getCaptionDict(data, COLOR_BY_PROP)),
                300,
            );
    }, [captionMode, data]);

    const navigate = useNavigate();

    const handleBackButton = () => {
        setUniversity(undefined);
        setSharedState(undefined);
        navigate('/');
    };

    const exploreNode = (node) => {
        window.history.replaceState(
            null,
            `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a
            partir de dados da CAPES`,
            '/',
        );
        setSharedState(null);
        return setPrograms([node.name]);
    };

    const handleNodeClick = (node, event) => {
        event.ctrlKey ? exploreNode(node) : setSelectedProgram(node);
    };

    const nodesOrderedByBetweenness = Array.from(data?.nodes ?? []).sort(
        (a, b) => {
            return b.betweenness_centrality - a.betweenness_centrality;
        },
    );

    const nodesOrderedByDegree = Array.from(data?.nodes ?? []).sort((a, b) => {
        return b.degree_centrality - a.degree_centrality;
    });

    const nodesOrderedByCloseness = Array.from(data?.nodes ?? []).sort(
        (a, b) => {
            return b.closeness_centrality - a.closeness_centrality;
        },
    );

    const defaultColDef = useMemo<ColDef>(
        () => ({
            sortable: true,
            resizable: true,
            filter: true,
            hide: false,
        }),
        [],
    );

    const tableModeColumns: ColDef[] = [
        {
            headerName: '#',
            field: 'lineNo',
            width: 77,
            valueGetter: (params) => params.node?.rowIndex ?? 0 + 1,
            sortable: false,
            filter: false,
            suppressMovable: true,
            headerComponent: VisibilityTooltipHeader,
        },
        {
            headerName: 'Programa',
            field: 'full_name',
            flex: 2,
            resizable: true,
        },
        {
            headerName: 'Grande área do conhecimento',
            field: 'wide_knowledge_area',
            flex: 1.5,
            resizable: true,
        },
        {
            headerName: 'Área',
            field: 'knowledge_area',
            flex: 1,
            resizable: true,
        },
        {
            headerName: 'Centralidade de Intermediação',
            field: 'betweenness_centrality',
            flex: 1,
            resizable: true,
        },
        {
            headerName: 'Centralidade de Grau',
            field: 'degree_centrality',
            flex: 1,
            resizable: true,
        },
        {
            headerName: 'Centralidade de Proximidade',
            field: 'closeness_centrality',
            flex: 1,
        },
    ];

    return (
        <section className="graph">
            {props.contentMode !== ContentMode.Rankings && (
                <div className="back-button" onClick={handleBackButton}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                </div>
            )}

            {isLoading && (
                <div className="graph-loading">
                    <FontAwesomeIcon icon={faSpinner} spin />
                </div>
            )}

            {props.contentMode !== ContentMode.Rankings && (
                <>
                    <section className="right-panel">
                        <GraphCaptions
                            captionDict={captionDict}
                            nodesOrderedByBetweenness={
                                nodesOrderedByBetweenness
                            }
                            nodesOrderedByDegree={nodesOrderedByDegree}
                            nodesOrderedByCloseness={nodesOrderedByCloseness}
                            setCurrentCaptionModeIndex={
                                setCurrentCaptionModeIndex
                            }
                            currentCaptionModeIndex={currentCaptionModeIndex}
                            captionModes={captionModes}
                            captionMode={captionMode}
                            colorByProp={COLOR_BY_PROP}
                        />
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
                                    'Área de Avaliação':
                                        selectedProgram.rating_area,
                                    'Número de Produções':
                                        selectedProgram.prod_count,
                                    [`Centralidade de Grau (${
                                        nodesOrderedByDegree!.findIndex(
                                            (n) => n.id === selectedProgram.id,
                                        ) + 1
                                    }º)`]: selectedProgram.degree_centrality,
                                    [`Centralidade de Intermediação (${
                                        nodesOrderedByBetweenness!.findIndex(
                                            (n) => n.id === selectedProgram.id,
                                        ) + 1
                                    }º)`]:
                                        selectedProgram.betweenness_centrality,
                                    [`Centralidade de Proximidade (${
                                        nodesOrderedByCloseness!.findIndex(
                                            (n) => n.id === selectedProgram.id,
                                        ) + 1
                                    }º)`]: selectedProgram.closeness_centrality,
                                }}
                                exploreNode={() => exploreNode(selectedProgram)}
                            />
                        )}
                    </section>

                    <YearRangeSlider
                        yearRange={yearRange}
                        setYearRange={setYearRange}
                    />

                    <DetailLevelSelector
                        density={connectionDensity}
                        setDensity={setConnectionDensity}
                    />
                </>
            )}

            {props.contentMode === ContentMode._3D && (
                <ForceGraph3D<Program, Link<Program>>
                    ref={fgRef}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50} // 50 is the height of the header
                    graphData={data}
                    nodeVal="prod_count"
                    nodeLabel="name"
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
                    linkWidth={(link) => link.collabs_count / 4}
                    backgroundColor="#1e272e"
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedProgram(undefined)}
                    enableNodeDrag={true}
                />
            )}
            {props.contentMode === ContentMode._2D && (
                <ForceGraph2D<Program, Link<Program>>
                    //@ts-ignore
                    ref={fgRef}
                    graphData={data}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50}
                    nodeRelSize={1}
                    nodeVal={(n) => n.prod_count * 16}
                    nodeLabel={() => ''}
                    linkColor={() => '#d2dae237'}
                    linkWidth={(link) => {
                        return link.collabs_count / 5;
                    }}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedProgram(undefined)}
                    enableNodeDrag={true}
                    backgroundColor="#1E272E"
                    nodeCanvasObjectMode={() => 'replace'}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const fontSize =
                            25 * (Math.sqrt(node.prod_count * 16) / 100);

                        // Begin path for the node
                        ctx.beginPath();

                        // Draw circle for the node
                        ctx.arc(
                            node.x!,
                            node.y!,
                            Math.sqrt(node.prod_count * 16),
                            0,
                            2 * Math.PI,
                            false,
                        );

                        // Fill node with transparent color
                        ctx.fillStyle = node.color?.startsWith('#')
                            ? hexToRgba(node.color, 0.9)
                            : convertRGBtoRGBA(node.color, 0.9);
                        ctx.fill();

                        // Draw border around the node
                        ctx.strokeStyle = 'white'; // Border color
                        ctx.lineWidth = fontSize / 25; // Border width
                        ctx.stroke(); // Draw border

                        const label = node.name;

                        ctx.font = `${fontSize}px Sans-Serif`;

                        // Draw the label
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'white';

                        ctx.fillText(label, node.x!, node.y!);

                        // Add a border around the label
                        ctx.strokeStyle = 'black'; // Border color
                        ctx.lineWidth = fontSize / 50; // Border width
                        ctx.strokeText(label, node.x!, node.y!);
                    }}
                />
            )}
            {props.contentMode === ContentMode.Rankings && (
                <div
                    className="ag-theme-alpine"
                    style={{ height: '94vh', width: '100%' }}
                >
                    <AgGridReact
                        rowData={data?.nodes ?? []}
                        columnDefs={tableModeColumns}
                        defaultColDef={defaultColDef}
                        localeText={AG_GRID_LOCALE_PT_BR}
                        onFilterChanged={(event) => {
                            event.api.refreshCells();
                        }}
                        onSortChanged={(event) => {
                            event.api.refreshCells();
                        }}
                    ></AgGridReact>
                </div>
            )}
        </section>
    );
});

export default Graph;
