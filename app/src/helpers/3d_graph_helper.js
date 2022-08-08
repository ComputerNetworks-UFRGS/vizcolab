import { forceLink, forceManyBody, forceCenter } from 'd3-force-3d'

// Set camera distance from the center of the graph
export function setZoomLevel(forceGraph, distance) {
  forceGraph.cameraPosition(
    { x: distance, y: distance, z: distance }, // new position
    { x: 0, y: 0, z: 0 }, // lookAt ({ x, y, z })
    0 // ms transition duration
  )
}

export function setLinkForce(forceGraph, strength) {
  forceGraph.d3Force('link', forceLink().strength(strength));
}

export function setChargeForce(forceGraph, strength, distanceMax) {
  forceGraph.d3Force('charge',
    forceManyBody()
      .strength(strength)
      .distanceMin(0)
      .distanceMax(distanceMax || Infinity)
  );
}

export function setCenterForce(forceGraph, strength) { 
  forceGraph.d3Force('center', forceCenter().strength(strength));
}


// Calcula o raio de uma esfera com base no volume
export function sphereRadius(volume) {
  return Math.cbrt(3*volume/(4*Math.PI))
}