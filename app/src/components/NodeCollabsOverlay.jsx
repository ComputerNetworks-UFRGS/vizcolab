import React from 'react'


function NodeCollabsOverlay({ authorData, selectAuthor }) {
  const topCollaborators = (authorData && authorData.links
    .sort((a, b) => b.collabs_count - a.collabs_count)
    .slice(0, 5)
    .map(link => ({
        author: authorData.nodes.find(node => node.id === (link.target.id || link.target)),
        collabs_count: link.collabs_count
    }))) || []

  return (
    <div className='node-info-overlay'>
        <div className='connections'>
          <h2>PRINCIPAIS COLABORADORES</h2>
          { topCollaborators.length > 0 &&
            topCollaborators.map(({author, collabs_count}) => (
              author && 
              <div className='line' key={author.id}>
                <div>
                  <div className='name' onClick={() => selectAuthor(author)}>{author.name}</div>
                  <div className='university'>{author.university}</div>
                </div>
                <div className='collabs_count'>{collabs_count}</div>
              </div>
            ))
          }
        </div>
    </div>
  )
}

export default NodeCollabsOverlay