import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Select, DatePicker, Checkbox, Input, Modal, Table } from 'antd';
import { DownloadOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es'; // Para nombres en español
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import NavBarReportes from '../NavBars/NavBarReportes';

// Extender dayjs con plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);
dayjs.locale('es'); // Establecer español como idioma predeterminado

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportesAdmin = () => {

    const [tipoReporteVentas, setTipoReporteVentas] = useState('diario');
    const [fechaPersonalizada, setFechaPersonalizada] = useState([]);
    const [fechaInicioPeriodo, setFechaInicioPeriodo] = useState(dayjs());
    const [opcionesVentas, setOpcionesVentas] = useState({
        ventasPorCategoria: true,
        ventasPorProducto: true, // Nombre corregido (antes tenía typo)
        descuentos: false,
        impactoPromociones: false,
        metodosPago: false,
        ventasPorDiaSemana: false
    });

    // Estados para reportes automáticos
    const [modalConfigVisible, setModalConfigVisible] = useState(false);
    const [frecuenciaReporte, setFrecuenciaReporte] = useState('semanal');
    const [correosDestino, setCorreosDestino] = useState('');
    const [configOpciones, setConfigOpciones] = useState({ ...opcionesVentas });

    // Estados para reportes de inventario
    const [tipoReporteInventario, setTipoReporteInventario] = useState('completo');
    const [productosSeleccionados, setProductosSeleccionados] = useState([]);
    const [todosProductos, setTodosProductos] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cargar productos para el reporte de inventario
    useEffect(() => {
        const cargarProductos = async () => {
            const productosRef = collection(db, 'menu');
            const querySnapshot = await getDocs(productosRef);
            const productosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTodosProductos(productosData);
        };
        cargarProductos();
    }, []);

    // Generar PDF de ventas
    const generarPDFVentas = async () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Reporte de Ventas ${tipoReporteVentas.toUpperCase()}`, 105, 15, { align: 'center' });

        // 1. Obtener las secciones/categorías desde Firestore
        const seccionesSnapshot = await getDocs(collection(db, 'secciones'));
        const seccionesData = seccionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Crear mapeo de IDs de sección a nombres
        const seccionesMap = {};
        seccionesData.forEach(sec => {
            seccionesMap[sec.id] = sec.nombre || `Sección ${sec.numero}`;
        });

        // 2. Obtener información del menú para conocer la sección de cada platillo
        const menuSnapshot = await getDocs(collection(db, 'menu'));
        const menuData = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Crear mapeo de nombres de platillo a sección
        const platilloSeccionMap = {};
        menuData.forEach(item => {
            platilloSeccionMap[item.nombre] = item.seccion?.id || null;
        });

        // Calcular fechas según el tipo de reporte
        let fechaInicio, fechaFin, periodoTexto;

        switch (tipoReporteVentas) {
            case 'diario':
                fechaInicio = dayjs().startOf('day');
                fechaFin = dayjs().endOf('day');
                periodoTexto = fechaInicio.format('DD/MM/YYYY');
                break;
            case 'semanal':
                fechaInicio = fechaInicioPeriodo.startOf('week');
                fechaFin = fechaInicioPeriodo.endOf('week');
                periodoTexto = `${fechaInicio.format('DD/MM/YYYY')} - ${fechaFin.format('DD/MM/YYYY')}`;
                break;
            case 'mensual':
                fechaInicio = fechaInicioPeriodo.startOf('month');
                fechaFin = fechaInicioPeriodo.endOf('month');
                periodoTexto = `${fechaInicio.format('DD/MM/YYYY')} - ${fechaFin.format('DD/MM/YYYY')}`;
                break;
            case 'trimestral':
                fechaInicio = fechaInicioPeriodo.startOf('quarter');
                fechaFin = fechaInicioPeriodo.endOf('quarter');
                periodoTexto = `${fechaInicio.format('DD/MM/YYYY')} - ${fechaFin.format('DD/MM/YYYY')}`;
                break;
            case 'anual':
                fechaInicio = fechaInicioPeriodo.startOf('year');
                fechaFin = fechaInicioPeriodo.endOf('year');
                periodoTexto = `${fechaInicio.format('DD/MM/YYYY')} - ${fechaFin.format('DD/MM/YYYY')}`;
                break;
            case 'personalizado':
                fechaInicio = fechaPersonalizada[0];
                fechaFin = fechaPersonalizada[1];
                periodoTexto = `${fechaInicio.format('DD/MM/YYYY')} - ${fechaFin.format('DD/MM/YYYY')}`;
                break;
            default:
                fechaInicio = dayjs().startOf('day');
                fechaFin = dayjs().endOf('day');
                periodoTexto = fechaInicio.format('DD/MM/YYYY');
        }

        // Calculo de merma
        const mermaRef = collection(db, 'merma');
        const mermaQuery = query(
            mermaRef,
            where('fechaEjecucion', '>=', fechaInicio.toDate()),
            where('fechaEjecucion', '<=', fechaFin.toDate())
        );

        const mermaSnapshot = await getDocs(mermaQuery);
        const mermaPorIngrediente = [];
        const mermaPorPlatillo = [];
        let totalIngrediente = 0;
        let totalPlatillo = 0;

        mermaSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const subtotal = data.cantidad * (data.precioUnitario || 0); // Manejar posible undefined

            // Validar tipo de merma y asegurar minúsculas para comparación
            const tipoMerma = data.inventario

            if (!tipoMerma) {
                totalIngrediente += subtotal;
                mermaPorIngrediente.push({
                    ...data,
                    id: doc.id,
                    subtotal
                });
            } else {
                totalPlatillo += subtotal;
                mermaPorPlatillo.push({
                    ...data,
                    id: doc.id,
                    subtotal
                });
            }
        });

        const totalMerma = totalIngrediente + totalPlatillo;

        doc.setFontSize(12);
        doc.text(`Periodo: ${periodoTexto}`, 105, 25, { align: 'center' });

        // Traer ventas con el rango calculado
        const ventasRef = collection(db, 'ventas');
        const q = query(
            ventasRef,
            where('fecha', '>=', fechaInicio.toDate()),
            where('fecha', '<=', fechaFin.toDate())
        );

        const snapshot = await getDocs(q);
        const ventasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Inicializar estructuras para agrupar por sección
        const porSeccion = {};
        // Inicializar todas las secciones conocidas
        seccionesData.forEach(sec => {
            porSeccion[sec.id] = {
                nombre: seccionesMap[sec.id],
                cantidad: 0,
                total: 0,
                costeNeto: 0
            };
        });

        // Agregar una sección "Sin categoría" para platillos sin sección
        porSeccion['sin_seccion'] = {
            nombre: 'Sin categoría',
            cantidad: 0,
            total: 0,
            costeNeto: 0
        };

        const porPlatillo = {};
        const promociones = {};
        const porDiaSemana = {};
        const promocionesPorDia = {};
        let costoNeto = 0;
        let totalVentas = 0;
        let totalIVA = 0;
        let totalPlatillos = 0;
        let totalPromociones = 0;

        // Días de la semana para inicializar
        const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        diasSemana.forEach(dia => {
            porDiaSemana[dia] = { cantidad: 0, total: 0 };
            promocionesPorDia[dia] = { cantidad: 0, total: 0 };
        });

        for (const venta of ventasData) {
            const fecha = venta.fecha.toDate ? venta.fecha.toDate() : new Date(venta.fecha);
            const dia = dayjs(fecha).format('dddd').toLowerCase();

            venta.pedidos?.forEach(pedido => {
                // Procesar platillos normales
                pedido.platillos?.forEach(plat => {
                    // Determinar categoría (asumiendo que plat tiene propiedad 'categoria')
                    const seccionId = platilloSeccionMap[plat.nombre] || 'sin_seccion';

                    // Actualizar estadísticas por categoría
                    porSeccion[seccionId].cantidad += plat.cantidad;
                    porSeccion[seccionId].total += plat.precio;
                    porSeccion[seccionId].costeNeto += plat.cantidad * (plat.costeNeto || 0);

                    // Actualizar estadísticas por platillo
                    if (!porPlatillo[plat.nombre]) porPlatillo[plat.nombre] = { cantidad: 0, total: 0, costeNeto: 0 };
                    porPlatillo[plat.nombre].cantidad += plat.cantidad;
                    porPlatillo[plat.nombre].total += plat.precio;
                    porPlatillo[plat.nombre].costeNeto += plat.cantidad * (plat.costeNeto || 0);

                    // Actualizar estadísticas por día
                    porDiaSemana[dia].cantidad += plat.cantidad;
                    porDiaSemana[dia].total += plat.precio;

                    totalVentas += plat.precio;
                    costoNeto += plat.cantidad * (plat.costeNeto || 0);
                    totalPlatillos += plat.precio;
                });

                // Procesar promociones
                pedido.promociones?.forEach(promo => {
                    if (!promociones[promo.nombre]) {
                        promociones[promo.nombre] = {
                            veces: 0,
                            totalVenta: 0,
                            totalDescuento: 0,
                            costeNeto: 0
                        };
                    }

                    promociones[promo.nombre].veces += 1;
                    promociones[promo.nombre].totalVenta += promo.precio || 0;
                    totalVentas += promo.precio || 0;
                    totalPromociones += promo.precio || 0;

                    // Actualizar estadísticas de promociones por día
                    promocionesPorDia[dia].cantidad += 1;
                    promocionesPorDia[dia].total += promo.precio || 0;

                    // Calcular coste neto de los platillos en la promoción
                    let costePromo = 0;
                    let valorPlatillos = 0;

                    promo.platillos?.forEach(plat => {
                        valorPlatillos += plat.cantidad * plat.precio;
                        costePromo += plat.cantidad * (plat.costeNeto || 0);

                        // Registrar platillos para estadísticas (sin sumar al total)
                        if (!porPlatillo[plat.nombre]) porPlatillo[plat.nombre] = { cantidad: 0, total: 0, costeNeto: 0 };
                        porPlatillo[plat.nombre].cantidad += plat.cantidad;
                        porPlatillo[plat.nombre].costeNeto += plat.cantidad * (plat.costeNeto || 0);
                    });

                    costoNeto += costePromo;
                    promociones[promo.nombre].costeNeto += costePromo;
                    promociones[promo.nombre].totalDescuento += (valorPlatillos - (promo.precio || 0));
                });
            });
        }

        let y = 40;

        // Función para dibujar gráfica de barras básica
        const drawBarChart = (data, labels, title, yPos, maxValue, isMoney = true) => {
            const barSpacing = 6; // espacio entre barras
            const barWidth = 10;
            const chartWidth = data.length * (barWidth + barSpacing);
            const chartHeight = 60;
            const scale = chartHeight / maxValue;

            // Dibujar título
            doc.setFontSize(12);
            doc.text(title, 15, yPos);

            // Dibujar ejes
            doc.line(15, yPos + 5, 15, yPos + 5 + chartHeight);
            doc.line(15, yPos + 5 + chartHeight, 15 + chartWidth, yPos + 5 + chartHeight);

            // Dibujar barras
            data.forEach((value, i) => {
                const barHeight = value * scale;
                const x = 15 + (i * (barWidth + barSpacing));
                const y = yPos + 5 + chartHeight - barHeight;

                // Barra
                doc.setFillColor(100, 150, 200);
                doc.rect(x, y, barWidth, barHeight, 'F');

                // Valor numérico
                doc.setFontSize(7);
                doc.text(
                    isMoney ? `$${value.toFixed(2)}` : value.toString(),
                    x + 1,
                    y - 2
                );

                // Etiquetas
                const label = labels[i];

                if (label.length <= 10) {
                    // Etiqueta corta: vertical
                    doc.setFontSize(6);
                    doc.saveGraphicsState();
                    doc.text(label, x + (barWidth / 2), yPos + 5 + chartHeight + 10, {
                        angle: 90,
                        align: 'left',
                        baseline: 'middle'
                    });
                    doc.restoreGraphicsState();
                } else {
                    // Etiqueta larga: multilínea horizontal por palabra
                    const words = label.split(' ');
                    doc.setFontSize(6);
                    words.forEach((word, idx) => {
                        doc.text(word, x - 2, yPos + 5 + chartHeight + 6 + (idx * 3));
                    });
                }
            });

            // Retornar altura ajustada
            return yPos + chartHeight + 30; // espacio adicional para etiquetas largas
        };


        // Función para dibujar tabla
        const drawTable = (titulo, data, columns) => {
            doc.setFontSize(14);
            doc.text(titulo, 15, y);
            y += 6;
            doc.setFontSize(12);
            columns.forEach((col, i) => {
                doc.text(col, 15 + i * 60, y);
            });
            y += 5;
            data.forEach(row => {
                row.forEach((col, i) => {
                    doc.text(String(col), 15 + i * 60, y);
                });
                y += 5;
            });
            y += 10;
        };

        // 1. Ventas por sección (con grafica
        if (opcionesVentas.ventasPorCategoria) {
            // Convertir objeto a array y ordenar por total
            const seccionesArray = Object.values(porSeccion)
                .filter(sec => sec.cantidad > 0) // Solo mostrar secciones con ventas
                .sort((a, b) => b.total - a.total);

            const nombresSecciones = seccionesArray.map(sec => sec.nombre);
            const totales = seccionesArray.map(sec => sec.total);
            const cantidades = seccionesArray.map(sec => sec.cantidad);
            const maxTotal = Math.max(...totales, 1);
            const maxCantidad = Math.max(...cantidades, 1);

            if (y > 40) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.text('Ventas por Sección', 15, y);
            y += 10;

            // Tabla de secciones
            drawTable('',
                seccionesArray.map(sec => [
                    sec.nombre,
                    sec.cantidad,
                    `$${sec.total.toFixed(2)}`
                ]),
                ['Sección', 'Cantidad', 'Total']
            );

            // Gráfica de dinero por sección
            y = drawBarChart(
                totales,
                nombresSecciones.map(nombre => nombre.substring(0, 8)), // Limitar longitud para caber
                'Dinero generado por sección ($)',
                y,
                maxTotal
            );

            // Gráfica de cantidad por sección
            y = drawBarChart(
                cantidades,
                nombresSecciones.map(nombre => nombre.substring(0, 8)),
                'Cantidad vendida por sección',
                y,
                maxCantidad,
                false
            );
        }

        // 2. Ventas por producto (con gráfica)
        if (opcionesVentas.ventasPorProducto) {
            const productos = Object.keys(porPlatillo);
            const topProductos = productos
                .sort((a, b) => porPlatillo[b].total - porPlatillo[a].total)
                .slice(0, 10); // Limitar a top 10 para que quepa

            const totales = topProductos.map(prod => porPlatillo[prod].total);
            const cantidades = topProductos.map(prod => porPlatillo[prod].cantidad);
            const maxTotal = Math.max(...totales, 1);
            const maxCantidad = Math.max(...cantidades, 1);

            if (y > 40) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.text('Ventas por Producto (Top 10)', 15, y);
            y += 10;

            // Tabla de productos
            drawTable('',
                topProductos.map(prod => [
                    prod.length > 20 ? prod.substring(0, 17) + '...' : prod,
                    porPlatillo[prod].cantidad,
                    `$${porPlatillo[prod].total.toFixed(2)}`
                ]),
                ['Producto', 'Cantidad', 'Total']
            );

            // Gráfica de dinero por producto
            y = drawBarChart(
                totales,
                topProductos.map(prod => prod.substring(0, 5) + (prod.length > 5 ? '...' : '')),
                'Dinero generado por producto ($)',
                y,
                maxTotal
            );

            // Gráfica de cantidad por producto
            y = drawBarChart(
                cantidades,
                topProductos.map(prod => prod.substring(0, 5) + (prod.length > 5 ? '...' : '')),
                'Cantidad vendida por producto',
                y,
                maxCantidad,
                false
            );
        }

        // 3. Total de descuentos aplicados (con gráfica)
        if (opcionesVentas.totalDescuentos) {

            if (y > 40) {
                doc.addPage();
                y = 20;
            }

            const promosConDescuento = Object.entries(promociones)
                .filter(([_, datos]) => datos.totalDescuento > 0);

            if (promosConDescuento.length > 0) {
                const nombres = promosConDescuento.map(([nombre, _]) => nombre);
                const descuentos = promosConDescuento.map(([_, datos]) => datos.totalDescuento);
                const maxDescuento = Math.max(...descuentos, 1);

                doc.setFontSize(14);
                doc.text('Total de Descuentos Aplicados', 15, y);
                y += 10;

                // Tabla de descuentos
                drawTable('',
                    promosConDescuento.map(([nombre, datos]) => [
                        nombre.length > 20 ? nombre.substring(0, 17) + '...' : nombre,
                        `$${datos.totalDescuento.toFixed(2)}`
                    ]),
                    ['Promoción', 'Total Descuento']
                );

                // Gráfica de descuentos
                y = drawBarChart(
                    descuentos,
                    nombres.map(nombre => nombre.substring(0, 5) + (nombre.length > 5 ? '...' : '')),
                    'Descuentos aplicados por promoción ($)',
                    y,
                    maxDescuento
                );
            }
        }

        // 4. Impacto de promociones (con gráfica)
        if (opcionesVentas.impactoPromociones && Object.keys(promociones).length > 0) {
            const nombres = Object.keys(promociones);
            const usos = nombres.map(nombre => promociones[nombre].veces);
            const maxUsos = Math.max(...usos, 1);

            if (y > 40) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.text('Impacto de Promociones', 15, y);
            y += 10;

            // Tabla de promociones
            drawTable('',
                nombres.map(nombre => [
                    nombre.length > 20 ? nombre.substring(0, 17) + '...' : nombre,
                    promociones[nombre].veces,
                    `$${promociones[nombre].totalVenta.toFixed(2)}`
                ]),
                ['Promoción', 'Veces Usada', 'Total Ventas']
            );

            // Gráfica de usos de promociones
            y = drawBarChart(
                usos,
                nombres.map(nombre => nombre.substring(0, 5) + (nombre.length > 5 ? '...' : '')),
                'Veces que se usaron las promociones',
                y,
                maxUsos,
                false
            );
        }

        // 5. Ventas por día de la semana (con gráfica)
        if (opcionesVentas.ventasPorDiaSemana) {
            const diasOrdenados = diasSemana;
            const totales = diasOrdenados.map(dia => porDiaSemana[dia].total);
            const cantidades = diasOrdenados.map(dia => porDiaSemana[dia].cantidad);
            const maxTotal = Math.max(...totales, 1);
            const maxCantidad = Math.max(...cantidades, 1);

            if (y > 40) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.text('Ventas por Día de la Semana', 15, y);
            y += 10;

            // Tabla de días
            drawTable('',
                diasOrdenados.map(dia => [
                    dia.charAt(0).toUpperCase() + dia.slice(1),
                    porDiaSemana[dia].cantidad,
                    `$${porDiaSemana[dia].total.toFixed(2)}`
                ]),
                ['Día', 'Cantidad', 'Total']
            );

            // Gráfica de dinero por día
            y = drawBarChart(
                totales,
                diasOrdenados.map(dia => dia.substring(0, 3)),
                'Dinero generado por día ($)',
                y,
                maxTotal
            );

            // Gráfica de cantidad por día
            y = drawBarChart(
                cantidades,
                diasOrdenados.map(dia => dia.substring(0, 3)),
                'Cantidad vendida por día',
                y,
                maxCantidad,
                false
            );
        }

        // 6. Promociones por día de la semana (con gráfica)
        if (opcionesVentas.promocionesPorDia) {
            const diasOrdenados = diasSemana;
            const totales = diasOrdenados.map(dia => promocionesPorDia[dia].total);
            const cantidades = diasOrdenados.map(dia => promocionesPorDia[dia].cantidad);
            const maxTotal = Math.max(...totales, 1);
            const maxCantidad = Math.max(...cantidades, 1);

            if (y > 40) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.text('Promociones por Día de la Semana', 15, y);
            y += 10;

            // Tabla de días
            drawTable('',
                diasOrdenados.map(dia => [
                    dia.charAt(0).toUpperCase() + dia.slice(1),
                    promocionesPorDia[dia].cantidad,
                    `$${promocionesPorDia[dia].total.toFixed(2)}`
                ]),
                ['Día', 'Cantidad', 'Total']
            );

            // Gráfica de dinero por día
            y = drawBarChart(
                totales,
                diasOrdenados.map(dia => dia.substring(0, 3)),
                'Dinero generado por promociones por día ($)',
                y,
                maxTotal
            );

            // Gráfica de cantidad por día
            y = drawBarChart(
                cantidades,
                diasOrdenados.map(dia => dia.substring(0, 3)),
                'Promociones usadas por día',
                y,
                maxCantidad,
                false
            );
        }

        if (y > 20) {
            doc.addPage();
            y = 20;
        }

        // Resumen final
        const numTransacciones = ventasData.length;
        totalIVA = totalVentas * 0.16;
        const ventaPromedio = numTransacciones > 0 ? totalVentas / numTransacciones : 0;
        const margenGanancia = totalVentas - costoNeto;

        doc.setFontSize(14);
        doc.text('Resumen General', 15, y);
        y += 10;

        doc.setFontSize(12);
        doc.text(`Ventas totales (antes de impuestos): $${totalVentas.toFixed(2)}`, 15, y);
        y += 7;
        doc.text(`  - Por platillos: $${totalPlatillos.toFixed(2)}`, 30, y);
        y += 7;
        doc.text(`  - Por promociones: $${totalPromociones.toFixed(2)}`, 30, y);
        y += 7;
        doc.text(`Merma total: $${totalMerma.toFixed(2)}`, 15, y);
        y += 7;
        doc.text(`Costo de productos total: $${costoNeto.toFixed(2)}`, 15, y);
        y += 7;
        doc.text(`Impuestos recaudados (IVA 16%): $${totalIVA.toFixed(2)}`, 15, y);
        y += 7;
        doc.text(`Número de transacciones: ${numTransacciones}`, 15, y);
        y += 7;
        doc.text(`Venta promedio por transacción: $${ventaPromedio.toFixed(2)}`, 15, y);
        y += 7;
        doc.text(`Margen de ganancia: $${margenGanancia.toFixed(2)} (${(margenGanancia / totalVentas * 100).toFixed(2)}%)`, 15, y);

        doc.save(`reporte_ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const generarPDFInventario = async () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Reporte de Inventario Histórico`, 105, 15, { align: 'center' });

        const fechaInicio = fechaPersonalizada[0];
        const fechaFin = fechaPersonalizada[1];

        doc.setFontSize(12);
        doc.text(`Periodo: ${fechaInicio.format('DD/MM/YYYY')} - ${fechaFin.format('DD/MM/YYYY')}`, 105, 25, { align: 'center' });

        const inventarioRef = collection(db, 'historial_inventario');
        const q = query(
            inventarioRef,
            where('fechaRegistro', '>=', fechaInicio.toDate()),
            where('fechaRegistro', '<=', fechaFin.toDate()),
            orderBy('fechaRegistro', 'asc')
        );

        const snapshot = await getDocs(q);
        const registros = snapshot.docs.map(doc => doc.data());

        if (registros.length === 0) {
            doc.text('No hay datos de inventario en el período seleccionado.', 15, 40);
            doc.save(`reporte_inventario_${fechaInicio.format('YYYYMMDD')}_${fechaFin.format('YYYYMMDD')}.pdf`);
            return;
        }

        const primerRegistro = registros[0];
        const ultimoRegistro = registros[registros.length - 1];
        const fechaRegistroInicio = primerRegistro.fechaRegistro;
        const fechaRegistroFin = ultimoRegistro.fechaRegistro;
        const fechaInicioFormatted = dayjs(fechaRegistroInicio.toDate()).format('DD/MM/YYYY');
        const fechaFinFormatted = dayjs(fechaRegistroFin.toDate()).format('DD/MM/YYYY');
        const datosInicio = primerRegistro.datos || [];
        const datosFin = ultimoRegistro.datos || [];


        // Mapear ingredientes por ID
        const ingredientesMap = new Map();

        datosInicio.forEach(item => {
            ingredientesMap.set(item.id, {
                id: item.id,
                nombre: item.nombre || 'Sin nombre',
                cantidadInicio: item.cantidad || 0,
                fechaInicio: fechaInicioFormatted,
                cantidadFin: 0,
                fechaFin: fechaFinFormatted
            });
        });

        datosFin.forEach(item => {
            if (ingredientesMap.has(item.id)) {
                ingredientesMap.get(item.id).cantidadFin = item.cantidad || 0;
            } else {
                ingredientesMap.set(item.id, {
                    id: item.id,
                    nombre: item.nombre || 'Sin nombre',
                    cantidadInicio: 0,
                    fechaInicio: fechaInicioFormatted,
                    cantidadFin: item.cantidad || 0,
                    fechaFin: fechaFinFormatted
                });
            }
        });

        const mermaRef = collection(db, 'merma');
        const mermaQuery = query(
            mermaRef,
            where('fechaEjecucion', '>=', fechaInicio.toDate()),
            where('fechaEjecucion', '<=', fechaFin.toDate())
        );

        const mermaSnapshot = await getDocs(mermaQuery);
        const mermaPorIngrediente = [];
        const mermaPorPlatillo = [];
        let totalIngrediente = 0;
        let totalPlatillo = 0;

        // Procesar cada documento de merma
        for (const doc of mermaSnapshot.docs) {
            const data = doc.data();
            const subtotal = data.cantidad * (data.precioUnitario || 0);

            // Determinar si es merma de ingrediente directo o de platillo
            if (data.inventario == true) {
                totalIngrediente += subtotal;
                const subtotalIng = data.precioUnitario * data.cantidad;
                mermaPorIngrediente.push({
                    id: doc.id,
                    nombre: data.producto || 'Sin nombre',
                    cantidad: data.cantidad,
                    precioUnitario: data.precioUnitario || 0,
                    subtotal: subtotalIng,
                    fecha: data.fechaEjecucion.toDate().toLocaleDateString()
                });
            } else if (data.inventario == false) {
                // Obtener información del platillo (usando await)
                const platilloInfo = await obtenerPlatillo(doc.id);

                if (platilloInfo && platilloInfo.ingredientes) {
                    // Calcular merma para cada ingrediente del platillo
                    for (const ing of platilloInfo.ingredientes) {
                        const precioUnitario = await obtenerPrecioUnitario(ing.id);
                        const cantidadMerma = ing.cantidad * data.cantidad;
                        const subtotalIng = cantidadMerma * precioUnitario;

                        totalPlatillo += subtotalIng;

                        mermaPorPlatillo.push({
                            id: ing.id,
                            nombre: ing.nombre || 'Sin nombre',
                            cantidad: cantidadMerma,
                            precioUnitario,
                            subtotal: subtotalIng,
                            platillo: platilloInfo.nombre,
                            fecha: data.fechaEjecucion.toDate().toLocaleDateString()
                        });
                    }
                }
            }
        }

        const totalMerma = totalIngrediente + totalPlatillo;

        const resultados = Array.from(ingredientesMap.values());

        // 3. Dibujar tabla
        let y = 40;

        doc.setFontSize(14);
        doc.text('Inventario Histórico', 15, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Ingrediente', 15, y);
        doc.text('Cant. Inicio', 80, y);
        doc.text('Fecha Inicio', 110, y);
        doc.text('Cant. Final', 150, y);
        doc.text('Fecha Final', 180, y);
        doc.setFont(undefined, 'normal');
        y += 7;

        doc.setFontSize(10);
        resultados.forEach(item => {
            if (y > 270) {
                doc.addPage();
                y = 20;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Ingrediente', 15, y);
                doc.text('Cant. Inicio', 80, y);
                doc.text('Fecha Inicio', 110, y);
                doc.text('Cant. Final', 150, y);
                doc.text('Fecha Final', 180, y);
                doc.setFont(undefined, 'normal');
                y += 7;
            }


            doc.text(item.nombre.substring(0, 30), 15, y);
            doc.text(item.cantidadInicio.toFixed(2).toString(), 80, y);
            doc.text(fechaInicioFormatted, 110, y);
            doc.text(item.cantidadFin.toFixed(2).toString(), 150, y);
            doc.text(fechaFinFormatted, 180, y);
            y += 7;
        });


        // 4. Resumen
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(14);
        doc.text('Resumen de Cambios', 15, y);
        y += 10;

        const conCambios = resultados
            .filter(item => item.cantidadInicio !== item.cantidadFin)
            .sort((a, b) => {
                const diffA = Math.abs(a.cantidadFin - a.cantidadInicio);
                const diffB = Math.abs(b.cantidadFin - b.cantidadInicio);
                return diffB - diffA; // Orden descendente
            });

        if (conCambios.length > 0) {
            doc.setFontSize(12);
            doc.text('Ingredientes con cambios:', 15, y);
            y += 7;

            conCambios.forEach(item => {
                const diferencia = (item.cantidadFin - item.cantidadInicio).toFixed(2);
                const cambio = diferencia > 0 ? `+${diferencia}` : diferencia.toString();

                doc.text(`${item.nombre.substring(0, 25)}: ${cambio}`, 20, y);
                y += 7;
            });
        } else {
            doc.text('No hubo cambios en las cantidades de ingredientes.', 15, y);
            y += 7;
        }

        // 5. Agregar resumen de merma - Versión corregida
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(14);
        doc.text('Resumen de Merma', 15, y);
        y += 10;

        // Totales
        doc.setFontSize(12);
        doc.text(`Total Merma: $${totalMerma.toFixed(2)}`, 15, y);
        y += 7;
        doc.text(`- Por ingredientes directos: $${totalIngrediente.toFixed(2)}`, 20, y);
        y += 7;
        doc.text(`- Por platillos: $${totalPlatillo.toFixed(2)}`, 20, y);
        y += 10;

        // Detalles de ingredientes
        if (mermaPorIngrediente.length > 0) {
            doc.setFontSize(12);
            doc.text('Detalle por Ingredientes:', 15, y);
            y += 7;

            // Agrupar por ingrediente para sumar cantidades
            const ingredientesAgrupados = mermaPorIngrediente.reduce((acc, item) => {
                if (!acc[item.id]) {
                    acc[item.id] = {
                        ...item,
                        count: 1
                    };
                } else {
                    acc[item.id].cantidad += item.cantidad;
                    acc[item.id].subtotal += item.subtotal;
                    acc[item.id].count++;
                }
                return acc;
            }, {});

            Object.values(ingredientesAgrupados).forEach(merma => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(
                    `${merma.nombre.substring(0, 30)}: ${merma.cantidad.toFixed(2)} x $${merma.precioUnitario.toFixed(2)} = $${merma.subtotal.toFixed(2)}`,
                    20,
                    y
                );
                y += 7;
            });
        } else {
            doc.text('No hubo merma por ingredientes directos.', 15, y);
            y += 7;
        }

        // Detalles de platillos
        if (mermaPorPlatillo.length > 0) {
            doc.setFontSize(12);
            doc.text('Detalle por Platillos:', 15, y);
            y += 7;

            // Agrupar primero por platillo
            const platillosAgrupados = mermaPorPlatillo.reduce((acc, item) => {
                const platilloNombre = item.platillo || 'Platillo desconocido';
                if (!acc[platilloNombre]) {
                    acc[platilloNombre] = {
                        nombre: platilloNombre,
                        ingredientes: [],
                        total: 0
                    };
                }
                acc[platilloNombre].ingredientes.push(item);
                acc[platilloNombre].total += item.subtotal;
                return acc;
            }, {});

            Object.values(platillosAgrupados).forEach(platillo => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFont(undefined, 'bold');
                doc.text(`${platillo.nombre}: $${platillo.total.toFixed(2)}`, 20, y);
                doc.setFont(undefined, 'normal');
                y += 7;

                // Agrupar ingredientes del platillo
                const ingredientesAgrupados = platillo.ingredientes.reduce((acc, ing) => {
                    if (!acc[ing.id]) {
                        acc[ing.id] = {
                            ...ing,
                            count: 1
                        };
                    } else {
                        acc[ing.id].cantidad += ing.cantidad;
                        acc[ing.id].subtotal += ing.subtotal;
                        acc[ing.id].count++;
                    }
                    return acc;
                }, {});

                Object.values(ingredientesAgrupados).forEach(ing => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.text(
                        `  - ${ing.nombre.substring(0, 25)}: ${ing.cantidad.toFixed(2)} x $${ing.precioUnitario.toFixed(2)} = $${ing.subtotal.toFixed(2)}`,
                        25,
                        y
                    );
                    y += 6;
                });

                y += 5;
            });
        } else {
            doc.text('No hubo merma por platillos.', 15, y);
            y += 7;
        }



        doc.save(`reporte_inventario_${fechaInicio.format('YYYYMMDD')}_${fechaFin.format('YYYYMMDD')}.pdf`);
    };

    // Funciones auxiliares corregidas
    const obtenerPlatillo = async (id) => {
        try {
            const platilloRef = doc(db, "menu", id);
            const platilloDoc = await getDoc(platilloRef);
            return platilloDoc.exists() ? platilloDoc.data() : null;
        } catch (error) {
            console.error("Error obteniendo platillo:", error);
            return null;
        }
    };

    const obtenerPrecioUnitario = async (id) => {
        try {
            const ingredienteRef = doc(db, "ingredientes", id);
            const ingredienteDoc = await getDoc(ingredienteRef);
            if (ingredienteDoc.exists()) {
                const data = ingredienteDoc.data();
                // Asume que el costo está por kg y la merma está en gramos
                return (data.costo || 0) / 1000; // Convertir $/kg a $/g
            }
            return 0;
        } catch (error) {
            console.error("Error obteniendo precio unitario:", error);
            return 0;
        }
    };

    // Función para configurar reporte automático (ejemplo)
    const configurarReporteAutomatico = async (config) => {
        try {
            // Guardar configuración en Firestore
            await setDoc(doc(db, 'config_reportes', 'inventario'), {
                activo: true,
                frecuencia: config.frecuencia,
                ultimaEjecucion: new Date(),
                proximaEjecucion: calcularProximaEjecucion(config.frecuencia)
            });

            alert('Configuración de reporte automático guardada');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            alert('Error al guardar configuración');
        }
    };

    // Helper para calcular próxima ejecución
    const calcularProximaEjecucion = (frecuencia) => {
        const ahora = new Date();
        switch (frecuencia) {
            case 'diario':
                return new Date(ahora.setDate(ahora.getDate() + 1));
            case 'semanal':
                return new Date(ahora.setDate(ahora.getDate() + 7));
            case 'mensual':
                return new Date(ahora.setMonth(ahora.getMonth() + 1));
            default:
                return new Date(ahora.setDate(ahora.getDate() + 1));
        }
    };

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarReportes />

            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <h1>Generador de Reportes</h1>

                {/* Sección Reportes de Ventas */}
                <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h2>Reporte de Ventas</h2>

                    <div style={{ marginBottom: '15px' }}>
                        <span style={{ marginRight: '10px' }}>Tipo de reporte:</span>
                        <Select
                            value={tipoReporteVentas}
                            style={{ width: 150 }}
                            onChange={value => {
                                setTipoReporteVentas(value);
                                setFechaInicioPeriodo(dayjs());
                            }}
                        >
                            <Option value="diario">Diario</Option>
                            <Option value="semanal">Semanal</Option>
                            <Option value="mensual">Mensual</Option>
                            <Option value="trimestral">Trimestral</Option>
                            <Option value="anual">Anual</Option>
                            <Option value="personalizado">Personalizado</Option>
                        </Select>

                        {tipoReporteVentas === 'personalizado' ? (
                            <RangePicker
                                style={{ marginLeft: '10px' }}
                                value={fechaPersonalizada}
                                onChange={dates => setFechaPersonalizada(dates)}
                                disabledDate={current => current && current > dayjs().endOf('day')}
                            />
                        ) : tipoReporteVentas !== 'diario' && (
                            <DatePicker
                                style={{ marginLeft: '10px' }}
                                value={fechaInicioPeriodo}
                                onChange={date => setFechaInicioPeriodo(date)}
                                picker={tipoReporteVentas === 'anual' ? 'year' :
                                    tipoReporteVentas === 'trimestral' ? 'quarter' :
                                        tipoReporteVentas === 'mensual' ? 'month' : 'date'}
                            />
                        )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <h4>Opciones de reporte:</h4>
                        <Checkbox.Group
                            value={Object.keys(opcionesVentas).filter(key => opcionesVentas[key])}
                            onChange={checkedValues => {
                                const newOptions = { ...opcionesVentas };
                                Object.keys(newOptions).forEach(key => {
                                    newOptions[key] = checkedValues.includes(key);
                                });
                                setOpcionesVentas(newOptions);
                            }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {Object.entries({
                                    ventasPorCategoria: 'Ventas por categoría',
                                    ventasPorProducto: 'Ventas por producto',
                                    descuentos: 'Total de descuentos',
                                    impactoPromociones: 'Impacto de promociones',
                                    ventasPorDiaSemana: 'Ventas por día de semana'
                                }).map(([key, label]) => (
                                    <Checkbox key={key} value={key}>{label}</Checkbox>
                                ))}
                            </div>
                        </Checkbox.Group>
                    </div>

                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={generarPDFVentas}
                        loading={loading}
                    >
                        Generar Reporte de Ventas
                    </Button>

                </div>

                {/* Sección Reportes de Inventario */}
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h2>Reporte de Inventario</h2>

                    <div style={{ marginBottom: '15px' }}>
                        <span style={{ marginRight: '10px' }}>Tipo de reporte:</span>
                        <RangePicker
                            style={{ marginLeft: '10px' }}
                            value={fechaPersonalizada}
                            onChange={dates => setFechaPersonalizada(dates)}
                            disabledDate={current => current && current > dayjs().endOf('day')}
                        />
                        <Select
                            value={tipoReporteInventario}
                            style={{ width: 150 }}
                            onChange={setTipoReporteInventario}
                        >
                            <Option value="completo">Inventario Completo</Option>
                            <Option value="personalizado">Productos Seleccionados</Option>
                        </Select>

                        {tipoReporteInventario === 'personalizado' && (
                            <Select
                                mode="multiple"
                                style={{ width: '100%', marginTop: '10px' }}
                                placeholder="Seleccione productos"
                                value={productosSeleccionados}
                                onChange={setProductosSeleccionados}
                                optionLabelProp="label"
                                loading={loading}
                            >
                                {todosProductos.map(producto => (
                                    <Option
                                        key={producto.id}
                                        value={producto.id}
                                        label={producto.nombre}
                                    >
                                        {producto.nombre} ({producto.categoria || 'Sin categoría'})
                                    </Option>
                                ))}
                            </Select>
                        )}
                    </div>

                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={generarPDFInventario}
                        loading={loading}
                    >
                        Generar Reporte de Inventario
                    </Button>
                </div>
            </div>

            {/* Modal para configurar reporte automático */}
            <Modal
                title="Configurar Reporte Automático"
                open={modalConfigVisible}
                onOk={configurarReporteAutomatico}
                onCancel={() => setModalConfigVisible(false)}
                width={600}
                confirmLoading={loading}
            >
                <div style={{ marginBottom: '15px' }}>
                    <span style={{ marginRight: '10px' }}>Frecuencia:</span>
                    <Select
                        value={frecuenciaReporte}
                        style={{ width: 150 }}
                        onChange={setFrecuenciaReporte}
                    >
                        <Option value="diaria">Diaria</Option>
                        <Option value="semanal">Semanal</Option>
                        <Option value="mensual">Mensual</Option>
                    </Select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <span style={{ marginRight: '10px' }}>Correos destino:</span>
                    <Input.TextArea
                        rows={3}
                        placeholder="Ingrese correos separados por comas"
                        value={correosDestino}
                        onChange={e => setCorreosDestino(e.target.value)}
                    />
                    <small>Ejemplo: admin@empresa.com, gerente@empresa.com</small>
                </div>

                <div>
                    <h4>Opciones a incluir:</h4>
                    <Checkbox.Group
                        value={Object.keys(configOpciones).filter(key => configOpciones[key])}
                        onChange={checkedValues => {
                            const newOptions = { ...configOpciones };
                            Object.keys(newOptions).forEach(key => {
                                newOptions[key] = checkedValues.includes(key);
                            });
                            setConfigOpciones(newOptions);
                        }}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {Object.entries({
                                ventasPorCategoria: 'Ventas por categoría',
                                ventasPorProducto: 'Ventas por producto',
                                impactoPromociones: 'Impacto de promociones'
                            }).map(([key, label]) => (
                                <Checkbox key={key} value={key}>{label}</Checkbox>
                            ))}
                        </div>
                    </Checkbox.Group>
                </div>
            </Modal>
        </div>
    );
};

export default ReportesAdmin;