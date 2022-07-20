import React from 'react'

function AuthorInfoOverlay({ author }) {
  return (
    <div className='author-info-overlay'>
      <h1>{author.name}</h1>
        <div className='details'>
          <div className='item'>
            <span className='key'>Universidade</span>
            <span className='value'>{author.university || '-'}</span>
          </div>
          <div className='item'>
            <span className='key'>Tipo</span>
            <span className='value'>{author.type || '-'}</span>
          </div>
          <div className='item'>
            <span className='key'>Programa IES</span>
            <span className='value'>{author.ies_program || '-'}</span>
          </div>
          <div className='item'>
            <span className='key'>Nome ABNT</span>
            <span className='value'>{author.abnt_name || '-'}</span>
          </div>
          <div className='item'>
            <span className='key'>Número de Produções</span>
            <span className='value'>{parseInt(author.prod_count) || '-'}</span>
          </div>
        </div>
    </div>
  )
}

export default AuthorInfoOverlay