import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { getInterRingData } from './data-fetching';
import { shuffle } from 'lodash';

const colorScheme = d3.schemeSet1
    .concat(d3.schemePaired)
    .concat(d3.schemeDark2)
    .concat(d3.schemeCategory10);

const shuffledColors = shuffle(colorScheme);
function getColors(n) {
    const colors = Array(n)
        .fill()
        .map((_, i) => shuffledColors[i % shuffledColors.length]);
    return d3.scaleOrdinal(colors);
}

function InterRing({ author }) {
    const [data, setData] = useState(null);
    const d3Container = useRef(null);
    const tooltipRef = useRef(null);

    useEffect(() => {
        if (data && d3Container.current) {
            const svg = d3.select(d3Container.current);
            const radius =
                Math.min(
                    svg.node().parentNode.clientWidth,
                    svg.node().parentNode.clientHeight,
                ) / 2;

            const legend = svg
                .append('g')
                .attr('transform', `translate(0, ${radius * 2 + 20})`);

            let legendIndex = 0;

            Object.keys(data).forEach((year, i) => {
                console.log('year', year);
                const colors = getColors(data[year].length);

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
                    .attr('fill', (d, i) => colors(i))
                    .on('mouseover', function (event, d) {
                        console.log('asdasdasdsadads', d.data.name);
                        tooltipRef.current.innerHTML = d.data.name;
                        tooltipRef.current.style.visibility = 'visible';
                    })
                    .on('mousemove', function (event, d) {
                        console.log(event.pageX, event.pageY);
                        // tooltipRef.current.style.top = event.pageY + 'px';
                        // tooltipRef.current.style.left = event.pageX + 'px';
                    })
                    .on('mouseout', function (event, d) {
                        tooltipRef.current.style.visibility = 'hidden';
                    });

                legend
                    .selectAll('g')
                    .data(data[year])
                    .enter()
                    .append('g')
                    .each(function (d, i) {
                        d3.select(this)
                            .append('rect')
                            .attr('x', 10)
                            .attr('y', legendIndex * 20)
                            .attr('width', 10)
                            .attr('height', 10)
                            .attr('fill', colors(i));

                        d3.select(this)
                            .append('text')
                            .attr('x', 30)
                            .attr('y', legendIndex * 20 + 10)
                            .text(d.name)
                            .attr('alignment-baseline', 'middle')
                            .attr('fill', 'white');
                        legendIndex++;
                    });
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
                width={1000}
                height={1200}
                ref={d3Container}
            />
        </div>
    );
}

export default InterRing;
