import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

function NavBarMerma() {
    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{ justifyContent: "center" }}>
                    <Button color="inherit" component={Link} to="/admin"> Inicio </Button>

                    {location.pathname !== "/merma" && (
                        <Button color="inherit" component={Link} to="/merma"> Merma </Button>
                    )}

                    {location.pathname !== "/agregar_merma" && (
                    <Button color="inherit" component={Link} to="/agregar_merma"> Agregar merma </Button>
                    )}

                    <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
                </Toolbar>
            </AppBar>
        </div>
    )
}

export default NavBarMerma
