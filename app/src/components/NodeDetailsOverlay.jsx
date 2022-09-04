import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

function NodeDetailsOverlay({nodeType, title, detailsSchema, exploreNode, authorData, selectAuthor}) {
  const topCollaborators = (authorData && authorData.links
    .sort((a, b) => b.collabs_count - a.collabs_count)
    .slice(0, 5)
    .map(link => ({
        author: authorData.nodes.find(node => node.id === (link.target.id || link.target)),
        collabs_count: link.collabs_count
    }))) || []

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
      { exploreNode &&
        <div className='explore'>
          <div className="btn" onClick={exploreNode}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{marginRight: '.5rem'}}/>
            Explorar
          </div>
          <small>Use Ctrl + Clique para explorar um nó</small>
        </div>
      }
      { topCollaborators.length > 0 &&
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
      }
    </div>
  )
}

export default NodeDetailsOverlay