import React from 'react'

function AuthorInfoOverlay({ author, authorData, selectAuthor }) {
  const coAuthors = authorData && authorData.nodes
    .filter(node => node.id !== author.id)
    .sort((a, b) => b.prod_count - a.prod_count)
    .slice(0, 5)

  return (
    <div className='author-info-overlay'>
      <h1>{author.name}</h1>
      <small>AUTOR</small>
        <div className='details'>
          <h2>DETALHES</h2>
          <div className='item'>
            <span className='key'>Universidade</span>
            <span className='value'>{author.university || '-'}</span>
          </div>
          <div className='item'>
            <span className='key'>Programa IES</span>
            <span className='value'>{author.ies_program || '-'}</span>
          </div>
          <div className='item'>
            <span className='key'>Tipo</span>
            <span className='value'>{author.type || '-'}</span>
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
        {coAuthors && coAuthors.length > 0 &&
          <div className='connections'>
            <h2>PRINCIPAIS COLABORADORES</h2>
            { coAuthors.map(coAuthor => (
              <div className='line'>
                <div>
                  <div className='name' onClick={() => selectAuthor(coAuthor)}>{coAuthor.name}</div>
                  <div className='university'>{coAuthor.university}</div>
                </div>
                <div className='collabs'>{coAuthor.prod_count}</div>
              </div>
            ))}
          </div>
        }
    </div>
  )
}

export default AuthorInfoOverlay