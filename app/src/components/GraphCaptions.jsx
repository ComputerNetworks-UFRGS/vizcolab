import React from 'react';

function GraphCaptions({ captionData: captionData }) {
    if (!captionData) return <div />;

    return (
        <div className="legend-overlay">
            <h1>Legenda</h1>

            <div className="items">
                {Object.entries(captionData)
                    .slice(0, 10)
                    .map(([type, color]) => (
                        <div key={type} className={`legend-item`}>
                            <div
                                className="color-circle"
                                style={{ backgroundColor: color }}
                            />
                            <span className="type-name">{type}</span>
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default GraphCaptions;
