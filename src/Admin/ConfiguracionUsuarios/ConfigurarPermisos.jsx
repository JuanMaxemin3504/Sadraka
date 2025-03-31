import React from 'react'
import NavBarUsuarios from "../NavBars/NavBarUsuarios";

function ConfigurarPermisos() {
  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarUsuarios />
      Permisos
    </div>
  )
}

export default ConfigurarPermisos
