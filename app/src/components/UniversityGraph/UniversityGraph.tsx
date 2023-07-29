import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
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
    captionModes,
} from '../../App';
import { AG_GRID_LOCALE_PT_BR } from '../../config/ag-grid-ptbr.locale.js';
import {
    GraphData,
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
import VisibilityTooltipHeader from '../AgGridVisibilityTooltipHeader';
import DetailLevelSelector from '../DetailLevelSelector';
import GraphCaptions from '../GraphCaptionsPanel/GraphCaptions';
import NodeDetailsOverlay from '../NodeDetails/NodeDetailsOverlay';
import YearRangeSlider from '../YearRangeSlider';
import { University, getUniversitiesCollabs } from './data-fetching';

const COLOR_BY_PROP = 'region';

const Graph = forwardRef<GraphRef, PropsOfShareableGraph>((props, ref) => {
    const [currentCaptionModeIndex, setCurrentCaptionModeIndex] = useState(0);
    const [data, setData] = useState<GraphData<University>>();
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [selectedUniversity, setSelectedUniversity] =
        useState<Node<University>>();
    const [isLoading, setIsLoading] = useState(true);
    const [captionDict, setCaptionDict] = useState<Record<string, string>>();
    const [connectionDensity, setConnectionDensity] = useState(
        props.sharedState?.state.connectionDensity ?? 3,
    );
    const [yearRange, setYearRange] = useState<[number, number]>(
        props.sharedState?.state.yearRange ?? [2017, 2020],
    );
    const isFirstLoad = useRef(true);
    const fgRef =
        useRef<ForceGraphMethods<Node<University>, Link<Node<University>>>>();
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
                    graphLevel: GraphLevel.Universities,
                };
            },
            focusUniversity: (universityName: string) => {
                if (!isSimulationOutput(data) || !fgRef.current) {
                    return;
                }
                const node = data?.nodes.find((n) => n.name === universityName);

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
                        node.name.length,
                        (nodeCandidate) => nodeCandidate.id === node.id,
                    );
                }
            },
        }),
        [data, connectionDensity],
    );

    const { setUniversity, setSharedState } = React.useContext(GlobalContext);

    useEffect(() => {
        window.addEventListener('resize', () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        });
    }, [data]);

    const captionMode = captionModes[currentCaptionModeIndex];
    useEffect(() => {
        if (!data) return;
        data.nodes.forEach((n) => {
            //@ts-ignore
            delete n.color;
        });
        if (
            captionMode === 'degree' ||
            captionMode === 'betweenness' ||
            captionMode === 'closeness'
        ) {
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
            });
        } else {
            setTimeout(
                () => setCaptionDict(getCaptionDict(data, COLOR_BY_PROP)),
                300,
            );
        }
    }, [captionMode, data]);

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
        if (props.sharedState && isFirstLoad.current) {
            const { graphData, cameraPosition } = props.sharedState.state;
            setData(graphData);
            fgRef.current!.cameraPosition(cameraPosition);
            isFirstLoad.current = false;
            setIsLoading(false);
            setTimeout(() => {
                return setCaptionDict(getCaptionDict(graphData, COLOR_BY_PROP));
            }, 300);
        } else {
            getUniversitiesCollabs(connectionDensity, yearRange).then(
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
    }, [connectionDensity, props.sharedState, yearRange]);

    const exploreNode = (node: Node<University>) => {
        window.history.replaceState(
            null,
            `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a
            partir de dados da CAPES`,
            '/',
        );
        setSharedState(undefined);
        return setUniversity(node.name);
    };

    const handleNodeClick = (node, event) => {
        event.ctrlKey ? exploreNode(node) : setSelectedUniversity(node);
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

    const tableModeColumns: ColDef<Node<University>>[] = [
        {
            headerName: '#',
            width: 77,
            valueGetter: (params) => {
                return params?.node?.rowIndex ?? 0 + 1;
            },
            sortable: false,
            filter: false,
            suppressMenu: true,
            suppressMovable: true,
            headerComponent: VisibilityTooltipHeader,
        },
        {
            headerName: 'Universidade',
            field: 'full_name',
            flex: 2,
        },
        {
            headerName: 'UF',
            field: 'uf',
            width: 90,
        },
        {
            headerName: 'Cidade',
            field: 'city',
            flex: 0.7,
        },
        {
            headerName: 'Região',
            field: 'region',
            flex: 0.5,
        },
        {
            headerName: 'Produções',
            field: 'prod_count',
            flex: 0.5,
        },
        {
            headerName: 'Centralidade de Intermediação',
            field: 'betweenness_centrality',
            flex: 1,
        },
        {
            headerName: 'Centralidade de Grau',
            field: 'degree_centrality',
            flex: 1,
        },
        {
            headerName: 'Centralidade de Proximidade',
            field: 'closeness_centrality',
            flex: 1,
        },
    ];

    return (
        <section className="graph">
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
                                    [`Centralidade de Grau (${
                                        nodesOrderedByDegree!.findIndex(
                                            (n) =>
                                                selectedUniversity.name ===
                                                n.name,
                                        ) + 1
                                    }º)`]: selectedUniversity.degree_centrality,
                                    [`Centralidade de Intermediação (${
                                        nodesOrderedByBetweenness!.findIndex(
                                            (n) =>
                                                selectedUniversity.name ===
                                                n.name,
                                        ) + 1
                                    }º)`]:
                                        selectedUniversity.betweenness_centrality,
                                    [`Centralidade de Proximidade (${
                                        nodesOrderedByCloseness!.findIndex(
                                            (n) =>
                                                selectedUniversity.name ===
                                                n.name,
                                        ) + 1
                                    }º)`]:
                                        selectedUniversity.closeness_centrality,
                                }}
                                exploreNode={() =>
                                    exploreNode(selectedUniversity)
                                }
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
                <ForceGraph3D<University, Link<University>>
                    ref={fgRef}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50} // 50 is the height of the header
                    graphData={data}
                    nodeVal="prod_count"
                    nodeLabel="name"
                    nodeAutoColorBy={
                        captionMode === 'colorKey' ? COLOR_BY_PROP : null
                    }
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
            )}
            {props.contentMode === ContentMode._2D && (
                <ForceGraph2D<University, Link<University>>
                    //@ts-ignore
                    ref={fgRef}
                    graphData={data}
                    width={windowDimensions.width}
                    height={windowDimensions.height - 50}
                    nodeRelSize={1}
                    nodeVal={(n) => {
                        return n.prod_count;
                    }}
                    nodeLabel={() => ''}
                    nodeAutoColorBy={
                        captionMode === 'colorKey' ? COLOR_BY_PROP : null
                    }
                    linkColor={() => '#d2dae237'}
                    linkWidth={(link) => {
                        return link.collabs_count / 400 + 0.5;
                    }}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedUniversity(undefined)}
                    enableNodeDrag={true}
                    backgroundColor="#1E272E"
                    nodeCanvasObjectMode={() => 'replace'}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        // Begin path for the node
                        ctx.beginPath();

                        // Draw circle for the node
                        ctx.arc(
                            node.x!,
                            node.y!,
                            Math.sqrt(node.prod_count),
                            0,
                            2 * Math.PI,
                            false,
                        );

                        // Fill node with transparent color
                        ctx.fillStyle = node.color
                            ? hexToRgba(node.color, 0.9)
                            : node.color;
                        ctx.fill();

                        // Draw border around the node
                        ctx.strokeStyle = 'black'; // Border color
                        ctx.lineWidth = 3; // Border width
                        ctx.stroke(); // Draw border

                        const label = node.name;
                        const fontSize =
                            25 * (Math.sqrt(node.prod_count) / 100);
                        ctx.font = `${fontSize}px Sans-Serif`;

                        // Draw the label
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'white';

                        ctx.fillText(label, node.x!, node.y!);

                        // Add a border around the label
                        ctx.strokeStyle = 'black'; // Border color
                        ctx.lineWidth = node.prod_count > 30_000 ? 3 : 1; // Border width
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
