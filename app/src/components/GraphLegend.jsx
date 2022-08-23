import React from 'react'

function GraphLegend({legendData}) {
  if (!legendData) return <div/>

  return (
    <div className='legend-overlay'>
      <h1>Legenda</h1>

      {Object.entries(legendData).map(([type, color]) => (
        <div key={type} className={`legend-item`}>
          <div className='color-circle' style={{backgroundColor: color}}/>
          <span className='type-name'>{type}</span>
        </div>
      ))}
    </div>
  )
}

export default GraphLegend