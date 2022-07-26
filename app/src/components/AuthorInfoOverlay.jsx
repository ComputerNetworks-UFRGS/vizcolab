import React from 'react'

function AuthorInfoOverlay({ author, authorData, selectAuthor }) {
  const topCollaborators = (authorData && authorData.links
    .sort((a, b) => b.collabs - a.collabs)
    .slice(0, 5)
    .map(link => ({
        author: authorData.nodes.find(node => node.id === (link.target.id || link.target)),
        collabs: link.collabs
    }))) || []

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
        <div className='connections'>
          <h2>PRINCIPAIS COLABORADORES</h2>
          { topCollaborators.length > 0 &&
            topCollaborators.map(({author, collabs}) => (
              author && 
              <div className='line' key={author.id}>
                <div>
                  <div className='name' onClick={() => selectAuthor(author)}>{author.name}</div>
                  <div className='university'>{author.university}</div>
                </div>
                <div className='collabs'>{collabs}</div>
              </div>
            ))}
        </div>
    </div>
  )
}

export default AuthorInfoOverlay