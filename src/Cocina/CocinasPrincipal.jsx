import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from 'react-router-dom';
import { MetodoDeOrdenamiento } from './MetodoDeOrdenamiento';

function CocinaPrincipal() {
  const [pedidos, setPedidos] = useState([]);
  const { idCocina } = useParams();
  const [nombreCocina, setNombreCocina] = useState("")
  const [permisosPlatillos, setPermisosPlatillos] = useState([]);

  const cargarPermisos = async () => {
    try {
      const cocinaRef = doc(db, "users", idCocina);
      const cocinaDoc = await getDoc(cocinaRef);
      setNombreCocina(cocinaDoc.data().username);

      if (cocinaDoc.exists()) {
        const permisosIds = cocinaDoc.data().permisos.map(permiso => permiso.id);
        return permisosIds;
      }
      return [];
    } catch (err) {
      console.error("Error cargando permisos:", err);
      return [];
    }
  };

  const cargarPedidos = async (permisos, pedidosPrevios = []) => {
    try {
      const pedidosRef = collection(db, "ordenes");
      const q = query(pedidosRef, where("estado", "==", "pendiente"));
      const querySnapshot = await getDocs(q);

      // Obtener nuevas órdenes y filtrar las no duplicadas
      const nuevasOrdenes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(nuevaOrden =>
        !pedidosPrevios.some(orden => orden.id === nuevaOrden.id)
      );

      console.log("Nuevas órdenes:", nuevasOrdenes);

      const InformacionRef = doc(db, "informacion", "MetodoOrdenamiento");
      const InformacionDoc = await getDoc(InformacionRef);
      const InformacionData = InformacionDoc.data();
      // Combinar con las previas solo si hay nuevas
      let todasLasOrdenes = [...pedidosPrevios];
      if (nuevasOrdenes.length > 0) {
        todasLasOrdenes = [...pedidosPrevios, ...nuevasOrdenes];
        console.log("Órdenes combinadas:", todasLasOrdenes);

        // Ordenar solo si hubo nuevas órdenes
        if (InformacionData.prioridad) {
          todasLasOrdenes = await MetodoDeOrdenamiento(todasLasOrdenes);
        }
        console.log("Órdenes ordenadas:", todasLasOrdenes);
      }

      // Filtrar por permisos y pendientes
      const pedidosFiltrados = todasLasOrdenes
        .filter(pedido => {
          const platillos = pedido.platillos || [];
          const extrasYcomplementos = pedido.extrasYcomplementos || [];
          const promociones = pedido.promociones || [];

          const platillosFiltrados = platillos.filter(p => p && permisos.includes(p.idPlatillo));
          const extrasFiltrados = extrasYcomplementos.filter(e => e && permisos.includes(e.idPlatillo));
          const promocionesFiltradas = promociones.filter(promo =>
            promo && promo.platillos.some(p => p && permisos.includes(p.idPlatillo))
          );

          return (
            platillosFiltrados.some(p => !p.completado) ||
            extrasFiltrados.some(e => !e.completado) ||
            promocionesFiltradas.some(promo =>
              promo.platillos.some(p => !p.completado)
            )
          );
        })
        .map(pedido => ({
          ...pedido,
          platillos: pedido.platillos || [],
          extrasYcomplementos: pedido.extrasYcomplementos || [],
          promociones: pedido.promociones || []
        }));

      setPedidos(pedidosFiltrados);
      return pedidosFiltrados; // Retornar para posible uso futuro
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      throw err; // Relanzar el error para manejo superior
    }
  };

  const marcarPlatilloCompletado = async (pedidoId, platilloIndex) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      const pedidoDoc = await getDoc(pedidoRef);
      const pedidoActual = pedidoDoc.data();

      const platillos = pedidoActual.platillos || [];
      const platillosActualizados = [...platillos];

      if (platilloIndex < platillosActualizados.length) {
        platillosActualizados[platilloIndex] = {
          ...platillosActualizados[platilloIndex],
          completado: true
        };
      }

      await updateDoc(pedidoRef, { platillos: platillosActualizados });
      await actualizarYVerificar(pedidoId);
    } catch (err) {
      console.error("Error actualizando platillo:", err);
      alert("Error al marcar el platillo como completado");
    }
  };

  const marcarExtraCompletado = async (pedidoId, extraIndex) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      const pedidoDoc = await getDoc(pedidoRef);
      const pedidoActual = pedidoDoc.data();

      // Obtener el array de extrasYcomplementos (o array vacío si es null/undefined)
      const extrasYcomplementos = pedidoActual.extrasYcomplementos || [];
      const extrasActualizados = [...extrasYcomplementos];

      // Verificar que el índice sea válido
      if (extraIndex < extrasActualizados.length) {
        extrasActualizados[extraIndex] = {
          ...extrasActualizados[extraIndex],
          completado: true
        };

        // Actualizar SOLO el campo extrasYcomplementos
        await updateDoc(pedidoRef, {
          extrasYcomplementos: extrasActualizados
        });

        await actualizarYVerificar(pedidoId);
      }
    } catch (err) {
      console.error("Error actualizando extra/complemento:", err);
      alert("Error al marcar el extra/complemento como completado");
    }
  };

  const marcarPlatilloPromocionCompletado = async (pedidoId, promocionIndex, platilloIndex) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      const pedidoDoc = await getDoc(pedidoRef);
      const pedidoActual = pedidoDoc.data();

      const promociones = pedidoActual.promociones || [];
      const promocion = promociones[promocionIndex];

      if (!promocion) return;

      const platillosActualizados = [...promocion.platillos];
      if (platilloIndex < platillosActualizados.length) {
        platillosActualizados[platilloIndex] = {
          ...platillosActualizados[platilloIndex],
          completado: true
        };
      }

      promociones[promocionIndex] = {
        ...promocion,
        platillos: platillosActualizados
      };

      await updateDoc(pedidoRef, { promociones: promociones });
      await actualizarYVerificar(pedidoId);
    } catch (err) {
      console.error("Error actualizando platillo de promoción:", err);
      alert("Error al marcar el platillo como completado");
    }
  };

  const actualizarYVerificar = async (pedidoId) => {
    const permisos = await cargarPermisos();
    cargarPedidos(permisos);
    await verificarCompletadoTotal(pedidoId);
  };

  const verificarCompletadoTotal = async (pedidoId) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      const pedidoSnapshot = await getDoc(pedidoRef);

      if (!pedidoSnapshot.exists()) return;

      const pedidoActual = pedidoSnapshot.data();
      const platillos = pedidoActual.platillos || [];
      const extrasYcomplementos = pedidoActual.extrasYcomplementos || [];
      const promociones = pedidoActual.promociones || [];

      const todosCompletados =
        platillos.every(p => p?.completado) &&
        extrasYcomplementos.every(e => e?.completado) &&
        promociones.every(promo =>
          promo?.platillos.every(p => p?.completado)
        );

      if (todosCompletados) {
        await updateDoc(pedidoRef, {
          estado: "completado",
          platillos,
          extrasYcomplementos,
          promociones
        });

        setPedidos(prev => prev.map(p =>
          p.id === pedidoId ? { ...p, estado: "completado" } : p
        ));
      }
    } catch (err) {
      console.error("Error verificando completado total:", err);
    }
  };

  const empezarOrden = async (pedidoId) => {
    try {
      const pedidoRef = doc(db, "ordenes", pedidoId);
      await updateDoc(pedidoRef, { preparando: true });
    } catch (err) {
      console.error("Error al empezar la orden:", err);
    }
  };

  useEffect(() => {
    const cargarTodo = async () => {
      const permisos = await cargarPermisos();
      setPermisosPlatillos(permisos);
      cargarPedidos(permisos, pedidos);
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
          {pedidos
            .filter((pedido) => {
              const platillos = (pedido.platillos || []).filter(p => permisosPlatillos.includes(p.idPlatillo));
              const extrasYcomplementos = (pedido.extrasYcomplementos || []).filter(p => permisosPlatillos.includes(p.idPlatillo));
              const promociones = (pedido.promociones || []).flatMap(promo =>
                promo.platillos.filter(p => permisosPlatillos.includes(p.idPlatillo))
              );

              const todos = [...platillos, ...extrasYcomplementos, ...promociones];
              // Mostrar el pedido solo si hay al menos un item no completado
              return todos.some(p => !p.completado);
            })
            .map((pedido) => {
              const platillos = pedido.platillos || [];
              const extrasYcomplementos = pedido.extrasYcomplementos || [];
              const promociones = pedido.promociones || [];

              return (
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
                      {platillos.map((platillo, index) => (
                        platillo && permisosPlatillos.includes(platillo.idPlatillo) && (
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
                              disabled={!pedido.preparando}
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
                        )
                      ))}

                      {extrasYcomplementos.map((item, index) => (
                        item && permisosPlatillos.includes(item.idPlatillo) && (
                          <li
                            key={`${item.idPlatillo}-${index}`}
                            style={{
                              padding: '10px',
                              margin: '5px 0',
                              backgroundColor: item.completado ? '#e8f5e9' : '#ffebee',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <strong>{item.nombre}</strong>
                              <div>Tipo: {item.tipo}</div>
                              {item.platilloAsociado && <div>Para: {item.platilloAsociado}</div>}
                            </div>

                            <button
                              onClick={() => marcarExtraCompletado(pedido.id, index)}
                              disabled={!pedido.preparando}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: !item.completado ? "red" : "#4CAF50",
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {!item.completado ? "Pendiente" : "Completado"}
                            </button>
                          </li>
                        )
                      ))}
                    </ul>

                    {promociones.map((promocion, promocionIndex) => (
                      permisosPlatillos.some(permiso =>
                        promocion.platillos.some(p => p.idPlatillo === permiso)
                      ) && (
                        <div key={`promo-${promocionIndex}`} style={{ marginTop: '15px' }}>
                          <ul style={{ listStyle: 'none', padding: 0 }}>
                            {promocion.platillos.map((platillo, platilloIndex) => (
                              platillo && permisosPlatillos.includes(platillo.idPlatillo) && (
                                <li
                                  key={`${platillo.idPlatillo}-${platilloIndex}`}
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
                                    onClick={() => marcarPlatilloPromocionCompletado(pedido.id, promocionIndex, platilloIndex)}
                                    disabled={!pedido.preparando}
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
                              )
                            ))}
                          </ul>
                        </div>
                      )
                    ))}
                  </div>

                  <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
                    Hora del pedido: {pedido.fecha ? new Date(pedido.fecha.toDate()).toLocaleTimeString() : 'No disponible'}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default CocinaPrincipal;