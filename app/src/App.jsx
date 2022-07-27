import './App.scss';
import Graph from './components/Graph';
import ProgramGraph from './components/ProgramGraph';
import Header from './components/Header';

function App() {
  return (
    <div className="App">
      <Header></Header>
      {/* <ProgramGraph/> */}
      <Graph/>
    </div>
  );
}

export default App;
