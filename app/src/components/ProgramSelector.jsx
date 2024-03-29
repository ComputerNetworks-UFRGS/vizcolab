import React from 'react'
import { useEffect } from 'react';
import { Combobox, Multiselect } from 'react-widgets';
import { getUniversitiesList, getUniversityProgramsList } from '../helpers/neo4j_helper';
import { GlobalContext } from '../App';

function ProgramSelector() {
  const [universitiesList, setUniversitiesList] = React.useState([]);
  const [programsList, setProgramsList] = React.useState([]);

  const { university, setUniversity, programs, setPrograms } = React.useContext(GlobalContext);

  useEffect(() => {
    getUniversitiesList().then(data => {
      setUniversitiesList(data);
    })
  }, []);

  useEffect(() => {
    if (university) {
      getUniversityProgramsList(university).then(data => {
        setProgramsList(data);
      })
    }
  }, [university, setPrograms]);

  return (
    <div className='program-selector'>
      <div className='selector university'>
          <span className='label'>UNIVERSIDADE</span>
          <Combobox
            placeholder='Selecione uma universidade'
            busy={universitiesList.length === 0}
            value={university}
            onChange={setUniversity}
            data={universitiesList}
          />
        </div>
        { university &&
          <div className='selector program'>
            <span className='label'>PROGRAMAS</span>
            <Multiselect
              placeholder='Selecione os programas'
              busy={programsList.length === 0}
              value={programs}
              onChange={setPrograms}
              data={programsList}
            />
          </div>
        }
    </div>
  )
}

export default ProgramSelector