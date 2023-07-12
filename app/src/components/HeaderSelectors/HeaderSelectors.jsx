import React, { useEffect } from 'react';
import { Combobox } from 'react-widgets';
import { GlobalContext } from '../../App';
import {
    getProgramAuthorsList,
    getUniversityNamesList,
    getUniversityProgramsList,
} from './data-fetching';

function HeaderSelectors() {
    const [universityNamesList, setUniversityNamesList] = React.useState([]);
    const [programNamesList, setProgramNamesList] = React.useState([]);
    const [authorNamesList, setAuthorNamesList] = React.useState([]);

    const { university, programs, setSharedState, graphRef, author } =
        React.useContext(GlobalContext);

    useEffect(() => {
        getUniversityNamesList().then((data) => {
            setUniversityNamesList(data);
        });
    }, []);

    useEffect(() => {
        if (university) {
            getUniversityProgramsList(university).then((data) => {
                setProgramNamesList(data);
            });
        }
    }, [university]);

    useEffect(() => {
        if (programs[0]) {
            getProgramAuthorsList(university, programs[0]).then((data) => {
                setAuthorNamesList(data);
            });
        }
    }, [university, programs]);

    return (
        <div className="program-selector">
            <div className="selector university">
                <span className="label">UNIVERSIDADE</span>
                <Combobox
                    placeholder="Selecione uma universidade"
                    busy={universityNamesList.length === 0}
                    value={university}
                    onChange={(universityName) => {
                        window.history.replaceState(
                            null,
                            `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                            '/',
                        );
                        setSharedState(undefined);
                        graphRef.current.focusUniversity(universityName);
                    }}
                    data={universityNamesList}
                    disabled={!!university}
                />
            </div>
            {university && (
                <div className="selector program">
                    <span className="label">PROGRAMAS</span>
                    <Combobox
                        placeholder="Selecione um programa"
                        busy={programNamesList.length === 0}
                        value={programs[0]}
                        onChange={(programName) => {
                            window.history.replaceState(
                                null,
                                `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                                '/',
                            );
                            setSharedState(undefined);
                            graphRef.current.focusProgram(programName);
                        }}
                        data={programNamesList}
                        disabled={!!programs[0]}
                    />
                </div>
            )}
            {programs[0] && (
                <div className="selector program">
                    <span className="label">AUTORES</span>
                    <Combobox
                        placeholder="Selecione um autor"
                        busy={authorNamesList.length === 0}
                        value={author?.name}
                        onChange={(authorName) => {
                            window.history.replaceState(
                                null,
                                `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                                '/',
                            );
                            setSharedState(null);
                            graphRef.current.focusAuthor(authorName);
                        }}
                        data={authorNamesList}
                        disabled={!!author}
                    />
                </div>
            )}
        </div>
    );
}

export default HeaderSelectors;
