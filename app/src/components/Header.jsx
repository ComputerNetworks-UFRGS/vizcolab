import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleNodes } from '@fortawesome/free-solid-svg-icons'

function Header() {
  return (
    <section className='header'>
      <div className='logo'>
        <FontAwesomeIcon icon={faCircleNodes} />
        <span><b>Viz</b>Colab</span>
      </div>
    </section>
  )
}

export default Header