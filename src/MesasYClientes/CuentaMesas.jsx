import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button, Table, Modal, message, Input } from 'antd';
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros';
import '@ant-design/v5-patch-for-react-19';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // ← esta línea importa la extensión y la registra automáticamente
import { ValidacionIngredientesPlatillos } from '../ValidacionesPlatillosEstatus/ValidacionIngredientesPlatillos';

const CuentaMesas = () => {
  const [pedidosTerminados, setPedidosTerminados] = useState([]);
  const [mesasConPedidos, setMesasConPedidos] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [detalleMesa, setDetalleMesa] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [codigoModalVisible, setCodigoModalVisible] = useState(false);
  const [nombresMesas, setNombresMesas] = useState({});
  const [codigo, setCodigo] = useState('');
  const [codigoCorrecto, setCodigoCorrecto] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar nombres de las mesas
        const mesasRef = collection(db, "mesas");
        const mesasSnapshot = await getDocs(mesasRef);
        const nombres = {};
        mesasSnapshot.forEach(doc => {
          nombres[doc.id] = doc.data().nombre || `Mesa ${doc.id}`;
        });
        setNombresMesas(nombres);

        // Cargar pedidos terminados
        const pedidosRef = collection(db, "ordenes");
        const q = query(pedidosRef, where("estado", "==", "completado"));
        const querySnapshot = await getDocs(q);

        const pedidosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPedidosTerminados(pedidosData);

        // Obtener IDs únicos de mesas con pedidos
        const mesasUnicas = [...new Set(pedidosData.map(pedido => pedido.mesaId))];
        setMesasConPedidos(mesasUnicas);
      } catch (error) {
        console.error("Error cargando datos:", error);
        message.error("Error al cargar datos");
      }
    };

    cargarDatos();
  }, []);

  const cargarDetalleMesa = async (mesaId) => {
    const pedidosMesa = pedidosTerminados.filter(pedido => pedido.mesaId === mesaId);
    setDetalleMesa(pedidosMesa);
    setSelectedMesa(mesaId);
    setModalVisible(true);
    try {
      const mesaRef = doc(db, "ordenes", mesaId); // Cambiado de mesa a mesaId
      const mesaDoc = await getDoc(mesaRef);
      const mesaData = mesaDoc.data();
      setCodigoCorrecto(mesaData.codigoPedido);
    } catch (error) { // Añadido parámetro error
      console.error(error);
    }
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
    doc.text(`Ticket de Venta - ${nombresMesas[selectedMesa] || `Mesa ${selectedMesa}`}`, anchoPagina / 2, y, { align: 'center' });
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
    doc.save(`Ticket_${nombresMesas[selectedMesa] || `Mesa_${selectedMesa}`}.pdf`);
  };

  const verificarCodigo = async () => {
    if (codigo.length !== 4 || !/^\d+$/.test(codigo)) {
      message.warning('El código debe ser de 4 dígitos numéricos');
      return false;
    }
    return codigo === codigoCorrecto;
  };

  const handleCerrarConCodigo = async () => {
    if (!verificarCodigo()) {
      message.error('Código incorrecto');
      return;
    }
    setCodigoModalVisible(false);
    await procesarCierreCuenta();
  };

  const cerrarCuenta = async () => {
    // Verificar si algún pedido es para llevar
    const tienePedidosParaLlevar = detalleMesa.some(pedido => pedido.llevar);
    if (tienePedidosParaLlevar) {
      setCodigoModalVisible(true);
    } else {
      Modal.confirm({
        title: `¿Cerrar cuenta de ${nombresMesas[selectedMesa] || `Mesa ${selectedMesa}`}?`,
        content: 'Esto eliminará los pedidos completados y los pasará a ventas.',
        onOk: procesarCierreCuenta
      });
    }
  };

  const procesarCierreCuenta = async () => {
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
        nombreMesa: nombresMesas[selectedMesa] || `Mesa ${selectedMesa}`,
        fecha: serverTimestamp(),
        pedidos: [],
        total: 0,
        paraLlevar: detalleMesa.some(pedido => pedido.llevar)
      };

      const batch = [];
      querySnapshot.forEach(docSnapshot => {
        const pedido = docSnapshot.data();
        ventasData.pedidos.push({
          platillos: pedido.platillos || [],
          promociones: pedido.promociones || [],
          total: pedido.total || 0,
          llevar: pedido.llevar || false
        });
        ventasData.total += pedido.total || 0;
  
        batch.push(deleteDoc(docSnapshot.ref));
      });
    
      // Calcular y restar ingredientes del inventario
      const ingredientesTotales = {};
  
      // Procesar platillos normales
      for (const pedido of ventasData.pedidos) {
        // Platillos individuales
        for (const platillo of pedido.platillos) {
          const platilloRef = doc(db, "menu", platillo.idPlatillo);
          const platilloSnap = await getDoc(platilloRef);
  
          if (!platilloSnap.exists()) continue;
  
          const dataPlatillo = platilloSnap.data();
          const cantidadPedida = platillo.cantidad || 1;
  
          if (dataPlatillo.ingredientes && Array.isArray(dataPlatillo.ingredientes)) {
            for (const ingrediente of dataPlatillo.ingredientes) {
              const ingredienteId = ingrediente.id;
              const cantidadNecesaria = ingrediente.cantidad * cantidadPedida;
  
              if (!ingredientesTotales[ingredienteId]) {
                ingredientesTotales[ingredienteId] = 0;
              }
  
              ingredientesTotales[ingredienteId] += cantidadNecesaria;
            }
          }
        }
  
        // Platillos dentro de promociones
        for (const promo of pedido.promociones) {
          for (const platillo of promo.platillos || []) {
            const platilloRef = doc(db, "menu", platillo.idPlatillo);
            const platilloSnap = await getDoc(platilloRef);
  
            if (!platilloSnap.exists()) continue;
  
            const dataPlatillo = platilloSnap.data();
            const cantidadPedida = platillo.cantidad || 1;
  
            if (dataPlatillo.ingredientes && Array.isArray(dataPlatillo.ingredientes)) {
              for (const ingrediente of dataPlatillo.ingredientes) {
                const ingredienteId = ingrediente.id;
                const cantidadNecesaria = ingrediente.cantidad * cantidadPedida;
  
                if (!ingredientesTotales[ingredienteId]) {
                  ingredientesTotales[ingredienteId] = 0;
                }
  
                ingredientesTotales[ingredienteId] += cantidadNecesaria;
              }
            }
          }
        }
      }
  
      // Actualizar inventario
      const batchInventario = writeBatch(db);
  
      for (const [ingredienteId, cantidadADescontar] of Object.entries(ingredientesTotales)) {
        const refIngrediente = doc(db, "products", ingredienteId);
        const snapIngrediente = await getDoc(refIngrediente);
  
        if (snapIngrediente.exists()) {
          const stockActual = snapIngrediente.data().cantidad || 0;
          let cantidadADescontarReal = cantidadADescontar;
          if(snapIngrediente.data().ingreso == "KG"){
            cantidadADescontarReal = cantidadADescontarReal/1000;
          }
          ValidacionIngredientesPlatillos(ingredienteId);
          const nuevoStock = stockActual - cantidadADescontarReal;
                    
          batchInventario.update(refIngrediente, { cantidad: nuevoStock });
        }
      }
  
      await batchInventario.commit();
      
      // Guardar venta y eliminar pedidos completados
      await addDoc(collection(db, "ventas"), ventasData);
      await Promise.all(batch);
  
      setPedidosTerminados(prev => prev.filter(p => p.mesaId !== selectedMesa));
      setMesasConPedidos(prev => prev.filter(m => m !== selectedMesa));
  
      message.success(`Cuenta de ${nombresMesas[selectedMesa] || `Mesa ${selectedMesa}`} cerrada correctamente`);
      setModalVisible(false);
      setCodigo('');
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
      render: (mesaId) => nombresMesas[mesaId] || `Mesa ${mesaId}`, // Mostrar nombre de la mesa
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
        title={`Detalle de ${nombresMesas[selectedMesa] || `Mesa ${selectedMesa}`}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button
            key="cerrar"
            type="primary"
            onClick={() =>
              Modal.confirm({
                title: `¿Cerrar cuenta de ${nombresMesas[selectedMesa] || `Mesa ${selectedMesa}`}?`,
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

      <Modal
        title="Verificación para pedidos para llevar"
        open={codigoModalVisible}
        onOk={handleCerrarConCodigo}
        onCancel={() => {
          setCodigoModalVisible(false);
          setCodigo('');
        }}
        okText="Confirmar"
        cancelText="Cancelar"
      >
        <p>Ingrese el código de 4 dígitos para confirmar el cierre:</p>
        <Input
          placeholder="Código de 4 dígitos"
          maxLength={4}
          value={codigo}
          onChange={(e) => {
            // Solo permitir números
            const value = e.target.value.replace(/\D/g, '');
            setCodigo(value);
          }}
          style={{ marginTop: '10px' }}
        />
      </Modal>

    </div>
  );
};

export default CuentaMesas;
