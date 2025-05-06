import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from 'react-router-dom';

function CocinaPrincipal() {
  const [pedidos, setPedidos] = useState([]);
  const { idCocina } = useParams();
  const [nombreCocina, setNombreCocina] = useState("")

  const cargarPermisos = async () => {
    console.log(idCocina);
    try {
      const cocinaRef = doc(db, "users", idCocina);
      const cocinaDoc = await getDoc(cocinaRef);
      setNombreCocina(cocinaDoc.data().username);

      if (cocinaDoc.exists()) {
        console.log(cocinaDoc.data().permisos);
        const permisosIds = cocinaDoc.data().permisos.map(permiso => permiso.id);
        return (permisosIds)
      } else {
        console.log("No se encontró el documento de la cocina");
        return ([])
      }
    } catch (err) {
      console.error("Error cargando permisos:", err);
      setError("Error al cargar los permisos");
    }
  };

  const cargarPedidos = async (permisos) => {
    try {
      const pedidosRef = collection(db, "ordenes");
      const q = query(pedidosRef, where("estado", "==", "pendiente"));
      const querySnapshot = await getDocs(q);

      const pedidosFiltrados = [];

      querySnapshot.forEach((doc) => {
        const pedido = { id: doc.id, ...doc.data() };

        // Filtrar platillos que esta cocina puede ver
        const platillosFiltrados = pedido.platillos.filter(platillo =>
          permisos.includes(platillo.idPlatillo)
        )

        // Verificar que haya al menos 1 platillo no completado entre los permitidos
        const tienePlatillosPendientes = platillosFiltrados.some(
          platillo => !platillo.completado
        );

        // Solo incluir el pedido si:
        // 1. Tiene platillos que esta cocina puede ver
        // 2. Al menos uno de esos platillos no está completado
        if (platillosFiltrados.length > 0 && tienePlatillosPendientes) {
          pedidosFiltrados.push({
            ...pedido,
            platillos: platillosFiltrados
          });
        }
      });

      setPedidos(pedidosFiltrados);
      setError(null);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      setError("Error al cargar los pedidos");
    }
  };

  const marcarPlatilloCompletado = async (pedidoId, platilloIndex) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      const nuevosPedidos = [...pedidos];
      const pedidoIndex = nuevosPedidos.findIndex(p => p.id === pedidoId);

      if (pedidoIndex !== -1) {
        nuevosPedidos[pedidoIndex].platillos[platilloIndex].completado = true;

        await updateDoc(pedidoRef, {
          platillos: nuevosPedidos[pedidoIndex].platillos
        });

        setPedidos(nuevosPedidos);
        verificarCompletadoTotal(pedidoId);
        const permisos = await cargarPermisos();
        cargarPedidos(permisos);
      }
    } catch (err) {
      console.error("Error actualizando platillo:", err);
      alert("Error al marcar el platillo como completado");
    }
  };

  const verificarCompletadoTotal = async (pedidoId) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      const pedidoSnapshot = await getDoc(pedidoRef);

      if (!pedidoSnapshot.exists()) return;

      const pedidoActual = pedidoSnapshot.data();

      const todosCompletados = pedidoActual.platillos.every(p => p.completado);

      if (todosCompletados) {
        // Actualizamos ambos campos: estado Y platillos (para mantenerlos)
        await updateDoc(pedidoRef, {
          estado: "completado",
          platillos: pedidoActual.platillos // Mantenemos los platillos existentes
        });

        // Actualización local manteniendo todos los platillos
        setPedidos(prev => prev.map(p =>
          p.id === pedidoId ? {
            ...p,
            estado: "completado",
            platillos: p.platillos // Mantenemos los platillos en el estado local
          } : p
        ));
      }
    } catch (err) {
      console.error("Error verificando completado total:", err);
    }
  };

  const empezarOrden = async (pedidoId) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      await updateDoc(pedidoRef, {
        preparando: true,
      });
    } catch (err) {
      console.error("Error al empezar la orden:", err);
    }
  };

  useEffect(() => {
    const cargarTodo = async () => {
      const permisos = await cargarPermisos();
      cargarPedidos(permisos);
    };

    cargarTodo();
    const interval = setInterval(cargarTodo, 5000);
    return () => clearInterval(interval);
  }, [idCocina]);


  return (
    <div style={{ padding: '20px' }}>
      <h1>Cocina {nombreCocina} - Pedidos Activos</h1>

      {pedidos.length === 0 ? (
        <p>No hay pedidos pendientes con platillos de esta cocina</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: !pedido.preparando ? "#f9f9f9" : "#F2DF61",
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>Pedido #{pedido.id.substring(0, 6)} - Mesa: {pedido.mesaNombre}</h3>
                <button
                  onClick={() => empezarOrden(pedido.id)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: !pedido.preparando ? "red" : "#4CAF50",
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {!pedido.preparando ? "Empezar a cocinar" : "Cocinando"}

                </button>
              </div>

              <div style={{ marginTop: '10px' }}>
                <h4>Platillos:</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {pedido.platillos.map((platillo, index) => (
                    <li
                      key={`${platillo.idPlatillo}-${index}`}
                      style={{
                        padding: '10px',
                        margin: '5px 0',
                        backgroundColor: platillo.completado ? '#e8f5e9' : '#ffebee',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong>{platillo.nombre}</strong>
                        <div>Cantidad: {platillo.cantidad}</div>
                        {platillo.descripcion && <div>Notas: {platillo.descripcion}</div>}
                      </div>

                      <button
                        onClick={() => marcarPlatilloCompletado(pedido.id, index)}
                        disabled={!pedido.preparando ? true : false}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: !platillo.completado ? "red" : "#4CAF50",
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {!platillo.completado ? "Pendiente" : "Completado"}

                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
                Hora del pedido: {new Date(pedido.fecha?.toDate()).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CocinaPrincipal;