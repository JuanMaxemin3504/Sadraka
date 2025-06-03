import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Select, DatePicker, Checkbox, Input, Modal, Table } from 'antd';
import { DownloadOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import NavBarReportes from '../NavBars/NavBarReportes';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportesAdmin = () => {
    // Estados para reportes de ventas
    const [tipoReporteVentas, setTipoReporteVentas] = useState('diario');
    const [fechaPersonalizada, setFechaPersonalizada] = useState([]);
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

        // Título
        doc.setFontSize(18);
        doc.text(`Reporte de Ventas ${tipoReporteVentas.toUpperCase()}`, 105, 15, { align: 'center' });

        // Periodo
        doc.setFontSize(12);
        let periodoTexto = '';
        const hoy = new Date();

        switch (tipoReporteVentas) {
            case 'diario':
                periodoTexto = hoy.toLocaleDateString();
                break;
            case 'semanal':
                // Lógica para calcular semana
                break;
            case 'personalizado':
                periodoTexto = `${fechaPersonalizada[0].toLocaleDateString()} - ${fechaPersonalizada[1].toLocaleDateString()}`;
                break;
            default:
                periodoTexto = hoy.toLocaleDateString();
        }

        doc.text(`Periodo: ${periodoTexto}`, 105, 25, { align: 'center' });

        // Obtener datos de Firestore
        const ventasRef = collection(db, 'ventas');
        let q;

        if (tipoReporteVentas === 'personalizado' && fechaPersonalizada.length === 2) {
            q = query(ventasRef,
                where('fecha', '>=', fechaPersonalizada[0]),
                where('fecha', '<=', fechaPersonalizada[1])
            );
        } else {
            // Lógica para otros tipos de reporte
            q = query(ventasRef);
        }

        const querySnapshot = await getDocs(q);
        const ventasData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Generar tablas según opciones seleccionadas
        if (opcionesVentas.ventasPorCategoria) {
            // Lógica para ventas por categoría
            doc.text('Ventas por Categoría', 15, 40);
            // ... agregar tabla con doc.autoTable()
        }

        if (opcionesVentas.ventasPorProducto) {
            // Lógica para ventas por producto
            doc.text('Ventas por Producto', 15, doc.lastAutoTable.finalY + 20);
            // ... agregar tabla con doc.autoTable()
        }

        // Guardar PDF
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
                        onChange={setTipoReporteVentas}
                    >
                        <Option value="diario">Diario</Option>
                        <Option value="semanal">Semanal</Option>
                        <Option value="mensual">Mensual</Option>
                        <Option value="trimestral">Trimestral</Option>
                        <Option value="anual">Anual</Option>
                        <Option value="personalizado">Personalizado</Option>
                    </Select>

                    {tipoReporteVentas === 'personalizado' && (
                        <RangePicker
                            style={{ marginLeft: '10px' }}
                            onChange={dates => setFechaPersonalizada(dates)}
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
                        checked={opcionesVentas.metodosPago}
                        onChange={e => setOpcionesVentas({ ...opcionesVentas, metodosPago: e.target.checked })}
                    >
                        Métodos de pago
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
                visible={modalConfigVisible}
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