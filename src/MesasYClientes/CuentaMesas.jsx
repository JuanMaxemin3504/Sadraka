import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Button, Table, Modal, message } from 'antd';
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros';
import '@ant-design/v5-patch-for-react-19';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // ← esta línea importa la extensión y la registra automáticamente
import { PrecisionManufacturing } from '@mui/icons-material';

const CuentaMesas = () => {
  const [pedidosTerminados, setPedidosTerminados] = useState([]);
  const [mesasConPedidos, setMesasConPedidos] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [detalleMesa, setDetalleMesa] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const cargarPedidosTerminados = async () => {
      try {
        const pedidosRef = collection(db, "ordenes");
        const q = query(pedidosRef, where("estado", "==", "completado"));
        const querySnapshot = await getDocs(q);

        const pedidosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPedidosTerminados(pedidosData);

        const mesasUnicas = [...new Set(pedidosData.map(pedido => pedido.mesaId))];
        setMesasConPedidos(mesasUnicas);
      } catch (error) {
        console.error("Error cargando pedidos:", error);
        message.error("Error al cargar pedidos terminados");
      }
    };

    cargarPedidosTerminados();
  }, []);

  const cargarDetalleMesa = async (mesaId) => {
    const pedidosMesa = pedidosTerminados.filter(pedido => pedido.mesaId === mesaId);
    total = 0;
    setDetalleMesa(pedidosMesa);
    setSelectedMesa(mesaId);
    setModalVisible(true);
  };

  const generarPDF = () => {
    const doc = new jsPDF();

    // Configuración inicial
    const margenIzquierdo = 15;
    const anchoPagina = doc.internal.pageSize.getWidth();
    let y = 20;

    // Estilo para el encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ticket de Venta - Mesa ${selectedMesa}`, anchoPagina / 2, y, { align: 'center' });
    y += 10;

    // Fecha
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleString()}`, margenIzquierdo, y);
    y += 15;

    // Línea divisoria
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margenIzquierdo, y, anchoPagina - margenIzquierdo, y);
    y += 10;

    // Platillos
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PLATILLOS:', margenIzquierdo, y);
    y += 8;

    // Tabla de platillos
    let subtotalPlatillos = 0;
    detalleMesa.forEach(pedido => {
      pedido.platillos?.forEach(platillo => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        // Nombre y cantidad
        doc.text(`${platillo.cantidad}x ${platillo.nombre}`, margenIzquierdo, y);

        // Precio alineado a la derecha
        const precio = platillo.precio?.toFixed(2) || '0.00';
        const precioWidth = doc.getTextWidth(`$${precio}`);
        doc.text(`$${precio}`, anchoPagina - margenIzquierdo - precioWidth, y);

        subtotalPlatillos += platillo.precio || 0;
        y += 8;
      });
    });

    y += 5;

    // Promociones
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROMOCIONES:', margenIzquierdo, y);
    y += 8;

    // Tabla de promociones
    let subtotalPromociones = 0;
    detalleMesa.forEach(pedido => {
      pedido.promociones?.forEach(promo => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        // Nombre de la promoción
        doc.text(promo.nombre, margenIzquierdo, y);

        // Precio de la promoción alineado a la derecha
        const precioPromo = promo.precio?.toFixed(2) || '0.00';
        const precioPromoWidth = doc.getTextWidth(`$${precioPromo}`);
        doc.text(`$${precioPromo}`, anchoPagina - margenIzquierdo - precioPromoWidth, y);

        subtotalPromociones += promo.precio || 0;
        y += 8;

        // Detalle de platillos incluidos en la promoción
        doc.setFontSize(10);
        promo.platillos?.forEach(platillo => {
          doc.text(`   • ${platillo.cantidad || 1}x ${platillo.nombre}`, margenIzquierdo + 5, y);
          y += 6;
        });
        y += 4;
      });
    });

    // Línea divisoria antes del total
    y += 10;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margenIzquierdo, y, anchoPagina - margenIzquierdo, y);
    y += 15;

    // Total
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const total = (subtotalPlatillos + subtotalPromociones).toFixed(2);
    const totalText = `TOTAL: $${total}`;
    const totalWidth = doc.getTextWidth(totalText);
    doc.text(totalText, anchoPagina - margenIzquierdo - totalWidth, y);

    // Pie de página
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('¡Gracias por su preferencia!', anchoPagina / 2, y, { align: 'center' });

    // Guardar el PDF
    doc.save(`Ticket_Mesa_${selectedMesa}.pdf`);
  };

  const cerrarCuenta = async () => {
    try {
      generarPDF();

      const pedidosRef = collection(db, "ordenes");
      const q = query(
        pedidosRef,
        where("mesaId", "==", selectedMesa),
        where("estado", "==", "completado")
      );
      const querySnapshot = await getDocs(q);

      const ventasData = {
        mesaId: selectedMesa,
        fecha: serverTimestamp(),
        pedidos: [],
        total: 0
      };

      const batch = [];
      querySnapshot.forEach(docSnapshot => {
        const pedido = docSnapshot.data();
        ventasData.pedidos.push({
          platillos: pedido.platillos || [],
          promociones: pedido.promociones || [],
          total: pedido.total || 0
        });
        ventasData.total += pedido.total || 0;

        batch.push(deleteDoc(docSnapshot.ref));
      });

      await addDoc(collection(db, "ventas"), ventasData);
      await Promise.all(batch);

      setPedidosTerminados(prev => prev.filter(p => p.mesaId !== selectedMesa));
      setMesasConPedidos(prev => prev.filter(m => m !== selectedMesa));

      message.success(`Cuenta de mesa ${selectedMesa} cerrada correctamente`);
      setModalVisible(false);
    } catch (error) {
      console.error("Error cerrando cuenta:", error);
      message.error("Error al cerrar la cuenta");
    }
  };

  const columnsMesas = [
    {
      title: 'Mesa',
      dataIndex: 'mesa',
      key: 'mesa',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Button type="primary" onClick={() => cargarDetalleMesa(record.mesa)}>
          Ver Detalle
        </Button>
      ),
    },
  ];

  const columnsDetalle = [
    {
      title: 'Platillo',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      render: (precio) => `$${precio.toFixed(2)}`,
    },
  ];

  const columnsDetallePromo = [
    {
      title: 'Promoción',
      dataIndex: 'nombrePromo',
      key: 'nombrePromo',
    },
    {
      title: 'Platillo',
      dataIndex: 'nombrePlatillo',
      key: 'nombrePlatillo',
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
    },
    {
      title: 'Precio Promo',
      dataIndex: 'precioPromo',
      key: 'precioPromo',
      render: (precio) => `$${precio?.toFixed(2) || '0.00'}`,
    },
  ];

  let total = 0;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMeseros />
      <h1>Cierre de Cuentas</h1>

      <Table
        columns={columnsMesas}
        dataSource={mesasConPedidos.map(mesa => ({ mesa, key: mesa }))}
        rowKey="mesa"
      />

      <Modal
        title={`Detalle de Mesa ${selectedMesa}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button
            key="cerrar"
            type="primary"
            onClick={() =>
              Modal.confirm({
                title: `¿Cerrar cuenta de mesa ${selectedMesa}?`,
                content: 'Esto eliminará los pedidos completados y los pasará a ventas.',
                onOk: cerrarCuenta
              })
            }
          >
            Cerrar Cuenta
          </Button>,
        ]}
        width={800}
      >
        <h2>Ticket de Venta - Mesa {selectedMesa}</h2>
        <p>Fecha: {new Date().toLocaleString()}</p>

        <h3>Platillos:</h3>
        <Table
          columns={columnsDetalle}
          dataSource={detalleMesa.flatMap((pedido, index) =>
            pedido.platillos?.map(platillo => (
              total += platillo.precio,
              {
                key: `${pedido.id}-platillo-${platillo.idPlatillo || index}`,
                nombre: platillo.nombre,
                cantidad: platillo.cantidad,
                precio: platillo.precio,
              })) || []
          )}
          pagination={false}
        />

        <h3>Promociones:</h3>
        <Table
          columns={columnsDetallePromo}
          dataSource={detalleMesa.flatMap((pedido) =>
            pedido.promociones?.map((promo) => (
              total += promo.precio,
              {
                key: `promo-${pedido.id}-${promo.id || Math.random().toString(36).substr(2, 9)}`,
                nombrePromo: promo.nombre,
                nombrePlatillo: promo.platillos?.map(p => p.nombre).join(', ') || '',
                cantidad: promo.platillos?.reduce((sum, p) => sum + (p.cantidad || 1), 0) || 0,
                precioPromo: promo.precio,

              })) || []
          )}
          pagination={false}
        />

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <h3 className="total">
            Total: ${total}
          </h3>
        </div>
      </Modal>
    </div>
  );
};

export default CuentaMesas;
