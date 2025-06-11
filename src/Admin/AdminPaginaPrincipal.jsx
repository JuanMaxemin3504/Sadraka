import React, { useState, useEffect, useRef } from 'react';
import { Typography, Grid, Paper, Link } from '@mui/material';
import NavBarAdminPrincipal from "./NavBars/NavBarAdminPrincipal";
import { collection, query, where, getDocs, getFirestore, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { startOfDay, endOfDay } from 'date-fns';
import dayjs from 'dayjs';


function AdminPaginaPrincipal() {
    const copiaGenerada = useRef(false);
    
    const [totalDeVentas, setTotalDeVentas] = useState(0);
    const [numeroDeVentas, setNumeroDeVentas] = useState(0);
    const [promedioDeVentas, setPromedioDeVentas] = useState(0);
    
    async function generarCopiaInventarioInicial() {
        try {
            const hoyInicio = startOfDay(new Date());
            const hoyFin = endOfDay(new Date());
    
            // Referencia a la colección
            const historialRef = collection(db, 'historial_inventario');
    
            // Verificar si ya existe copia
            const q = query(
                historialRef,(
                where('tipo', '==', 'copia_inicial'),
                where('fechaRegistro', '>=', hoyInicio),
                where('fechaRegistro', '<=', hoyFin))
            );
    
            const snapshot = await getDocs(q);
    
            if (!snapshot.empty) {
                console.log('Ya existe una copia hoy');
                return;
            }
    
            // Obtener inventario actual
            const inventarioSnapshot = await getDocs(collection(db, 'products'));
            const inventarioActual = inventarioSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
    
            // Guardar copia en historial
            await addDoc(historialRef, {
                fechaRegistro: new Date(),
                tipo: 'copia_inicial',
                datos: inventarioActual,
                cantidadItems: inventarioActual.length
            });
    
            console.log('Nueva copia de seguridad creada');
        } catch (error) {
            console.error('Error generando copia:', error);
        }
    }

    const obtenerInformacionVentas = async () => {

        let totalVentas = 0;
        let numVentas = 0;

        const fechaInicio = dayjs().startOf('day');
        const fechaFin = dayjs().endOf('day');
        const ventasRef = collection(db, 'ventas');
        const q = query(
            ventasRef,
            where('fecha', '>=', fechaInicio.toDate()),
            where('fecha', '<=', fechaFin.toDate())
        );

        const snapshot = await getDocs(q);
        const ventasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        for (const venta of ventasData){
            totalVentas += venta.total;
            numVentas++;
        }
        
        const promedioVentas = (totalVentas/numVentas).toFixed(2);

        setTotalDeVentas(totalVentas);
        setNumeroDeVentas(numVentas);
        setPromedioDeVentas(promedioVentas);

    }

    useEffect(() => {
        const cargarInformacion = async () => {
            obtenerInformacionVentas();
        };

        if (!copiaGenerada.current) {
            generarCopiaInventarioInicial();
            copiaGenerada.current = true;
        }
        
        cargarInformacion();
        const interval = setInterval(cargarInformacion, 5000);
        return () => clearInterval(interval);
    }, []);

    return (

        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            {/* Barra de navegación superior */}
            <NavBarAdminPrincipal />

            {/* Contenido principal */}
            <div style={{ flex: 1, padding: '20px', backgroundColor: '#f5f5f5' }}>

                <Grid container spacing={3} style={{ marginBottom: '20px' }}>
                    <Grid item xs={4}>
                        <Paper style={{ padding: '20px', textAlign: 'center' }}>
                            <Typography variant="h6">Ventas Actuales</Typography>
                            <Typography variant="body1">${totalDeVentas}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={4}>
                        <Paper style={{ padding: '20px', textAlign: 'center' }}>
                            <Typography variant="h6">Venta promedio por ticket</Typography>
                            <Typography variant="body1">${promedioDeVentas}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={4}>
                        <Paper style={{ padding: '20px', textAlign: 'center' }}>
                            <Typography variant="h6">Numero de ventas</Typography>
                            <Typography variant="body1">{numeroDeVentas}</Typography>
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
                    <Grid item xs={4}>
                        <Link href="/ConfigurarSistemaAdmin" underline="none">
                            <Paper style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                <Typography variant="h6">Configuracion sistema</Typography>
                            </Paper>
                        </Link>
                    </Grid>
                </Grid>
            </div>
        </div>

    )
}

export default AdminPaginaPrincipal