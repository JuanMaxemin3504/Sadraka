import React from 'react'
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros'


const CuentaMesas = () => {
  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMeseros/>
      <div>
        <h1>Cuentas mesas</h1>
      </div>
    </div>
  )
}

export default CuentaMesas
