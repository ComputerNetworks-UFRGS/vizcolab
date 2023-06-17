import React, { useState } from 'react';

function GraphCaptions({
    captionDict,
    nodesOrderedByBetweenness,
    nodesOrderedByDegree,
}) {
    const views = ['colorKey', 'betweenness', 'degree'];
    const [currentViewIndex, setCurrentViewIndex] = useState(0);

    if (!captionDict) return <div />;

    const decrementViewIndex = () =>
        setCurrentViewIndex(
            (currentViewIndex - 1 + views.length) % views.length,
        );
    const incrementViewIndex = () =>
        setCurrentViewIndex((currentViewIndex + 1) % views.length);

    let content;
    let header;
    switch (views[currentViewIndex]) {
        case 'colorKey':
            header = 'Legenda';
            content = Object.entries(captionDict)
                .slice(0, 10)
                .map(([type, color]) => (
                    <div key={type} className={`caption-item`}>
                        <div
                            className="color-circle"
                            style={{ backgroundColor: color }}
                        />
                        <span className="type-name">{type}</span>
                    </div>
                ));
            break;
        case 'betweenness':
            header = 'Ranking Intermediação';
            content = nodesOrderedByBetweenness
                .slice(0, 10)
                .map((node, index) => (
                    <div key={node.name} className="caption-item">
                        <span className="type-name">
                            <strong>{index + 1}</strong>.{' '}
                            {`${
                                node.name
                            }: ${node.betweenness_centrality.toFixed(2)}`}
                        </span>
                    </div>
                ));
            break;
        case 'degree':
            header = 'Ranking Grau';
            content = nodesOrderedByDegree.slice(0, 10).map((node, index) => (
                <div key={node.name} className="caption-item">
                    <span className="type-name">
                        <strong>{index + 1}</strong>.{' '}
                        {`${node.name}: ${node.degree_centrality.toFixed(2)}`}
                    </span>
                </div>
            ));
            break;
        default:
            break;
    }

    return (
        <div className="caption-overlay">
            <h1 className="caption-header">
                <div>{header}</div>
                <div>
                    <button onClick={decrementViewIndex}>&lt;</button>
                    <button onClick={incrementViewIndex}>&gt;</button>
                </div>
            </h1>

            <div className="items">{content}</div>
        </div>
    );
}

export default GraphCaptions;
