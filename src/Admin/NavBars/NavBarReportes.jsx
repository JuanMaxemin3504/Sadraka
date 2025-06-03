import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

const NavBarReportes = () => {
    return (
        <AppBar position="static">
            <Toolbar style={{ justifyContent: "center" }}>
                <Button color="inherit" component={Link} to="/admin"> Inicio </Button>

                <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
            </Toolbar>
        </AppBar>
    )
}

export default NavBarReportes
