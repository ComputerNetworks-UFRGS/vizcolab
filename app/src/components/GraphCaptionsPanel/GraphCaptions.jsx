import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import InfernoGradientBar from './InfernoGradientBar';

function GraphCaptions({
    captionDict,
    currentCaptionModeIndex,
    setCurrentCaptionModeIndex,
    captionModes,
    captionMode,
    colorByProp,
}) {
    if (!captionDict) return <div />;

    const decrementViewIndex = () =>
        setCurrentCaptionModeIndex(
            (currentCaptionModeIndex - 1 + captionModes.length) %
                captionModes.length,
        );
    const incrementViewIndex = () =>
        setCurrentCaptionModeIndex(
            (currentCaptionModeIndex + 1) % captionModes.length,
        );

    let content;
    let header;
    switch (captionMode) {
        case 'colorKey':
            header =
                colorByProp === 'region'
                    ? 'Regiões'
                    : colorByProp === 'wide_knowledge_area'
                    ? 'Área de conhecimento'
                    : 'Área de pesquisa';
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
            header = 'Intermediação';
            content = (
                <div className="gradient-bar">
                    <InfernoGradientBar />
                </div>
            );

            break;
        case 'degree':
            header = 'Grau';
            content = (
                <div className="gradient-bar">
                    <InfernoGradientBar />
                </div>
            );
            break;
        default:
            break;
    }

    return (
        <div className="caption-overlay">
            <h1 className="caption-header">
                <div>{header}</div>
                <div>
                    <FontAwesomeIcon
                        icon={faArrowLeft}
                        onClick={decrementViewIndex}
                        cursor={'pointer'}
                    />{' '}
                    <FontAwesomeIcon
                        icon={faArrowRight}
                        onClick={incrementViewIndex}
                        cursor={'pointer'}
                    />
                </div>
            </h1>

            <div
                className={
                    'items' +
                    (captionMode !== 'colorKey' ? ' items-scrollable' : '')
                }
            >
                {content}
            </div>
        </div>
    );
}

export default GraphCaptions;
