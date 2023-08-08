import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
import React, {
    forwardRef,
    useCallback,
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
import GraphCaptions from '../GraphCaptionsPanel/GraphCaptions.jsx';
import NodeDetailsOverlay from '../NodeDetails/NodeDetailsOverlay';
import YearRangeSlider from '../YearRangeSlider';
import { Author, getAuthorData, getAuthorsCollabs } from './data-fetching';

const COLOR_BY_PROP = 'research_line';

const Graph = forwardRef<GraphRef, PropsOfShareableGraph>((props, ref) => {
    const [currentCaptionModeIndex, setCurrentCaptionModeIndex] = useState(0);
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
        setCoauthor,
    } = React.useContext(GlobalContext);

    useImperativeHandle(
        ref,
        () => ({
            getViewState: () => {
                if (!fgRef.current || !data) {
                    return;
                }
                const camera =
                    props.contentMode === ContentMode._3D
                        ? fgRef.current.camera()
                        : undefined;
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
                const lookAt = new THREE.Vector3();
                if (camera) {
                    camera.getWorldDirection(lookAt);
                }
                return {
                    cameraPosition: camera ? camera.position : undefined,
                    lookAt: camera ? lookAt : undefined,
                    quaternion: camera ? camera.quaternion : undefined,
                    // @ts-ignore
                    zoom: camera ? undefined : fgRef.current?.zoom(),
                    // @ts-ignore
                    centerAt: camera ? undefined : fgRef.current?.centerAt(),
                    graphData,
                    connectionDensity: connectionDensity,
                    graphLevel: GraphLevel.Authors,
                    author,
                    programs,
                    university,
                    contentMode: props.contentMode,
                    captionModeIndex: currentCaptionModeIndex,
                    yearRange: yearRange,
                };
            },
            focusAuthor: (authorName: string) => {
                if (!isSimulationOutput(data) || !fgRef.current) {
                    return;
                }
                const node = data?.nodes.find((n) => n.name === authorName);

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
            focusCoauthor: (coauthorName: string) => {
                if (!isSimulationOutput(authorData) || !fgRef.current) {
                    return;
                }
                const node = authorData?.nodes.find(
                    (n) => n.name === coauthorName,
                );

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
        [
            data,
            connectionDensity,
            author,
            university,
            programs,
            authorData,
            currentCaptionModeIndex,
            yearRange,
            props.contentMode,
        ],
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
            setChargeForce(fgRef.current, -500, 600);
            setCenterForce(fgRef.current, 1);
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
                connectionDensity,
                contentMode,
                centerAt,
                zoom,
                captionModeIndex,
                yearRange,
            } = props.sharedState.state;
            setData(graphData);
            setCurrentCaptionModeIndex(captionModeIndex);
            setYearRange(yearRange);
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
            setConnectionDensity(connectionDensity);
            window.history.pushState({}, '', '/');
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
            if (props.contentMode !== ContentMode.Rankings) {
                setLinkForce(fgRef.current, 0.02);
            }
        } else {
            setAuthorData(undefined);

            // Reset camera
            if (props.contentMode === ContentMode._3D) {
                setZoomLevel(fgRef.current, 1000);
            }
            if (props.contentMode !== ContentMode.Rankings) {
                setLinkForce(fgRef.current, 0.2);
            }
        }
    }, [author, yearRange, props.contentMode]);

    const [captionDict, setCaptionDict] = useState<Record<string, string>>();
    const captionMode = captionModes[currentCaptionModeIndex];
    useEffect(() => {
        const dataToProcess = authorData || data;
        if (!dataToProcess) return;

        dataToProcess.nodes.forEach((n) => {
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
            if (captionMode === 'eigenvector') {
                //@ts-ignore
                n.color = getNodeColor(n.eigenvector_centrality);
            }
            if (captionMode === 'colorKey') {
                //@ts-ignore
                n.color = getNodeColor(n[COLOR_BY_PROP]);
            }
        });
        setCaptionDict(getCaptionDict(dataToProcess, COLOR_BY_PROP));
    }, [captionMode, data, authorData]);

    useEffect(() => {
        const dataToProcess = authorData || data;
        if (!dataToProcess) return;
        setTimeout(
            () => setCaptionDict(getCaptionDict(dataToProcess, COLOR_BY_PROP)),
            300,
        );
    }, [data, authorData]);

    const nodeCanvasObject = useCallback((node, ctx) => {
        const fontSize = 25 * (Math.sqrt(node.prod_count * 16) / 100);

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
    }, []);

    const handleBackButton = () => {
        if (author) {
            setAuthor(null);
            setSelectedAuthor(null);
            setCoauthor(undefined);
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
            headerName: 'Autor',
            field: 'name',
            flex: 2,
        },
        {
            headerName: 'Universidade',
            field: 'university',
            flex: 1,
        },
        {
            headerName: 'Programa',
            field: 'ies_program',
            flex: 1.5,
        },
        {
            headerName: 'Área',
            field: 'knowledge_area',
            flex: 1.5,
        },
        {
            headerName: 'Linha de pesquisa',
            field: 'research_line',
            flex: 1.5,
        },
        {
            headerName: 'Tipo',
            field: 'type',
            flex: 1,
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
                    <div className="back-button" onClick={handleBackButton}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </div>

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
                            currentCaptionModeIndex={currentCaptionModeIndex}
                            captionModes={captionModes}
                            captionMode={captionMode}
                            colorByProp={COLOR_BY_PROP}
                        />
                        {selectedAuthor && (
                            <NodeDetailsOverlay
                                nodeType="AUTOR"
                                title={selectedAuthor.name}
                                selectedAuthor={selectedAuthor}
                                detailsSchema={{
                                    Universidade: selectedAuthor.university,
                                    'Programa IES': selectedAuthor.ies_program,
                                    'Linha de Pesquisa':
                                        selectedAuthor.research_line,
                                    Tipo: selectedAuthor.type,
                                    'Nome ABNT': selectedAuthor.abnt_name,
                                    'Número de Produções':
                                        selectedAuthor.prod_count,
                                    [`Centralidade de Grau (${
                                        nodesOrderedByDegree!.findIndex(
                                            (n) => n.id === selectedAuthor.id,
                                        ) + 1
                                    }º)`]: selectedAuthor.degree_centrality,
                                    [`Centralidade de Intermediação (${
                                        nodesOrderedByBetweenness!.findIndex(
                                            (n) => n.id === selectedAuthor.id,
                                        ) + 1
                                    }º)`]:
                                        selectedAuthor.betweenness_centrality,
                                    [`Centralidade de Proximidade (${
                                        nodesOrderedByCloseness!.findIndex(
                                            (n) => n.id === selectedAuthor.id,
                                        ) + 1
                                    }º)`]: selectedAuthor.closeness_centrality,
                                    [`Centralidade de Autovetor (${
                                        nodesOrderedByEigenvector!.findIndex(
                                            (n) => n.id === selectedAuthor.id,
                                        ) + 1
                                    }º)`]:
                                        selectedAuthor.eigenvector_centrality,
                                }}
                                exploreNode={
                                    !authorData ||
                                    author.id !== selectedAuthor.id
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
                </>
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
                    nodeRelSize={1}
                    nodeVal={(n) => n.prod_count * 16}
                    nodeLabel={() => ''}
                    nodeCanvasObjectMode={() => 'replace'}
                    linkColor={() => '#d2dae237'}
                    linkWidth={(link) => {
                        return link.collabs_count / 2.5;
                    }}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedAuthor(undefined)}
                    enableNodeDrag={true}
                    backgroundColor="#1E272E"
                    nodeCanvasObject={nodeCanvasObject}
                />
            )}
            {props.contentMode === ContentMode.Rankings && (
                <div
                    className="ag-theme-alpine"
                    style={{ height: '94vh', width: '100%' }}
                >
                    <AgGridReact
                        rowData={authorData?.nodes ?? data?.nodes ?? []}
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
