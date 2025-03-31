import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

export default function NavBarUsuarios() {
    const location = useLocation();

    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{ justifyContent: "center" }}>
                    <Button color="inherit" component={Link} to="/admin"> Inicio </Button>

                    {location.pathname !== "/usuarios" && (
                        <Button color="inherit" component={Link} to="/usuarios"> Usuarios </Button>
                    )}

                    <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
                </Toolbar>
            </AppBar>
        </div>
    )
}
