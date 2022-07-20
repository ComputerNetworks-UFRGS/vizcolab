import React from 'react'
import authorTypeColorMap from '../config/author_type_colors.json'

function AuthorTypeOverlay({ enabledTypes, setEnabledTypes }) {
  const toggleType = (type) => {
    setEnabledTypes(types => {
      return types.includes(type) ? types.filter(t => t !== type) : [...types, type]
    })
  }

  return (
    <div className='author-type-overlay'>
      <h1>Categorias</h1>
      <small>Clique em uma categoria para ocultá-la</small>
      
      {Object.entries(authorTypeColorMap).map(([type, color]) => (
        <div
          key={type}
          onClick={() => toggleType(type)}
          className={`type-option ${enabledTypes.includes(type) ? '' : ' disabled'}`}
        >
          <div className='color-circle' style={{backgroundColor: color}}/>
          <span className='type-name'>{type}</span>
        </div>
      ))}
    </div>
  )
}

export default AuthorTypeOverlay