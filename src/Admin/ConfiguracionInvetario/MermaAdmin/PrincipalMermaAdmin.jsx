import React, { useEffect, useState } from "react";
import { db, storage } from "../../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router-dom";
import { deleteObject, ref } from "firebase/storage";
import NavBarMerma from '../../NavBars/NavBarMerma';

const getMerma = async () => {
  try {
    const productosRef = collection(db, "merma");
    const q = query(productosRef);
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

  const handleEditar = (seccion) => {
    setEditingMerma(seccion.id);
    setCantidadEditada(seccion.cantidad);
  };

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
    }finally{
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

  const loadMerma = async () => {
    console.log("Cargando merma...");
    const productsData = await getMerma();
    console.log("Merma cargada:", productsData);
    setListaMerma(productsData);
  };

  const handleDelete = async (id, nombre) => {
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

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMerma />
      <div style={{ justifyContent: 'center', padding: '20px' }}>
        <h1>Lista de Merma</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', textAlign: 'center' }}>Productos</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Tiempo de creación</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Última edición</th>
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
                    />
                  ) : (
                    merma.cantidad
                  )}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {formatoFecha(merma.creacion)} {/* Muestra la fecha de creación formateada */}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {formatoFecha(merma.edicion)} {/* Muestra la fecha de edición formateada */}
                </td>

                <td style={{ textAlign: "center" }}>
                  {editingMerma === merma.id ? (
                    <>
                      <button
                        onClick={() => handleGuardarCambios(merma.id)}
                        style={{
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          cursor: "pointer",
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
                      style={{
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
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
                    }
                    }
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      cursor: merma.baja ? "not-allowed" : "pointer",
                      marginRight: '5px',
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