import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useReactToPrint } from 'react-to-print';
import { Button, Table, Modal, message } from 'antd';
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros';

const CuentaMesas = () => {
  const [pedidosTerminados, setPedidosTerminados] = useState([]);
  const [mesasConPedidos, setMesasConPedidos] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [detalleMesa, setDetalleMesa] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const ticketRef = React.useRef();

  // Cargar pedidos terminados
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

        // Extraer mesas únicas
        const mesasUnicas = [...new Set(pedidosData.map(pedido => pedido.mesaId))];
        setMesasConPedidos(mesasUnicas);
      } catch (error) {
        console.error("Error cargando pedidos:", error);
        message.error("Error al cargar pedidos terminados");
      }
    };

    cargarPedidosTerminados();
  }, []);

  // Cargar detalle de una mesa específica
  const cargarDetalleMesa = async (mesaId) => {
    const pedidosMesa = pedidosTerminados.filter(pedido => pedido.mesaId === mesaId);
    setDetalleMesa(pedidosMesa);
    setSelectedMesa(mesaId);
    setModalVisible(true);
  };

  // Cerrar cuenta y mover a ventas
  const cerrarCuenta = async () => {
    try {
      // 1. Obtener todos los pedidos de la mesa
      const pedidosRef = collection(db, "ordenes");
      const q = query(pedidosRef, where("mesaId", "==", selectedMesa));
      const querySnapshot = await getDocs(q);

      // 2. Preparar datos para ventas
      const ventasData = {
        mesaId: selectedMesa,
        fecha: serverTimestamp(),
        pedidos: [],
        total: 0
      };

      // 3. Procesar cada pedido
      const batch = [];
      querySnapshot.forEach(doc => {
        const pedido = doc.data();
        ventasData.pedidos.push({
          platillos: pedido.platillos || [],
          promociones: pedido.promociones || [],
          total: pedido.total || 0
        });
        ventasData.total += pedido.total || 0;

        // Agregar a batch para eliminar
        batch.push(deleteDoc(doc.ref));
      });

      // 4. Guardar en ventas
      await addDoc(collection(db, "ventas"), ventasData);

      // 5. Eliminar pedidos
      await Promise.all(batch);

      // Actualizar estado
      setPedidosTerminados(prev => prev.filter(p => p.mesaId !== selectedMesa));
      setMesasConPedidos(prev => prev.filter(m => m !== selectedMesa));

      message.success(`Cuenta de mesa ${selectedMesa} cerrada correctamente`);
      setModalVisible(false);
    } catch (error) {
      console.error("Error cerrando cuenta:", error);
      message.error("Error al cerrar la cuenta");
    }
  };

  // Generar ticket
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    pageStyle: `
      @media print {
        body { font-family: Arial; padding: 20px; }
        h2 { color: #333; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .total { font-weight: bold; }
      }
    `
  });

  // Columnas para la tabla de mesas
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

  // Columnas para el detalle de pedidos
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
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="print" onClick={handlePrint}>Imprimir Ticket</Button>,
          <Button key="close" type="primary" onClick={cerrarCuenta}>Cerrar Cuenta</Button>,
        ]}
        width={800}
      >
        <div ref={ticketRef}>
          <h2>Ticket de Venta - Mesa {selectedMesa}</h2>
          <p>Fecha: {new Date().toLocaleString()}</p>

          <h3>Platillos:</h3>
          <Table
            columns={columnsDetalle}
            dataSource={detalleMesa.flatMap(pedido =>
              pedido.platillos?.map(platillo => ({
                key: `${pedido.id}-${platillo.idPlatillo}`,
                nombre: platillo.nombre,
                cantidad: platillo.cantidad,
                precio: platillo.precio,
              })) || []
            )}
            pagination={false}
          />

          <h3>Promociones:</h3>
          <Table
            columns={columnsDetalle}
            dataSource={detalleMesa.flatMap(pedido =>
              pedido.promociones?.flatMap(promo =>
                promo.platillos?.map(platillo => ({
                  key: `${pedido.id}-${promo.id}-${platillo.idPlatillo}`,
                  nombre: `${promo.nombre} - ${platillo.nombre}`,
                  cantidad: platillo.cantidad,
                  precio: platillo.precio,
                })) || []
              ) || []
            )}
            pagination={false}
          />

          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <h3 className="total">
              Total: ${detalleMesa.reduce((sum, pedido) => sum + (pedido.total || 0), 0).toFixed(2)}
            </h3>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CuentaMesas;
