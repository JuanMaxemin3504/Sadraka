import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login/LoginUsers';
import AdminPaginaAdmin from './Admin/AdminPaginaPrincipal';
import MeserosPaginaPrincipal from './Meseros/MeserosPaginaPrincipal';

{ /* Imports Inventario y merma */}
import InventarioAdmin from './Admin/ConfiguracionInvetario/InvenarioAdmin';
import EdicionInventarioAdmin from './Admin/ConfiguracionInvetario/EdicionInventarioAdmin';
import AgregarInventarioAdmin from './Admin/ConfiguracionInvetario/AgregarInventarioAdmin';
import AgregarProductoInventarioAdmin from './Admin/ConfiguracionInvetario/AgregarProductoInventarioAdmin';
import PrincipalMermaAdmin from './Admin/ConfiguracionInvetario/MermaAdmin/PrincipalMermaAdmin';
import EdicionMermaAdmin from './Admin/ConfiguracionInvetario/MermaAdmin/EdicionMermaAdmin';
import AgregarMermaAdmin from './Admin/ConfiguracionInvetario/MermaAdmin/AgregarMermaAdmin';

{ /* Import Usuarios Admin */}
import UsuariosAdmin from './Admin/ConfiguracionUsuarios/UsuariosAdmin';

{ /* Import Menu admin */}
import MenuAdmin from './Admin/ConfiguracionMenu/MenuAdmin';
import CreacionPlatilloMenu from './Admin/ConfiguracionMenu/CreacionPlatilloMenu';
import EdicionMenuAdmin from './Admin/ConfiguracionMenu/EdicionMenuAdmin';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminPaginaAdmin />} />
        <Route path="/mesero" element={<MeserosPaginaPrincipal />} />

        { /* Rutas Inventario y merma */}
        <Route path="/inventario" element={<InventarioAdmin/>} />
        <Route path="/edicion_inventario/:id" element={<EdicionInventarioAdmin/>} />
        <Route path="/agregar_inventario/:id" element={<AgregarInventarioAdmin/>} />
        <Route path="/agregar_producto" element={<AgregarProductoInventarioAdmin/>} />
        <Route path="/merma" element={<PrincipalMermaAdmin/>} />
        <Route path="/edicion_merma" element={<EdicionMermaAdmin/>} />
        <Route path="/agregar_merma" element={<AgregarMermaAdmin/>} />

        { /* Rutas Usuarios */}
        <Route path="/usuarios" element={ <UsuariosAdmin/> } />    


        { /* Rutas Menu */}
        <Route path="/menu_admin" element={ <MenuAdmin/> } />    
        <Route path="/crear_platillo" element={ <CreacionPlatilloMenu/> } />
        <Route path="/edicion_platillo/:id" element={ <EdicionMenuAdmin/> } />

        
        
        <Route path="/" element={<Navigate to="/login" />} />

      </Routes>
    </Router>
  </StrictMode>,
)
