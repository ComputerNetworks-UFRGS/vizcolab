import React from 'react'

function NodeDetailsOverlay({nodeType, title, detailsSchema}) {
  return (
    <div className='node-info-overlay'>
      <h1>{title}</h1>
      <small>{nodeType}</small>
      <div className='details'>
        {Object.keys(detailsSchema).map(key => (
          <div className='item' key={key}>
            <span className='key'>{key}</span>
            <span className='value'>{detailsSchema[key] || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NodeDetailsOverlay