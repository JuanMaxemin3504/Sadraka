import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login/LoginUsers';
import AdminPaginaAdmin from './Admin/AdminPaginaPrincipal';

{ /* Imports Meseros */}
import MeserosPaginaPrincipal from './Meseros/MeserosPaginaPrincipal';

{ /* Imports Cocina */}

{ /* Imports Mesa */}
import MesasPrincipal from './Mesas/MesasPrincipal';

{ /* Imports Inventario */}
import InventarioAdmin from './Admin/ConfiguracionInvetario/InvenarioAdmin';
import EdicionInventarioAdmin from './Admin/ConfiguracionInvetario/EdicionInventarioAdmin';
import AgregarInventarioAdmin from './Admin/ConfiguracionInvetario/AgregarInventarioAdmin';
import AgregarProductoInventarioAdmin from './Admin/ConfiguracionInvetario/AgregarProductoInventarioAdmin';

{ /* Imports Merma */}
import PrincipalMermaAdmin from './Admin/ConfiguracionInvetario/MermaAdmin/PrincipalMermaAdmin';
import ProcesosMermaAdmin from './Admin/ConfiguracionInvetario/MermaAdmin/ProcesosMermaAdmin';
import AgregarMermaAdmin from './Admin/ConfiguracionInvetario/MermaAdmin/AgregarMermaAdmin';

{ /* Import Usuarios Admin */}
import UsuariosAdmin from './Admin/ConfiguracionUsuarios/UsuariosAdmin';
import ConfigurarPermisos from './Admin/ConfiguracionUsuarios/ConfigurarPermisos';
import ConfiguracionCocinas from './Admin/ConfiguracionUsuarios/ConfiguracionCocinas';

{ /* Import Menu admin */}
import MenuAdmin from './Admin/ConfiguracionMenu/MenuAdmin';
import CreacionPlatilloMenu from './Admin/ConfiguracionMenu/CreacionPlatilloMenu';
import EdicionMenuAdmin from './Admin/ConfiguracionMenu/EdicionMenuAdmin';
import EdicionSeccionesAdmin from './Admin/ConfiguracionMenu/EdicionSeccionesAdmin';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminPaginaAdmin />} />
        <Route path="/mesero" element={<MeserosPaginaPrincipal />} />

        { /* Rutas Inventario */}
        <Route path="/inventario" element={<InventarioAdmin/>} />
        <Route path="/edicion_inventario/:id" element={<EdicionInventarioAdmin/>} />
        <Route path="/agregar_inventario/:id" element={<AgregarInventarioAdmin/>} />
        <Route path="/agregar_producto" element={<AgregarProductoInventarioAdmin/>} />

        { /* Rutas merma */}
        <Route path="/merma" element={<PrincipalMermaAdmin/>} />
        <Route path="/procesos_merma" element={<ProcesosMermaAdmin/>} />
        <Route path="/agregar_merma" element={<AgregarMermaAdmin/> } />

        { /* Rutas Usuarios */}
        <Route path="/usuarios" element={ <UsuariosAdmin/> } />    
        <Route path="/edicion_permisos/:id" element={ <ConfigurarPermisos/> } />    
        <Route path="/edicion_cocinas/:id" element={ <ConfiguracionCocinas/> } />    

        { /* Rutas Menu */}
        <Route path="/menu_admin" element={ <MenuAdmin/> } />    
        <Route path="/crear_platillo" element={ <CreacionPlatilloMenu/> } />
        <Route path="/edicion_platillo/:id" element={ <EdicionMenuAdmin/> } />
        <Route path="/edicion_secciones" element={ <EdicionSeccionesAdmin/> } />      

        { /* Rutas Cocina */}  
        
        { /* Rutas Mesas */}
        <Route path="/mesas_principal" element={ <MesasPrincipal/> } />      

        <Route path="/" element={<Navigate to="/login" />} />

      </Routes>
    </Router>
  </StrictMode>,
)
