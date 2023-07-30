// prettier-ignore
/* eslint-disable */
import React, { useEffect } from 'react';
import { Combobox } from 'react-widgets';
import { GlobalContext } from '../../App';
import {
    getAuthorCoauthorsList,
    getProgramAuthorsList,
    getUniversityNamesList,
    getUniversityProgramsList,
} from './data-fetching';

function HeaderSelectors({ cleared }) {
    const [universityNamesList, setUniversityNamesList] = React.useState([]);
    const [programNamesList, setProgramNamesList] = React.useState([]);
    const [authorNamesList, setAuthorNamesList] = React.useState([]);
    const [authorCoauthorNamesList, setAuthorCoauthorNamesList] =
        React.useState([]);

    const { university, programs, setSharedState, graphRef, author, coauthor } =
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

    useEffect(() => {
        if (author) {
            getAuthorCoauthorsList(author.id).then((data) => {
                setAuthorCoauthorNamesList(data);
            });
        }
    }, [author]);

    return (
        <div className="program-selector">
            <div className="selector university">
                <span className="label">UNIVERSIDADE</span>
                <Combobox
                    placeholder="Selecione uma universidade"
                    busy={universityNamesList.length === 0}
                    value={cleared ? '' : university}
                    onChange={(universityName) => {
                        window.history.replaceState(
                            null,
                            `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                            '/',
                        );
                        graphRef.current.focusUniversity(universityName);
                    }}
                    data={universityNamesList}
                    disabled={!!university || cleared}
                />
            </div>
            {university && (
                <div className="selector program">
                    <span className="label">PROGRAMAS</span>
                    <Combobox
                        placeholder="Selecione um programa"
                        busy={programNamesList.length === 0}
                        value={cleared ? '' : programs[0]}
                        onChange={(programName) => {
                            window.history.replaceState(
                                null,
                                `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                                '/',
                            );
                            graphRef.current.focusProgram(programName);
                        }}
                        data={programNamesList}
                        disabled={!!programs[0] || cleared}
                    />
                </div>
            )}
            {programs[0] && (
                <div className="selector program">
                    <span className="label">AUTORES</span>
                    <Combobox
                        placeholder="Selecione um autor"
                        busy={authorNamesList.length === 0}
                        value={cleared ? '' : author?.name}
                        onChange={(authorName) => {
                            window.history.replaceState(
                                null,
                                `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                                '/',
                            );
                            graphRef.current.focusAuthor(authorName);
                        }}
                        data={authorNamesList}
                        disabled={!!author || cleared}
                    />
                </div>
            )}
            {author && (
                <div className="selector program">
                    <span className="label">COAUTOR</span>
                    <Combobox
                        placeholder="Selecione um coautor"
                        busy={authorCoauthorNamesList.length === 0}
                        value={cleared ? '' : coauthor}
                        onChange={(collaboratorName) => {
                            window.history.replaceState(
                                null,
                                `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                                '/',
                            );
                            graphRef.current.focusCoauthor(collaboratorName);
                        }}
                        data={authorCoauthorNamesList}
                    />
                </div>
            )}
        </div>
    );
}

export default HeaderSelectors;
