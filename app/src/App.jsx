import './App.scss';
import React from 'react';
import AuthorGraph from './components/AuthorGraph';
import UniversityGraph from './components/UniversityGraph';
import ProgramGraph from './components/ProgramGraph';
import Header from './components/Header';

export const GlobalContext = React.createContext();

function App() {
  const [university, setUniversity] = React.useState(undefined);
  const [programs, setPrograms] = React.useState([]);
  const [author, setAuthor] = React.useState(undefined);

  const graphLevel = university ? programs.length > 0 ? 'authors' : 'programs' : 'universities';

  function Graph() {
    switch (graphLevel) {
      case 'authors':
        return <AuthorGraph/>
      case 'programs':
        return <ProgramGraph/>
      case 'universities':
      default:
        return <UniversityGraph/>
    }
  }

  return (
    <GlobalContext.Provider value={{university, setUniversity, programs, setPrograms, author, setAuthor}}>
      <div className="App">
        <Header/>
        <Graph/>
      </div>
    </GlobalContext.Provider>
  );
}

export default App;
