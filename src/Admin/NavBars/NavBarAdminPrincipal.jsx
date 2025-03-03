import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography } from '@mui/material';

function NavBarAdminPrincipal() {
    return (
        <AppBar position="static">
            <Toolbar style={{justifyContent: "center"}}>
                <Button color="inherit" component={Link} to="/admin">Inicio</Button>
                <Button color="inherit" component={Link} to="/">Cerrar sesion</Button>
            </Toolbar>
        </AppBar>
    )
}

export default NavBarAdminPrincipal
