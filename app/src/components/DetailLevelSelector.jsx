import React from 'react'

const MIN_DETAIL_LEVEL = 1
const MAX_DETAIL_LEVEL = 7

function DetailLevelSelector({density, setDensity}) {
  const num_levels = MAX_DETAIL_LEVEL - MIN_DETAIL_LEVEL + 1

  return (
    <div className='detail-level-selector'>
      <span>DENSIDADE DE CONEXÕES</span>
      <div className='handles'>
        <div className="line"/>
        { [...Array(num_levels)].map((_, i) => (
          <div key={i}
            className={`handle${MIN_DETAIL_LEVEL + i === density ? ' selected' : ''}`}
            onClick={() => setDensity(i+1)}
          />
        ))}
      </div>
      <div className='labels'>
        { [...Array(num_levels)].map((_, i) => (
          <div className='label' key={i}>{MIN_DETAIL_LEVEL + i}</div>
        ))}
      </div>
    </div>
  )
}

export default DetailLevelSelector