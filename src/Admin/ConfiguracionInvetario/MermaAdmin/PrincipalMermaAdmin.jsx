import React, { useEffect, useState } from "react";
import { db, storage } from "../../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, writeBatch, getDoc, where, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import { deleteObject, ref } from "firebase/storage";
import NavBarMerma from '../../NavBars/NavBarMerma';
import { ValidacionIngredientesPlatillos } from "../../../ValidacionesPlatillosEstatus/ValidacionIngredientesPlatillos";


const getMermaPendiente = async () => {
  try {
    const productosRef = collection(db, "merma");
    const q = query(
      productosRef,(
      orderBy("creacion", "desc"),
      where("aplicada", "==", false))
    );
    const querySnapshot = await getDocs(q);
    const productsData = [];

    querySnapshot.forEach((doc) => {
      productsData.push({ id: doc.id, ...doc.data() });
    });
    return productsData;
  } catch (error) {
    console.error("Error obteniendo la merma: ", error);
    return [];
  }
};

const getMerma = async () => {
  try {
    const productosRef = collection(db, "merma");
    const q = query(
      productosRef,
      orderBy("creacion", "desc")
    );
    const querySnapshot = await getDocs(q);
    const productsData = [];

    querySnapshot.forEach((doc) => {
      productsData.push({ id: doc.id, ...doc.data() });
    });

    return productsData;
  } catch (error) {
    console.error("Error obteniendo la merma: ", error);
    return [];
  }
};

