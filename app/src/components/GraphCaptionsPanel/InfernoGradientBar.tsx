import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';

function formatLabel(value: number): string {
    if (value >= 0.1) return value.toFixed(1);

    const exponentialForm = value.toExponential(1);
    const [base, exponent] = exponentialForm.split('e');

    const superscripts = {
        '0': '⁰',
        '1': '¹',
        '2': '²',
        '3': '³',
        '4': '⁴',
        '5': '⁵',
        '6': '⁶',
        '7': '⁷',
        '8': '⁸',
        '9': '⁹',
        '-': '⁻',
    };

    const superscriptExponent = [...exponent]
        .map((char) => superscripts[char])
        .join('');

    return `10${superscriptExponent}`;
}

const InfernoGradientBar: React.FC = () => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target === containerRef.current) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const logScale = d3
        .scaleLog()
        .domain([0.001, 1])
        .range([0, containerWidth]);

    const labels = [0.001, 0.01, 0.1, 0.2, 0.5, 1].map((val) => {
        return {
            position: logScale(val),
            label: formatLabel(val),
        };
    });

    useEffect(() => {
        if (svgRef.current) {
            d3.select(svgRef.current).selectAll('*').remove();

            const svg = d3.select(svgRef.current);
            const defs = svg.append('defs');
            const linearGradient = defs
                .append('linearGradient')
                .attr('id', 'gradient');

            for (let i = 0; i <= 100; i++) {
                linearGradient
                    .append('stop')
                    .attr('offset', `${i}%`)
                    .attr('stop-color', d3.interpolateInferno(i / 100));
            }

            svg.append('rect')
                .attr('width', '100%')
                .attr('height', '25px')
                .style('fill', 'url(#gradient)');

            labels.forEach((label) => {
                const g = svg
                    .append('g')
                    .attr('transform', `translate(${label.position}, -15)`);

                g.append('line')
                    .attr('y1', '60%')
                    .attr('y2', '70%')
                    .attr('stroke', 'white');

                g.append('text')
                    .attr('y', '83%')
                    .attr('dy', '0.3em')
                    .attr(
                        'text-anchor',
                        label.position === 0
                            ? 'start'
                            : label.position === containerWidth
                            ? 'end'
                            : 'middle',
                    )
                    .attr('fill', 'white')
                    .text(label.label);
            });
        }
    }, [labels, containerWidth]);

    return (
        <div ref={containerRef}>
            <svg ref={svgRef} width="100%" height="75px" />
        </div>
    );
};

export default InfernoGradientBar;
