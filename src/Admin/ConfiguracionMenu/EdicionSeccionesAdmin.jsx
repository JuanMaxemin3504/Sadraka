import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs, doc, updateDoc, orderBy, where, addDoc, deleteDoc } from "firebase/firestore";
import NavBarSecciones from "../NavBars/NavBarSecciones";

function EdicionSeccionesAdmin() {
  const [secciones, setSecciones] = useState([]);
  const [editingSeccion, setEditingSeccion] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [intercambio, setIntercambio] = useState({
    id: "",
    posicion: "",
  });
  const [botonAgregar, setBotonAgregar] = useState(false);

  useEffect(() => {
    ObternerSecciones();
  }, []);

  const ObternerSecciones = async () => {
    try {
      const productosRef = collection(db, "secciones");
      const q = query(productosRef, orderBy("posicion", "asc")); // Ordenar por posición
      const querySnapshot = await getDocs(q);
      const productsData = [];

      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });

      setSecciones(productsData);
    } catch (error) {
      console.error("Error obteniendo las secciones: ", error);
    }
  };

  const handleEditar = (seccion) => {
    setEditingSeccion(seccion.id);
    setNombreEditado(seccion.nombre);
  };

  const handleGuardarCambios = async (id) => {
    try {
      const seccionRef = doc(db, "secciones", id);
      await updateDoc(seccionRef, {
        nombre: nombreEditado,
      });

      const platillosRef = collection(db, "menu");
      const q = query(platillosRef, where("seccion.id", "==", id));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (docPlatillo) => {
        const platilloRef = doc(db, "menu", docPlatillo.id);
        await updateDoc(platilloRef, {
          "seccion.nombre": nombreEditado, // Actualizar el nombre de la sección
        });
      });

      const seccionesActualizadas = secciones.map((seccion) =>
        seccion.id === id
          ? { ...seccion, nombre: nombreEditado }
          : seccion
      );

      setSecciones(seccionesActualizadas);
      setEditingSeccion(null);
    } catch (error) {
      console.error("Error actualizando la sección y los platillos: ", error);
      alert("Hubo un error al actualizar la sección y los platillos.");
    }
  };

  const handleIntercambio = async (id, pos) => {
    if (intercambio.id) {
      if (id === intercambio.id) {
        intercambio.id = ""
        intercambio.posicion = ""
        return;
      }
      try {
        const seccion1 = doc(db, "secciones", intercambio.id);
        const seccion2 = doc(db, "secciones", id);
        await updateDoc(seccion2, {
          posicion: intercambio.posicion
        });

        await updateDoc(seccion1, {
          posicion: parseInt(pos)
        });
      } catch (error) {
        console.error("Error intercambiando la posicion: ", error);
        alert("Hubo un error al intercambiar posiciones.");
      }
      finally {
        setIntercambio({
          id: "",
          posicion: "",
        });
        window.location.reload() // Esto se utiliza para recargar la pagina y hacer que los botones vuelvan a su color original
      }
    }
    else {
      setIntercambio({
        id: id,
        posicion: pos,
      });
    }
  }
  const handleCancelarEdicion = () => {
    setEditingSeccion(null);
  };

  const handleDelete = async (id, nom) => {
    const usuarioConfirmo = window.confirm("Estas seguro que quieres eliminar el platillo " + nom);
    if (usuarioConfirmo) {
      try {
        await deleteDoc(doc(db, "secciones", id));
        const platillosRef = collection(db, "menu");
        const q = query(platillosRef, where("seccion.id", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot) {
          querySnapshot.forEach(async (docPlatillo) => {
            const platilloRef = doc(db, "menu", docPlatillo.id);
            await updateDoc(platilloRef, {
              "seccion": null,
            });
          });
        }
      } catch (error) {
        console.error("Error al eliminar el producto:", error);
        alert("Hubo un error al eliminar el producto.");
      }

      try {
        const productosRef = collection(db, "secciones");
        const q = query(productosRef, orderBy("posicion", "asc")); // Ordenar por posición
        const querySnapshot = await getDocs(q);
        const productsData = [];

        querySnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() });
        });
        let pos = 1;
        for (const seccion of productsData) {
          const seccionRef = doc(db, "secciones", seccion.id);
          await updateDoc(seccionRef, {
            posicion: pos,
          });
          pos = pos + 1;
        }
        ObternerSecciones();
      } catch (error) {
        console.error("Error al actualizar posiciones:", error);
        alert("Hubo un error al actualizar posiciones.");
      }
    }
  }

  const handleCrearSeccion = async () => {
    setBotonAgregar(true);
    let numero = 1;
    try {
      const q = query(
        collection(db, "secciones"),
        where("nombre", ">=", "Seccion nueva"),
        where("nombre", "<=", "Secion nuev" + "\uf8ff")
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        numero++;
      });

      const nombre = "Seccion nueva " + numero
      const posicion = secciones.length + 1
      const nuevaSeccion = {
        nombre,
        posicion
      };
      const docRef = await addDoc(collection(db, "secciones"), nuevaSeccion);
      console.log("Nueva seccion creada con ID:", docRef.id);
      ObternerSecciones();
    } catch (error) {
      console.error("Error al crear la seccion.", error);
      alert("Hubo un error al crear la seccion.");
    } finally {
      setBotonAgregar(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <NavBarSecciones />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: "10px", textAlign: "center" }}>Nombre</th>
            <th style={{ padding: "10px", textAlign: "center" }}>Posición</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {secciones.map((seccion) => (
            <tr key={seccion.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px", textAlign: "center" }}>
                {editingSeccion === seccion.id ? (
                  <input
                    type="text"
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    style={{ width: "100%", padding: "5px" }}
                  />
                ) : (
                  seccion.nombre
                )}
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>{seccion.posicion}</td>

              <td style={{ textAlign: "center" }}>
                {editingSeccion === seccion.id ? (
                  <>
                    <button
                      onClick={() => handleGuardarCambios(seccion.id)}
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
                    onClick={() => handleEditar(seccion)}
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

              <td style={{ textAlign: "center" }}>
                <button
                  onClick={() => handleIntercambio(seccion.id, seccion.posicion)}
                  style={{
                    backgroundColor: seccion.id != intercambio.id ? '007bff' : 'gray',
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Intercambiar
                </button>
              </td>

              <td style={{ textAlign: "center" }}>
                <button
                  onClick={() => handleDelete(seccion.id, seccion.nombre)}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
      <button style={{ marginRight: "40%", marginLeft: "40%", cursor: botonAgregar ? "not-allowed" : "pointer" }}
        disabled={botonAgregar}
        onClick={async () => handleCrearSeccion()}>
        {botonAgregar ? "Creando seccion" : "Crear seccion"}
      </button>
    </div>
  );
}

export default EdicionSeccionesAdmin;