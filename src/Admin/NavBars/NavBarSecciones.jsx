import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

export default function NavBarSecciones() {
    const location = useLocation();

    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{ justifyContent: "center" }}>
                    <Button color="inherit" component={Link} to="/admin"> Inicio </Button>

                    {location.pathname !== "/menu_admin" && (
                        <Button color="inherit" component={Link} to="/menu_admin"> Menu </Button>
                    )}
                    <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
                </Toolbar>
            </AppBar>
        </div>
    )
}
