import React, { useEffect } from 'react';
import { Combobox, Multiselect } from 'react-widgets';
import { GlobalContext } from '../App';
import {
    getUniversitiesList,
    getUniversityProgramsList,
} from '../helpers/neo4j_helper';

function ProgramSelector() {
    const [universitiesList, setUniversitiesList] = React.useState([]);
    const [programsList, setProgramsList] = React.useState([]);

    const { university, setUniversity, programs, setPrograms, setSharedState } =
        React.useContext(GlobalContext);

    useEffect(() => {
        getUniversitiesList().then((data) => {
            setUniversitiesList(data);
        });
    }, []);

    useEffect(() => {
        if (university) {
            getUniversityProgramsList(university).then((data) => {
                setProgramsList(data);
            });
        }
    }, [university, setPrograms]);

    return (
        <div className="program-selector">
            <div className="selector university">
                <span className="label">UNIVERSIDADE</span>
                <Combobox
                    placeholder="Selecione uma universidade"
                    busy={universitiesList.length === 0}
                    value={university}
                    onChange={(c) => {
                        window.history.replaceState(
                            null,
                            `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                            '/',
                        );
                        setSharedState(null);
                        setUniversity(c);
                    }}
                    data={universitiesList}
                />
            </div>
            {university && (
                <div className="selector program">
                    <span className="label">PROGRAMAS</span>
                    <Multiselect
                        placeholder="Selecione os programas"
                        busy={programsList.length === 0}
                        value={programs}
                        onChange={(c) => {
                            window.history.replaceState(
                                null,
                                `VizColab | Visualização de uma rede de colaboração acadêmica brasileira gerada a partir de dados da CAPES`,
                                '/',
                            );
                            setSharedState(null);
                            setPrograms(c);
                        }}
                        data={programsList}
                    />
                </div>
            )}
        </div>
    );
}

export default ProgramSelector;
