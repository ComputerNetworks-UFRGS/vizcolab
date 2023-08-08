import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.scss';
import AuthorGraph from './components/AuthorGraph/AuthorGraph';
import { Author } from './components/AuthorGraph/data-fetching';
import Header from './components/Header';
import ProgramGraph from './components/ProgramGraph/ProgramGraph';
import UniversityGraph from './components/UniversityGraph/UniversityGraph';
import { CameraPosition, GraphData } from './helpers/graph_helper';
import { Node } from './helpers/neo4j_helper';

export type SimulationNode = {
    id: string;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    color: string;
};

export enum GraphLevel {
    Universities = 'universities',
    Programs = 'programs',
    Authors = 'authors',
}

export type AppState = {
    graphLevel: GraphLevel;
    graphData: GraphData<any>;
    cameraPosition: CameraPosition;
    lookAt: any;
    quaternion: any;
    zoom: number | undefined;
    centerAt: { x: number; y: number } | undefined;
    connectionDensity: number;
    yearRange: [number, number];
    university?: string;
    programs?: string[];
    author?: string | Node<Author>;
    contentMode: ContentMode;
    captionModeIndex: number;
};

export type SharedState = {
    id: number;
    state: AppState;
};

export type GraphRef = {
    getViewState: () => AppState | undefined;
};

export type PropsOfShareableGraph = {
    sharedState?: SharedState;
    contentMode: ContentMode;
};

export const GlobalContext = React.createContext<Record<string, any>>({});

export enum ContentMode {
    _3D = '3D',
    _2D = '2D',
    Rankings = 'Rankings',
}

export const captionModes = [
    'colorKey',
    'betweenness',
    'degree',
    'closeness',
    'eigenvector',
] as const;
export type CaptionMode = (typeof captionModes)[number];

export const NUMBER_OF_CENTRALITY_CLASSES = 10;

function App() {
    const [university, setUniversity] = React.useState<string>();
    const [programs, setPrograms] = React.useState<string[]>([]);
    const [author, setAuthor] = React.useState(undefined);
    const [coauthor, setCoauthor] = React.useState(undefined);
    const [isLoading, setIsLoading] = React.useState(true);
    const [contentMode, setContentMode] = useState<ContentMode>(
        ContentMode._3D,
    );

    const graphRef = useRef<GraphRef>(null);

    const saveState = useCallback(async () => {
        if (!graphRef.current) return;

        const data = graphRef.current.getViewState();
        if (!data) return;
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

    const [sharedState, setSharedState] = useState<SharedState>();

    useEffect(() => {
        if (sharedStateId) {
            const loadState = async () => {
                const res = await fetch(
                    `http://localhost:3001/state/${sharedStateId}`,
                );
                const sharedState = await res.json();
                setContentMode(sharedState.state.contentMode);
                setSharedState(sharedState);
                if (sharedState.state.university) {
                    setUniversity(sharedState.state.university);
                }
                if (sharedState.state.programs) {
                    setPrograms(sharedState.state.programs);
                }
                if (sharedState.state.author) {
                    setAuthor(sharedState.state.author);
                }
                setIsLoading(false);
            };
            loadState();
        } else {
            setIsLoading(false);
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
        sharedState?: SharedState;
    }) {
        if (isLoading) return <div>Loading...</div>;
        return (
            <>
                {level === GraphLevel.Authors && (
                    <AuthorGraph
                        ref={graphRef}
                        sharedState={sharedState}
                        contentMode={contentMode}
                    />
                )}
                {level === GraphLevel.Programs && (
                    <ProgramGraph
                        ref={graphRef}
                        sharedState={sharedState}
                        contentMode={contentMode}
                    />
                )}
                {(level === GraphLevel.Universities || !level) && (
                    <UniversityGraph
                        ref={graphRef}
                        sharedState={sharedState}
                        contentMode={contentMode}
                    />
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
                setSharedState,
                graphRef,
                coauthor,
                setCoauthor,
            }}
        >
            <BrowserRouter>
                <div className="App">
                    <Header
                        onShare={saveState}
                        setContentMode={setContentMode}
                    />
                    <Graph />
                </div>
            </BrowserRouter>
        </GlobalContext.Provider>
    );
}

export default App;
