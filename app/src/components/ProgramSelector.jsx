import React from 'react'
import { useEffect } from 'react';
import { Combobox, Multiselect } from 'react-widgets';
import { getUniversities, getUniversityPrograms } from '../helpers/neo4j_helper';
import { GlobalContext } from '../App';

function ProgramSelector() {
  const [universitiesList, setUniversitiesList] = React.useState([]);
  const [programsList, setProgramsList] = React.useState([]);

  const { university, setUniversity, programs, setPrograms } = React.useContext(GlobalContext);

  useEffect(() => {
    getUniversities().then(data => {
      setUniversitiesList(data);
    })
  }, []);

  useEffect(() => {
    if (university) {
      getUniversityPrograms(university).then(data => {
        setProgramsList(data);
        setPrograms([data[0]]);
      })
    }
  }, [university]);

  return (
    <div className='program-selector'>
      <div className='selector ufrgs'>
          <span className='label'>UNIVERSIDADE</span>
          <Combobox
            busy={universitiesList.length === 0}
            value={university}
            onChange={setUniversity}
            data={universitiesList}
          />
        </div>
        <div className='selector program'>
          <span className='label'>PROGRAMAS</span>
          <Multiselect
            busy={programsList.length === 0}
            value={programs}
            onChange={setPrograms}
            data={programsList}
          />
        </div>
    </div>
  )
}

export default ProgramSelector