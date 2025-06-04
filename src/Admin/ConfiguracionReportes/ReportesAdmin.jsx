import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Select, DatePicker, Checkbox, Input, Modal, Table } from 'antd';
import { DownloadOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import NavBarReportes from '../NavBars/NavBarReportes';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(quarterOfYear);

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportesAdmin = () => {
    // Estados para reportes de ventas
    const [tipoReporteVentas, setTipoReporteVentas] = useState('diario');
    const [fechaPersonalizada, setFechaPersonalizada] = useState([]);
    const [fechaInicioPeriodo, setFechaInicioPeriodo] = useState(dayjs());
    const [opcionesVentas, setOpcionesVentas] = useState({
        ventasPorCategoria: true,
        ventasPorProducto: true,
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

    // Generar PDF de inventario
    const generarPDFInventario = async () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Reporte de Inventario', 105, 15, { align: 'center' });

        let productosReporte = [];
        if (tipoReporteInventario === 'completo') {
            productosReporte = todosProductos;
        } else {
            productosReporte = todosProductos.filter(p => productosSeleccionados.includes(p.id));
        }

        // Tabla de inventario
        doc.autoTable({
            startY: 25,
            head: [['ID', 'Nombre', 'Categoría', 'Stock', 'Precio']],
            body: productosReporte.map(p => [p.id, p.nombre, p.categoria, p.stock, `$${p.precio}`])
        });

        doc.save(`reporte_inventario_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // Configurar reporte automático
    const configurarReporteAutomatico = () => {
        // Lógica para guardar configuración en Firestore
        setModalConfigVisible(false);
    };

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarReportes />

            <h1>Generador de Reportes</h1>

            {/* Sección Reportes de Ventas */}
            <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h2>Reporte de Ventas</h2>

                <div style={{ marginBottom: '15px' }}>
                    <span style={{ marginRight: '10px' }}>Tipo de reporte:</span>
                    <Select
                        defaultValue="diario"
                        style={{ width: 150 }}
                        onChange={value => {
                            setTipoReporteVentas(value);
                            // Resetear fecha de inicio al cambiar tipo
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
                            onChange={dates => setFechaPersonalizada(dates)}
                        />
                    ) : tipoReporteVentas !== 'diario' && (
                        <DatePicker
                            style={{ marginLeft: '10px' }}
                            value={fechaInicioPeriodo}
                            onChange={date => setFechaInicioPeriodo(date)}
                            picker={tipoReporteVentas === 'anual' ? 'year' : 'date'}
                        />
                    )}
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <h4>Opciones de reporte:</h4>
                    <Checkbox
                        checked={opcionesVentas.ventasPorCategoria}
                        onChange={e => setOpcionesVentas({ ...opcionesVentas, ventasPorCategoria: e.target.checked })}
                    >
                        Ventas por categoría
                    </Checkbox>
                    <Checkbox
                        checked={opcionesVentas.ventasPorProducto}
                        onChange={e => setOpcionesVentas({ ...opcionesVentas, ventasPorProducto: e.target.checked })}
                    >
                        Ventas por producto
                    </Checkbox>
                    <Checkbox
                        checked={opcionesVentas.descuentos}
                        onChange={e => setOpcionesVentas({ ...opcionesVentas, descuentos: e.target.checked })}
                    >
                        Total de descuentos
                    </Checkbox>
                    <Checkbox
                        checked={opcionesVentas.impactoPromociones}
                        onChange={e => setOpcionesVentas({ ...opcionesVentas, impactoPromociones: e.target.checked })}
                    >
                        Impacto de promociones
                    </Checkbox>
                    <Checkbox
                        checked={opcionesVentas.ventasPorDiaSemana}
                        onChange={e => setOpcionesVentas({ ...opcionesVentas, ventasPorDiaSemana: e.target.checked })}
                    >
                        Ventas por día de semana
                    </Checkbox>
                </div>

                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={generarPDFVentas}
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
                        defaultValue="completo"
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
                            onChange={setProductosSeleccionados}
                            optionLabelProp="label"
                        >
                            {todosProductos.map(producto => (
                                <Option key={producto.id} value={producto.id} label={producto.nombre}>
                                    {producto.nombre} ({producto.categoria})
                                </Option>
                            ))}
                        </Select>
                    )}
                </div>

                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={generarPDFInventario}
                >
                    Generar Reporte de Inventario
                </Button>
            </div>

            {/* Modal para configurar reporte automático */}
            <Modal
                title="Configurar Reporte Automático"
                open={modalConfigVisible}
                onOk={configurarReporteAutomatico}
                onCancel={() => setModalConfigVisible(false)}
                width={600}
            >
                <div style={{ marginBottom: '15px' }}>
                    <span style={{ marginRight: '10px' }}>Frecuencia:</span>
                    <Select
                        defaultValue="semanal"
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
                    <Input
                        style={{ width: '100%' }}
                        placeholder="email1@ejemplo.com, email2@ejemplo.com"
                        value={correosDestino}
                        onChange={e => setCorreosDestino(e.target.value)}
                    />
                </div>

                <div>
                    <h4>Opciones a incluir:</h4>
                    <Checkbox
                        checked={configOpciones.ventasPorCategoria}
                        onChange={e => setConfigOpciones({ ...configOpciones, ventasPorCategoria: e.target.checked })}
                    >
                        Ventas por categoría
                    </Checkbox>
                    <Checkbox
                        checked={configOpciones.ventasPorProducto}
                        onChange={e => setConfigOpciones({ ...configOpciones, ventasPorProducto: e.target.checked })}
                    >
                        Ventas por producto
                    </Checkbox>
                    {/* Agregar más opciones según sea necesario */}
                </div>
            </Modal>
        </div>
    );
};

export default ReportesAdmin;