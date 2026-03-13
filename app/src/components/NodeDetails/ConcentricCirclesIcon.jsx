import React from 'react';

function ConcentricCirclesIcon({ size, ...rest }) {
    const viewBoxSize = 42;
    const center = viewBoxSize / 2;
    const radii = [15, 10, 5];

    const colors1 = ['red', 'green', 'blue'];
    const colors2 = ['yellow', 'purple', 'cyan'];
    const colors3 = ['orange', 'pink', 'lime'];

    const makeSlices = (colors, r) =>
        colors.map((color, i) => {
            const slicePercent = 1 / colors.length;
            const startAngle = 2 * Math.PI * slicePercent * i;
            const endAngle = 2 * Math.PI * slicePercent * (i + 1);
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
            const startX = center + r * Math.cos(startAngle);
            const startY = center + r * Math.sin(startAngle);
            const endX = center + r * Math.cos(endAngle);
            const endY = center + r * Math.sin(endAngle);
            return (
                <path
                    d={`M${center},${center} L${startX},${startY} A${r},${r} 0 ${largeArcFlag},1 ${endX},${endY} Z`}
                    fill={color}
                />
            );
        });

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            style={{ verticalAlign: '-17%' }}
            {...rest}
        >
            {makeSlices(colors1, radii[0])}
            {makeSlices(colors2, radii[1])}
            {makeSlices(colors3, radii[2])}
        </svg>
    );
}

export default ConcentricCirclesIcon;
