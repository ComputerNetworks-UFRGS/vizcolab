import './App.scss';
import React from 'react';
import Graph from './components/Graph';
import Header from './components/Header';

export const GlobalContext = React.createContext();

function App() {
  const [university, setUniversity] = React.useState('UFRGS');
  const [programs, setPrograms] = React.useState(['COMPUTAÇÃO']);

  return (
    <GlobalContext.Provider value={{university, setUniversity, programs, setPrograms}}>
      <div className="App">
        <Header></Header>
        <Graph/>
      </div>
    </GlobalContext.Provider>
  );
}

export default App;
