import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

function NavBarMenuAdmin() {
    const location = useLocation();

    return (
        <AppBar position="static">
            <Toolbar style={{ justifyContent: "center" }}>
                <Button color="inherit" component={Link} to="/admin"> Inicio </Button>
    
                {location.pathname !== "/menu_admin" && (
                    <Button color="inherit" component={Link} to="/menu_admin"> Menu </Button>
                )}
    
                {location.pathname === "/menu_admin" && (
                    <>
                        <Button color="inherit" component={Link} to="/crear_platillo"> Crear platillo </Button>
                        <Button color="inherit" component={Link} to="/editar_secciones"> Editar Secciones </Button>
                    </>
                )}
                
                <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
            </Toolbar>
        </AppBar>
    )
}

export default NavBarMenuAdmin