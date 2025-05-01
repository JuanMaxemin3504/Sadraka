import * as React from 'react';
import { Typography, Grid, Paper, Link } from '@mui/material';
import NavBarAdminPrincipal from "./NavBars/NavBarAdminPrincipal";

function AdminPaginaPrincipal() {
    return (
            
                <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
                    {/* Barra de navegación superior */}
                    <NavBarAdminPrincipal/>

                    {/* Contenido principal */}
                    <div style={{ flex: 1, padding: '20px', backgroundColor: '#f5f5f5' }}>

                        <Grid container spacing={3} style={{ marginBottom: '20px' }}>
                            <Grid item xs={4}>
                                <Paper style={{ padding: '20px', textAlign: 'center' }}>
                                    <Typography variant="h6">Ventas Actuales</Typography>
                                    <Typography variant="body1">Información de ventas actuales</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={4}>
                                <Paper style={{ padding: '20px', textAlign: 'center' }}>
                                    <Typography variant="h6">Tickets</Typography>
                                    <Typography variant="body1">Información de tickets</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={4}>
                                <Paper style={{ padding: '20px', textAlign: 'center' }}>
                                    <Typography variant="h6">Venta promedio por ticket</Typography>
                                    <Typography variant="body1">Información de venta promedio</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Grid container spacing={3}>
                            <Grid item xs={4}>
                                <Link href="/menu_admin" underline="none">
                                    <Paper style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                        <Typography variant="h6">Configuración carta</Typography>
                                    </Paper>
                                </Link>
                            </Grid>
                            <Grid item xs={4}>
                                <Link href="/promociones_admin" underline="none">
                                    <Paper style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                        <Typography variant="h6">Promociones</Typography>
                                    </Paper>
                                </Link>
                            </Grid>
                            <Grid item xs={4}>
                                <Link href="/reportes" underline="none">
                                    <Paper style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                        <Typography variant="h6">Reportes</Typography>
                                    </Paper>
                                </Link>
                            </Grid>
                            <Grid item xs={4}>
                                <Link href="/inventario" underline="none">
                                    <Paper style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                        <Typography variant="h6">Inventario</Typography>
                                    </Paper>
                                </Link>
                            </Grid>
                            <Grid item xs={4}>
                                <Link href="/usuarios" underline="none">
                                    <Paper style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                        <Typography variant="h6">Usuarios</Typography>
                                    </Paper>
                                </Link>
                            </Grid>
                        </Grid>
                    </div>
                </div>

    )
}

export default AdminPaginaPrincipal