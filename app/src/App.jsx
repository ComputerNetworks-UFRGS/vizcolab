import React from 'react';
import './App.scss';
import AuthorGraph from './components/AuthorGraph';
import Header from './components/Header';
import ProgramGraph from './components/ProgramGraph';
import UniversityGraph from './components/UniversityGraph';

export const GlobalContext = React.createContext();

function App() {
    const [university, setUniversity] = React.useState(undefined);
    const [programs, setPrograms] = React.useState([]);
    const [author, setAuthor] = React.useState(undefined);

    const graphLevel = university
        ? programs.length > 0
            ? 'authors'
            : 'programs'
        : 'universities';

    function Graph() {
        switch (graphLevel) {
            case 'authors':
                return <AuthorGraph />;
            case 'programs':
                return <ProgramGraph />;
            case 'universities':
            default:
                return <UniversityGraph />;
        }
    }

    return (
        <GlobalContext.Provider
            value={{
                university,
                setUniversity,
                programs,
                setPrograms,
                author,
                setAuthor,
            }}
        >
            <div className="App">
                <Header />
                <Graph />
            </div>
        </GlobalContext.Provider>
    );
}

export default App;
