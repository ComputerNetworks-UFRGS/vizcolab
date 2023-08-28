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
import VisibilityTooltipHeader from '../AgGridVisibilityTooltipHeader';
import DetailLevelSelector from '../DetailLevelSelector';
import GraphCaptions from '../GraphCaptionsPanel/GraphCaptions';
import NodeDetailsOverlay from '../NodeDetails/NodeDetailsOverlay';
import YearRangeSlider from '../YearRangeSlider';
import { University, getUniversitiesCollabs } from './data-fetching';

const COLOR_BY_PROP = 'region';

const Graph = forwardRef<GraphRef, PropsOfShareableGraph>((props, ref) => {
    const [currentCaptionModeIndex, setCurrentCaptionModeIndex] = useState(0);
    const [scaleMode, setScaleMode] = useState('log');
    const [data, setData] = useState<GraphData<University>>();
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [selectedUniversity, setSelectedUniversity] =
        useState<Node<University>>();
    const [isLoading, setIsLoading] = useState(true);
    const [captionDict, setCaptionDict] = useState<Record<string, string>>();
    const [connectionDensity, setConnectionDensity] = useState(() => {
        let fromLS: any = window.localStorage.getItem('connectionDensity');
        if (fromLS) {
            fromLS = Number(fromLS);
        }
        return props.sharedState?.state.connectionDensity ?? fromLS ?? 3;
    });
    const setConnectionDensityWithLS = (density: number) => {
        window.localStorage.setItem('connectionDensity', density.toString());
        setConnectionDensity(density);
    };
    const [yearRange, setYearRange] = useState(() => {
        let fromLS: any = window.localStorage.getItem('yearRange');
        if (fromLS) {
            fromLS = JSON.parse(fromLS);
        }
        return props.sharedState?.state.yearRange ?? fromLS ?? [2017, 2020];
    });
    const setYearRangeWithLS = (range: [number, number]) => {
        window.localStorage.setItem('yearRange', JSON.stringify(range));
        setYearRange(range);
    };
    const fgRef =
        useRef<ForceGraphMethods<Node<University>, Link<Node<University>>>>();
    useImperativeHandle(
        ref,
        () => ({
            getViewState: () => {
                if (!fgRef.current || !isSimulationOutput(data)) {
                    return;
                }

                const camera =
                    props.contentMode === ContentMode._3D
                        ? fgRef.current.camera()
                        : undefined;
                const linkDefinitions = data.links.map((l) => ({
                    ...l,
                    source: l.source.id,
                    target: l.target.id,
                }));
                const lookAt = new THREE.Vector3();
                if (camera) {
                    camera.getWorldDirection(lookAt);
                }
                return {
                    cameraPosition: camera ? camera.position : undefined,
                    lookAt: camera ? lookAt : undefined,
                    quaternion: camera ? camera.quaternion : undefined,
                    graphData: { ...data, links: linkDefinitions },
                    connectionDensity: connectionDensity,
                    graphLevel: GraphLevel.Universities,
                    contentMode: props.contentMode,
                    // @ts-ignore
                    zoom: camera ? undefined : fgRef.current?.zoom(),
                    // @ts-ignore
                    centerAt: camera ? undefined : fgRef.current?.centerAt(),
                    captionModeIndex: currentCaptionModeIndex,
                    yearRange: yearRange,
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
        [data, connectionDensity, currentCaptionModeIndex],
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
            if (captionMode === 'degree') {
                //@ts-ignore
                n.color = getNodeColor(n.degree_centrality, scaleMode);
            }
            if (captionMode === 'betweenness') {
                //@ts-ignore
                n.color = getNodeColor(n.betweenness_centrality, scaleMode);
            }
            if (captionMode === 'closeness') {
                //@ts-ignore
                n.color = getNodeColor(n.closeness_centrality, scaleMode);
            }
            if (captionMode === 'eigenvector') {
                //@ts-ignore
                n.color = getNodeColor(n.eigenvector_centrality, scaleMode);
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
    }, [captionMode, data, scaleMode]);

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
        if (
            props.sharedState &&
            window.location.pathname.split('/shared/')[1]
        ) {
            const {
                graphData,
                cameraPosition,
                lookAt,
                quaternion,
                contentMode,
                centerAt,
                zoom,
                captionModeIndex,
                yearRange,
            } = props.sharedState.state;
            setData(graphData);
            setCurrentCaptionModeIndex(captionModeIndex);
            setYearRangeWithLS(yearRange);
            if (contentMode === ContentMode._3D) {
                fgRef.current!.cameraPosition(cameraPosition, lookAt, 0);
                fgRef.current!.camera().rotation.setFromQuaternion(quaternion);
            }
            if (contentMode === ContentMode._2D) {
                // @ts-ignore
                fgRef.current!.centerAt(centerAt?.x, centerAt?.y, 0);
                // @ts-ignore
                fgRef.current!.zoom(zoom, 0);
            }
            setTimeout(() => {
                fgRef.current!.pauseAnimation();
            }, 250); // Stop the force simulation
            window.addEventListener('click', () => {
                fgRef.current!.resumeAnimation();
            }); // Resume the force simulation
            window.history.pushState({}, '', '/');
            setIsLoading(false);
            setTimeout(() => {
                setCaptionDict(getCaptionDict(graphData, COLOR_BY_PROP));
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

    const nodesOrderedByEigenvector = Array.from(data?.nodes ?? []).sort(
        (a, b) => {
            return b.eigenvector_centrality - a.eigenvector_centrality;
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
                return (params?.node?.rowIndex ?? 0) + 1;
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
        {
            headerName: 'Centralidade de Autovetor',
            field: 'eigenvector_centrality',
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
                            nodesOrderedByEigenvector={
                                nodesOrderedByEigenvector
                            }
                            setCurrentCaptionModeIndex={
                                setCurrentCaptionModeIndex
                            }
                            setScaleMode={setScaleMode}
                            scaleMode={scaleMode}
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
                                    [`Centralidade de Autovetor (${
                                        nodesOrderedByEigenvector!.findIndex(
                                            (n) =>
                                                selectedUniversity.name ===
                                                n.name,
                                        ) + 1
                                    }º)`]:
                                        selectedUniversity.eigenvector_centrality,
                                }}
                                exploreNode={() =>
                                    exploreNode(selectedUniversity)
                                }
                            />
                        )}
                    </section>

                    <YearRangeSlider
                        yearRange={yearRange}
                        setYearRange={setYearRangeWithLS}
                    />

                    <DetailLevelSelector
                        density={connectionDensity}
                        setDensity={setConnectionDensityWithLS}
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
                        const fontSize =
                            25 * (Math.sqrt(node.prod_count) / 100);
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

                        // Fill node with transparent
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
