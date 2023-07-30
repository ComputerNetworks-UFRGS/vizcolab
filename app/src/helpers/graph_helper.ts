import { MD5 } from 'crypto-js';
import * as d3 from 'd3';
import { forceCenter, forceLink, forceManyBody } from 'd3-force-3d';
import { scaleOrdinal } from 'd3-scale';
import { schemePaired } from 'd3-scale-chromatic';
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

const autoColorScale = scaleOrdinal(schemePaired);
export function getNodeColor(prop: number | string) {
    if (typeof prop === 'string' || prop === undefined) {
        return autoColorScale(prop ?? 'region');
    }
    const logScale = d3.scaleLog().domain([1, 0.001]).range([0, 1]);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn);

    return colorScale(logScale(prop + 0.001));
}

export function hexToRgba(hex: string, alpha: number) {
    const [r, g, b] = hex.match(/\w\w/g)!.map((x) => parseInt(x, 16));
    return `rgba(${r},${g},${b},${alpha})`;
}

export function convertRGBtoRGBA(rgbString: string, opacity: number) {
    if (!rgbString) return rgbString;
    // Extract the red, green, and blue values from the RGB string
    const matches = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)!;

    // Create a new RGBA string with the specified opacity
    const rgbaString = `rgba(${matches[1]}, ${matches[2]}, ${matches[3]}, ${opacity})`;

    return rgbaString;
}

function md5(data: string) {
    return MD5(data).toString();
}
export function getColorFromString(str: string) {
    return `#${md5(str).substring(0, 3)}`;
}