const formatoFecha = (timestamp) => {
  if (timestamp && timestamp.toDate) {
    const fecha = timestamp.toDate();
    return fecha.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "Fecha no disponible";
};

function PrincipalMermaAdmin() {
  const [editingMerma, setEditingMerma] = useState(null);
  const [cantidadEditada, setCantidadEditada] = useState("");
  const [listaMerma, setListaMerma] = useState([]);
  const [listaMermaPendiente, setListaMermaPendiente] = useState([]);
  const [mermaEjecutada, setMermaEjecutada] = useState(false);

  const handleGuardarCambios = async (id) => {
    try {
      const seccionRef = doc(db, "merma", id);

      await updateDoc(seccionRef, {
        cantidad: cantidadEditada,
        edicion: serverTimestamp(),
      });

      setEditingMerma(null);
    } catch (error) {
      console.error("Error al actualizar la merma: ", error);
      alert("Hubo un error al actualizar la merma.");
    } finally {
      loadMerma();
    }
  };


  const handleCancelarEdicion = () => {
    setEditingMerma(null);
  };

  useEffect(() => {
    console.log("Cargando merma...");
    loadMerma();
  }, []);

  const handleEjecutarMerma = async () => {
    const confirmar = window.confirm("¿Estás seguro de ejecutar la merma? Esta acción no se puede deshacer.");
    if (confirmar) {
      try {

        const ingredientesTotales = {};

        for (const pedido of listaMermaPendiente) {
          // Platillos individuales
          if (!pedido.invetario) {
            const platilloRef = doc(db, "menu", pedido.idReferente);
            const platilloSnap = await getDoc(platilloRef);
            if (!platilloSnap.exists()) continue;

            const dataPlatillo = platilloSnap.data();
            const cantidadPedida = pedido.cantidad || 1;

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
          } else {
            const cantidadPedida = pedido.cantidad || 1;
            const cantidadNecesaria = ingrediente.cantidad * cantidadPedida;
            ingredientesTotales[pedido.idReferente] += cantidadNecesaria;
          }
        }

        const batchInventario = writeBatch(db);

        for (const [ingredienteId, cantidadADescontar] of Object.entries(ingredientesTotales)) {
          const refIngrediente = doc(db, "products", ingredienteId);
          const snapIngrediente = await getDoc(refIngrediente);

          if (snapIngrediente.exists()) {
            const stockActual = snapIngrediente.data().cantidad || 0;
            let cantidadADescontarReal = cantidadADescontar;
            if (snapIngrediente.data().ingreso == "KG") {
              cantidadADescontarReal = cantidadADescontarReal / 1000;
            }
            ValidacionIngredientesPlatillos(ingredienteId);
            const nuevoStock = stockActual - cantidadADescontarReal;

            batchInventario.update(refIngrediente, { cantidad: nuevoStock });
          }
        }

        await batchInventario.commit();

        // Marcar la merma como ejecutada en la base de datos
        const batchUpdates = listaMermaPendiente.map(merma => {
          const seccionRef = doc(db, "merma", merma.id);
          return updateDoc(seccionRef, {
            ejecutada: true,
            aplicada: true,
            fechaEjecucion: serverTimestamp()
          });
        });

        await Promise.all(batchUpdates);

        setMermaEjecutada(true);
        alert("Merma ejecutada correctamente.");
        loadMerma();
      } catch (error) {
        console.error("Error al ejecutar la merma: ", error);
        alert("Hubo un error al ejecutar la merma.");
      }
    }
  };

  // Modificar handleEditar para verificar si la merma está ejecutada
  const handleEditar = (seccion) => {
    if (seccion.ejecutada) {
      alert("No se puede editar una merma ya ejecutada.");
      return;
    }
    setEditingMerma(seccion.id);
    setCantidadEditada(seccion.cantidad);
  };

  // Modificar handleDelete para verificar si la merma está ejecutada
  const handleDelete = async (id, nombre) => {
    const merma = listaMerma.find(m => m.id === id);
    if (merma && merma.ejecutada) {
      alert("No se puede eliminar una merma ya ejecutada.");
      return;
    }

    const confirmar = window.confirm(`¿Estás seguro de eliminar la merma de ${nombre}?`);
    if (confirmar) {
      try {
        await deleteDoc(doc(db, "merma", id));
        setListaMerma((prev) => prev.filter((merma) => merma.id !== id));
        alert("Merma eliminada correctamente.");
      } catch (error) {
        console.error("Error eliminando la merma: ", error);
        alert("Hubo un error al eliminar la merma.");
      }
    }
  };

  // Modificar loadMerma para verificar si hay mermas ejecutadas
  const loadMerma = async () => {
    console.log("Cargando merma...");
    const productsData = await getMerma();
    const productsDataPendientes = await getMermaPendiente();
    console.log("Merma cargada:", productsData);
    console.log("Merma pendiente  cargada:", productsDataPendientes);

    // Verificar si hay alguna merma pendiente
    const hayMermasPendientes = productsDataPendientes.length > 0;
    setMermaEjecutada(hayMermasPendientes);
    

    setListaMerma(productsData);
    setListaMermaPendiente(productsDataPendientes);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMerma />
      <div style={{ justifyContent: 'center', padding: '20px' }}>
        <h1>Lista de Merma</h1>

        {/* Botón para ejecutar la merma */}
        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button
            onClick={handleEjecutarMerma}
            disabled={!mermaEjecutada}
            style={{
              backgroundColor: mermaEjecutada   ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: mermaEjecutada ? "pointer" : "not-allowed",
              fontWeight: "bold"
            }}
          >
            {mermaEjecutada ? "Ejecutar Merma" : "No hay mermas pendientes"}
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', textAlign: 'center' }}>Productos</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Tiempo de creación</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Última edición</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Estado</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listaMerma.map((merma) => (
              <tr key={merma.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', textAlign: 'center' }}>{merma.producto}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  {editingMerma === merma.id ? (
                    <input
                      type="text"
                      value={cantidadEditada}
                      onChange={(e) => setCantidadEditada(e.target.value)}
                      style={{ width: "100%", padding: "5px" }}
                      disabled={merma.ejecutada}
                    />
                  ) : (
                    merma.cantidad
                  )}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {formatoFecha(merma.creacion)}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {formatoFecha(merma.edicion)}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {merma.ejecutada ?
                    `Ejecutada (${formatoFecha(merma.fechaEjecucion)})` :
                    "Pendiente"}
                </td>

                <td style={{ textAlign: "center" }}>
                  {editingMerma === merma.id ? (
                    <>
                      <button
                        onClick={() => handleGuardarCambios(merma.id)}
                        disabled={merma.ejecutada}
                        style={{
                          backgroundColor: merma.ejecutada ? "#6c757d" : "#28a745",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          cursor: merma.ejecutada ? "not-allowed" : "pointer",
                          marginRight: "5px",
                        }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancelarEdicion}
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditar(merma)}
                      disabled={merma.ejecutada}
                      style={{
                        backgroundColor: merma.ejecutada ? "#6c757d" : "#007bff",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: merma.ejecutada ? "not-allowed" : "pointer",
                      }}
                    >
                      Editar
                    </button>
                  )}
                </td>

                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => {
                      handleDelete(merma.id, merma.producto);
                      loadMerma();
                    }}
                    disabled={merma.ejecutada}
                    style={{
                      backgroundColor: merma.ejecutada ? "#6c757d" : "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      cursor: merma.ejecutada ? "not-allowed" : "pointer",
                      marginRight: "5px",
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PrincipalMermaAdmin;