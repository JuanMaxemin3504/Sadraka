import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

export default function NavBarAdminPromos() {
    const location = useLocation();

    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{ justifyContent: "center" }}>
                    <Button color="inherit" component={Link} to="/admin"> Inicio </Button>

                    {location.pathname !== "/promociones_admin" && (
                        <Button color="inherit" component={Link} to="/promociones_admin"> Promociones </Button>
                    )}

                    {location.pathname !== "/crear_promociones_admin" && (
                        <Button color="inherit" component={Link} to="/crear_promociones_admin"> Crear promocion </Button>
                    )}


                    <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
                </Toolbar>
            </AppBar>
        </div>
    )
}
