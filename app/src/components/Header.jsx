import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleNodes } from '@fortawesome/free-solid-svg-icons'
import ProgramSelector from './ProgramSelector'

function Header() {
  return (
    <section className='header'>
      <div className='right'>
        <div className='logo'>
          <FontAwesomeIcon icon={faCircleNodes} />
          <span><b>Viz</b>Colab</span>
        </div>
      </div>

      <div className='left'>
        <ProgramSelector />
      </div>
    </section>
  )
}

export default Header