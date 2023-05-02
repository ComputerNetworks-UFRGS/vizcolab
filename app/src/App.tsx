import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.scss';
import AuthorGraph from './components/AuthorGraph';
import Header from './components/Header';
import ProgramGraph from './components/ProgramGraph';
import UniversityGraph from './components/UniversityGraph';
import { Link, UniversityNode } from './helpers/neo4j_helper';

export type CameraPosition = {
    x: number;
    y: number;
    z: number;
};

export type GraphData = {
    nodes: UniversityNode[];
    links: Link[];
};

export enum GraphLevel {
    Universities = 'universities',
    Programs = 'programs',
    Authors = 'authors',
}

export type AppState = {
    graphLevel: GraphLevel;
    graphData: GraphData;
    cameraPosition: CameraPosition;
    connectionDensity: number;
};

export type SharedState = {
    id: number;
    state: AppState;
};

export const GlobalContext = React.createContext<Record<string, any>>({});

function App() {
    const [university, setUniversity] = React.useState(undefined);
    const [programs, setPrograms] = React.useState([]);
    const [author, setAuthor] = React.useState(undefined);

    const graphRef = useRef<{
        getViewState: () => AppState;
    } | null>(null);

    const saveState = useCallback(async () => {
        if (!graphRef.current) return;

        const data = graphRef.current.getViewState();
        const res = await fetch('http://localhost:3001/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return await res.json();
    }, [graphRef]);

    const sharedStateId = window.location.pathname.split('/shared/')[1];

    const [sharedState, setSharedState] = useState<SharedState | null>(null);

    useEffect(() => {
        if (sharedStateId) {
            const loadState = async () => {
                const res = await fetch(
                    `http://localhost:3001/state/${sharedStateId}`,
                );
                const sharedState = await res.json();
                setSharedState(sharedState);
            };
            loadState();
        }
    }, [sharedStateId]);

    const graphLevel = sharedState
        ? sharedState.state.graphLevel
        : university
        ? programs.length > 0
            ? GraphLevel.Authors
            : GraphLevel.Programs
        : GraphLevel.Universities;

    function GraphContent({
        level,
        sharedState,
    }: {
        level?: GraphLevel;
        sharedState?: SharedState | null;
    }) {
        return (
            <>
                {level === GraphLevel.Authors && (
                    <AuthorGraph ref={graphRef} sharedState={sharedState} />
                )}
                {level === GraphLevel.Programs && (
                    <ProgramGraph ref={graphRef} sharedState={sharedState} />
                )}
                {(level === GraphLevel.Universities || !level) && (
                    <UniversityGraph ref={graphRef} sharedState={sharedState} />
                )}
            </>
        );
    }

    function Graph() {
        return (
            <Routes>
                <Route path="/" element={<GraphContent level={graphLevel} />} />
                <Route
                    path="/shared/:id"
                    element={
                        <GraphContent
                            level={graphLevel}
                            sharedState={sharedState}
                        />
                    }
                />
            </Routes>
        );
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
            <BrowserRouter>
                <div className="App">
                    <Header onShare={saveState} />
                    <Graph />
                </div>
            </BrowserRouter>
        </GlobalContext.Provider>
    );
}

export default App;
