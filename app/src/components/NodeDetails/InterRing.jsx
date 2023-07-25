import * as d3 from 'd3';
import { uniqBy } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { getInterRingData } from './data-fetching';

function InterRing({ author }) {
    const [data, setData] = useState(null);
    const d3Container = useRef(null);
    const tooltipRef = useRef(null);

    const coauthors = data
        ? uniqBy([].concat(...Object.values(data)), 'name')
        : null;

    useEffect(() => {
        if (data && d3Container.current) {
            const svg = d3.select(d3Container.current);
            svg.html('');
            const radius =
                Math.min(
                    svg.node().parentNode.clientWidth,
                    svg.node().parentNode.clientHeight,
                ) / 2;

            const legend = svg
                .append('g')
                .attr('transform', `translate(0, ${radius * 2 + 20})`);

            let legendIndex = 0;

            legend
                .selectAll('g')
                .data(coauthors)
                .enter()
                .append('g')
                .each(function (d, i) {
                    d3.select(this)
                        .append('rect')
                        .attr('x', 10)
                        .attr('y', legendIndex * 20)
                        .attr('width', 10)
                        .attr('height', 10)
                        .attr('fill', d.color);

                    d3.select(this)
                        .append('text')
                        .attr('x', 30)
                        .attr('y', legendIndex * 20 + 7)
                        .text(d.name)
                        .attr('alignment-baseline', 'middle')
                        .attr('fill', 'white');

                    legendIndex++;
                });

            Object.keys(data).forEach((year, i) => {
                console.log('year', year);
                const pie = d3.pie().value((d) => d.productions);
                const arc = d3
                    .arc()
                    .innerRadius((radius / 4) * i)
                    .outerRadius((radius / 4) * (i + 1));

                const g = svg
                    .append('g')
                    .attr('transform', `translate(${radius}, ${radius})`);

                g.selectAll('path')
                    .data(pie(data[year]))
                    .enter()
                    .append('path')
                    .attr('d', arc)
                    .attr('fill', (d, i) => {
                        return d.data.color;
                    })
                    .attr('stroke', '#fff') // Color of the border
                    .attr('stroke-width', '0.5') // Width of the border
                    .on('mouseover', function (event, d) {
                        tooltipRef.current.innerHTML = d.data.name;
                        tooltipRef.current.style.visibility = 'visible';
                    })
                    .on('mouseout', function (event, d) {
                        tooltipRef.current.style.visibility = 'hidden';
                    });

                // Add year label
                const textGroup = g.append('g');

                [-1, 0, 1].forEach((dx) => {
                    [-1, 0, 1].forEach((dy) => {
                        textGroup
                            .append('text')
                            .attr('x', -radius / 10 + dx)
                            .attr('y', (-radius / 8) * 2 * i - 14 + dy)
                            .text(year)
                            .attr('font-size', '15px')
                            .attr('fill', '#000');
                    });
                });

                textGroup
                    .append('text')
                    .attr('x', -radius / 10)
                    .attr('y', (-radius / 8) * 2 * i - 14)
                    .text(year)
                    .attr('font-size', '15px')
                    .attr('fill', '#fff');
            });
        }
    }, [data]);

    useEffect(() => {
        if (author) {
            getInterRingData(author.id).then((data) => {
                setData(data);
            });
        }
    }, [author]);

    return (
        <div>
            <div
                className="tooltip"
                ref={tooltipRef}
                style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    color: 'black',
                    backgroundColor: 'white',
                    borderRadius: '5px',
                    padding: '5px',
                    boxShadow: '0px 0px 10px rgba(0,0,0,0.5)',
                }}
            ></div>
            <svg
                className="d3-component"
                width={336}
                height={343 + coauthors?.length * 20}
                ref={d3Container}
            />
        </div>
    );
}

export default InterRing;
