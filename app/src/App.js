import './App.css';
import ForceGraph3D from 'react-force-graph-3d'

function App() {
  return (
    <div className="App">
      {/* <header className="App-header">

      </header> */}
      <ForceGraph3D graphData={{
        "nodes": [ 
          { 
            "id": "id1",
            "name": "name1",
            "val": 1 
          },
          { 
            "id": "id2",
            "name": "name2",
            "val": 10 
          },
        ],
        "links": [
          {
            "source": "id1",
            "target": "id2"
          },
        ]
      }}/>
    </div>
  );
}

export default App;
