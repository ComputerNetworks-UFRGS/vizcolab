import * as d3 from 'd3';
import { forceCenter, forceLink, forceManyBody } from 'd3-force-3d';
import { Link, Node, SimulationOutputNode } from './neo4j_helper';

export type CameraPosition = {
    x: number;
    y: number;
    z: number;
};

export type GraphData<T> = {
    nodes: Node<T>[];
    links: Link<T>[];
};

// Set camera distance from the center of the graph
export function setZoomLevel(forceGraph, distance) {
    forceGraph.cameraPosition(
        { x: distance, y: distance, z: distance }, // new position
        { x: 0, y: 0, z: 0 }, // lookAt ({ x, y, z })
        0, // ms transition duration
    );
}

export function setLinkForce(forceGraph, strength) {
    forceGraph.d3Force('link', forceLink().strength(strength));
}

export function setChargeForce(forceGraph, strength, distanceMax?) {
    forceGraph.d3Force(
        'charge',
        forceManyBody()
            .strength(strength)
            .distanceMin(0)
            .distanceMax(distanceMax || Infinity),
    );
}

export function setCenterForce(forceGraph, strength) {
    forceGraph.d3Force('center', forceCenter().strength(strength));
}

// Calcula o raio de uma esfera com base no volume
export function sphereRadius(volume) {
    return Math.cbrt((3 * volume) / (4 * Math.PI));
}

export function getCaptionDict(
    data: { nodes: SimulationOutputNode<any>[] },
    colorBy: string,
) {
    const captionDict = {};
    for (let node of data.nodes) {
        captionDict[node[colorBy] || 'NÃO INFORMADO'] = node.color;
    }
    return captionDict;
}

export function getNodeColor(centrality: number) {
    const logScale = d3.scaleLog().domain([1, 0.001]).range([0, 1]);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn);

    return colorScale(logScale(centrality + 0.001));
}
