import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc
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

        // Inicializar estructuras
        const porCategoria = {};
        const porPlatillo = {};
        const promociones = {};
        const porDiaSemana = {};
        let costoNeto = 0;
        let totalVentas = 0;
        let totalIVA = 0;
        let totalPlatillos = 0;
        let totalPromociones = 0;

        for (const venta of ventasData) {
            const fecha = venta.fecha.toDate ? venta.fecha.toDate() : new Date(venta.fecha);
            const dia = dayjs(fecha).format('dddd');

            venta.pedidos?.forEach(pedido => {
                // Procesar platillos normales
                pedido.platillos?.forEach(plat => {
                    if (!porPlatillo[plat.nombre]) porPlatillo[plat.nombre] = { cantidad: 0, total: 0, costeNeto: 0 };
                    porPlatillo[plat.nombre].cantidad += plat.cantidad;
                    porPlatillo[plat.nombre].total += plat.cantidad * plat.precio;
                    porPlatillo[plat.nombre].costeNeto += plat.cantidad * (plat.costeNeto || 0);

                    if (!porDiaSemana[dia]) porDiaSemana[dia] = { cantidad: 0, total: 0 };
                    porDiaSemana[dia].cantidad += plat.cantidad;
                    porDiaSemana[dia].total += plat.cantidad * plat.precio;

                    totalVentas += plat.cantidad * plat.precio;
                    costoNeto += plat.cantidad * (plat.costeNeto || 0);
                    totalPlatillos += plat.cantidad * plat.precio;
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

        if (opcionesVentas.ventasPorProducto) {
            drawTable('Ventas por Producto',
                Object.entries(porPlatillo).map(([k, v]) => [k, v.cantidad, `$${v.total.toFixed(2)}`]),
                ['Producto', 'Cantidad', 'Total']
            );
        }

        if (opcionesVentas.impactoPromociones && Object.keys(promociones).length > 0) {
            doc.setFontSize(14);
            doc.text('Promociones Usadas', 15, y);
            y += 6;

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Promoción', 15, y);
            doc.text('Veces', 80, y);
            doc.text('Total Ventas', 100, y);
            doc.text('Descuento', 135, y);
            doc.text('Ganancia', 165, y);
            doc.setFont(undefined, 'normal');
            y += 5;

            const lineHeight = 5;
            const maxWidth = 60; // límite de ancho para texto de promociones
            const pageHeight = 290; // Altura aproximada de la página A4 (mm)

            Object.entries(promociones).forEach(([nombre, datos]) => {
                // Ver si hay espacio suficiente en la página, si no, saltar
                if (y + lineHeight > pageHeight) {
                    doc.addPage();
                    y = 20;
                }

                // Dividir texto si es muy largo
                const nombreCortado = doc.splitTextToSize(nombre, maxWidth);
                const lines = nombreCortado.length;
                const altura = lines * lineHeight;

                doc.text(nombreCortado, 15, y);
                doc.text(`${datos.veces}`, 80, y);
                doc.text(`$${datos.totalVenta.toFixed(2)}`, 100, y);
                doc.text(`$${datos.totalDescuento.toFixed(2)}`, 135, y);
                doc.text(`$${(datos.totalVenta - datos.costeNeto).toFixed(2)}`, 165, y);

                y += altura + 1; // Avanza dependiendo del alto del texto
            });

            y += 5;
        }

        if (opcionesVentas.ventasPorDiaSemana) {
            drawTable('Ventas por Día de la Semana',
                Object.entries(porDiaSemana).map(([k, v]) => [k, v.cantidad, `$${v.total.toFixed(2)}`]),
                ['Día', 'Cantidad', 'Total']
            );
        }

        const numTransacciones = ventasData.length;
        totalIVA = totalVentas * 0.16;
        const ventaPromedio = numTransacciones > 0 ? totalVentas / numTransacciones : 0;
        const margenGanancia = totalVentas - costoNeto;

        y += 5;
        doc.setFontSize(12);
        doc.text(`Ventas totales (antes de impuestos): $${totalVentas.toFixed(2)}`, 15, y);
        y += 10;
        doc.text(`  - Por platillos: $${totalPlatillos.toFixed(2)}`, 30, y);
        y += 10;
        doc.text(`  - Por promociones: $${totalPromociones.toFixed(2)}`, 30, y);
        y += 10;
        doc.text(`Coste total: $${costoNeto.toFixed(2)}`, 15, y);
        y += 10;
        doc.text(`Impuestos recaudados (IVA 16%): $${totalIVA.toFixed(2)}`, 15, y);
        y += 10;
        doc.text(`Número de transacciones: ${numTransacciones}`, 15, y);
        y += 10;
        doc.text(`Venta promedio por transacción: $${ventaPromedio.toFixed(2)}`, 15, y);
        y += 10;
        doc.text(`Margen de ganancia: $${margenGanancia.toFixed(2)} (${(margenGanancia / totalVentas * 100).toFixed(2)}%)`, 15, y);

        doc.save(`reporte_ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const generarPDFInventario = async () => {
        setLoading(true);
        try {
            const doc = new jsPDF();
            const fechaActual = new Date();

            // Obtener productos actuales
            const productosRef = collection(db, 'products');
            const productosSnapshot = await getDocs(productosRef);
            const todosProductos = productosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Obtener copia inicial del día
            const hoyInicio = dayjs().startOf('day').toDate();
            const hoyFin = dayjs().endOf('day').toDate();

            const q = query(
                collection(db, 'historial_inventario'),(
                where('tipo', '==', 'copia_inicial'),
                where('fechaRegistro', '>=', hoyInicio),
                where('fechaRegistro', '<=', hoyFin))
            );

            const snapshot = await getDocs(q);
            const inventarioInicial = snapshot.empty ? [] : snapshot.docs[0].data().datos;

            // Configuración del documento
            doc.setFontSize(18);
            doc.text('Reporte Detallado de Inventario', 105, 15, { align: 'center' });

            // Información del reporte
            doc.setFontSize(10);
            doc.text(`Fecha y hora de generación: ${dayjs(fechaActual).format('DD/MM/YYYY HH:mm:ss')}`, 14, 25);
            doc.text(`Periodo del reporte: ${dayjs(hoyInicio).format('DD/MM/YYYY HH:mm')} - ${dayjs(hoyFin).format('DD/MM/YYYY HH:mm')}`, 14, 30);

            // Preparar datos para la tabla
            const tableData = todosProductos.map(producto => {
                const productoInicial = inventarioInicial.find(p => p.id === producto.id) || {};
                const merma = (productoInicial.stock || 0) - (producto.stock || 0);

                return {
                    id: producto.id,
                    nombre: producto.nombre,
                    stockInicial: productoInicial.stock ?? 'N/A',
                    stockFinal: producto.stock,
                    merma: merma >= 0 ? merma : 'N/A',
                    categoria: producto.categoria || 'Sin categoría'
                };
            });

            // Generar tabla con autoTable
            doc.autoTable({
                startY: 40,
                head: [
                    ['ID', 'Producto', 'Stock Inicial', 'Stock Final', 'Merma', 'Categoría']
                ],
                body: tableData.map(item => [
                    item.id,
                    item.nombre,
                    item.stockInicial,
                    item.stockFinal,
                    item.merma,
                    item.categoria
                ]),
                margin: { top: 40 },
                styles: { fontSize: 8 },
                headStyles: { fillColor: [52, 152, 219] }
            });

            // Calcular merma total
            const mermaTotal = tableData.reduce((total, item) => {
                return total + (typeof item.merma === 'number' ? item.merma : 0);
            }, 0);

            // Obtener posición Y final después de la tabla
            let finalY = doc.lastAutoTable.finalY || 70;

            // Agregar resumen de merma
            doc.setFontSize(10);
            doc.text(`Merma total del periodo: ${mermaTotal} unidades`, 14, finalY + 10);

            // Top 10 productos con mayor rotación
            const productosConRotacion = tableData
                .filter(item => typeof item.merma === 'number' && item.merma > 0)
                .sort((a, b) => b.merma - a.merma)
                .slice(0, 10);

            if (productosConRotacion.length > 0) {
                finalY += 20;
                doc.setFontSize(12);
                doc.text('Top 10 Productos con Mayor Rotación', 105, finalY, { align: 'center' });

                // Configurar gráfico de barras
                const maxRotacion = Math.max(...productosConRotacion.map(p => p.merma));
                const startX = 40;
                const startY = finalY + 10;
                const barHeight = 6;
                const spacing = 8;

                productosConRotacion.forEach((producto, index) => {
                    const barWidth = (producto.merma / maxRotacion) * 100;
                    const yPos = startY + (index * spacing);

                    // Barra
                    doc.setFillColor(52, 152, 219);
                    doc.rect(startX, yPos, barWidth, barHeight, 'F');

                    // Texto
                    doc.setFontSize(8);
                    doc.setTextColor(0);
                    doc.text(producto.nombre.substring(0, 30), 10, yPos + 4);
                    doc.text(producto.merma.toString(), startX + barWidth + 5, yPos + 4);
                });
            }

            // Guardar PDF
            doc.save(`reporte_inventario_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);

        } catch (error) {
            console.error('Error al generar reporte de inventario:', error);
            alert('Error al generar el reporte: ' + error.message);
        } finally {
            setLoading(false);
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
    
                    <Button
                        style={{ marginLeft: '10px' }}
                        icon={<SettingOutlined />}
                        onClick={() => setModalConfigVisible(true)}
                    >
                        Configurar Automático
                    </Button>
                </div>
    
                {/* Sección Reportes de Inventario */}
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h2>Reporte de Inventario</h2>
    
                    <div style={{ marginBottom: '15px' }}>
                        <span style={{ marginRight: '10px' }}>Tipo de reporte:</span>
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