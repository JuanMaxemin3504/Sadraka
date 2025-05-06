import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

const NavBarMeseros = () => {
    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{ justifyContent: "center" }}>
                    <Button color="inherit" component={Link} to="/menu_mesero"> Menu </Button>

                    {location.pathname !== "/editar_pedidos_mesero" && (
                    <Button color="inherit" component={Link} to="/editar_pedidos_mesero"> Editar pedidos </Button>
                    )}

                    {location.pathname !== "/cuenta_mesas" && (
                    <Button color="inherit" component={Link} to="/cuenta_mesas"> Cuenta Mesas </Button>
                    )}

                    <Button color="inherit" component={Link} to="/"> Cerrar sesión </Button>
                </Toolbar>
            </AppBar>
        </div>
    )
}

export default NavBarMeseros
