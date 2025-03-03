import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

function NavBarInventario() {
    const location = useLocation();

    return (
        <AppBar position="static">
            <Toolbar style={{ justifyContent: "center" }}>
                <Button color="inherit" component={Link} to="/admin"> Inicio </Button>

                {location.pathname !== "/inventario" && (
                    <Button color="inherit" component={Link} to="/inventario"> Inventario </Button>
                )}

                {location.pathname === "/inventario" && (
                    <>
                        <Button color="inherit" component={Link} to="/agregar_producto"> Crear producto </Button>
                        <Button color="inherit" component={Link} to="/merma"> Merma </Button>
                    </>
                )}
                
                <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
            </Toolbar>
        </AppBar>
    );
}

export default NavBarInventario;