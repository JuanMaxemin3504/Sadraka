import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, updateDoc } from "firebase/firestore";
import NavBarUsuarios from "../NavBars/NavBarUsuarios";

function ConfiguracionCocinas() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listaPlatillos, setListaPlatillos] = useState([]);
  const [platillosSeleccionados, setPlatillosSeleccionados] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatillos();
    loadCocina();
  }, [id]);

  const loadCocina = async () => {
    try {
      const cocinaref = doc(db, "users", id);
      const cocinaDoc = await getDoc(cocinaref);

      if (cocinaDoc.exists()) {
        const permisos = cocinaDoc.data().permisos || [];
        setPlatillosSeleccionados(permisos);
      } else {
        alert("Usuario cocina no encontrado");
      }
    } catch (error) {
      console.error("Error al cargar los permisos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlatillos = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, "menu")));
      const platillosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setListaPlatillos(platillosData);
    } catch (error) {
      console.error("Error al cargar los platillos:", error);
    }
  };

  const handleCheckboxChange = (platillo) => {
    setPlatillosSeleccionados(prev => {
      const existe = prev.some(p => p.id === platillo.id);
      return existe
        ? prev.filter(p => p.id !== platillo.id)
        : [...prev, { id: platillo.id, nombre: platillo.nombre, seccion: platillo.seccion }];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if(platillosSeleccionados.length < 1){
        alert("Se debe seleccionar por lo menos 1 platillo");
        setIsSubmitting(false);
        return;
    }

    try {
      await updateDoc(doc(db, "users", id), {
        permisos: platillosSeleccionados
      });
      navigate("/usuarios");
    } catch (error) {
      console.error("Error al actualizar los permisos:", error);
      alert("Hubo un error al actualizar los permisos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarUsuarios />
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
      <h1>Configurar Permisos</h1>
        <form onSubmit={handleSubmit}>
          <h2>Platillos:</h2>
          {listaPlatillos.map((platillo) => (
            <div key={platillo.id} style={{ marginBottom: "10px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={platillosSeleccionados.some(p => p.id === platillo.id)}
                  onChange={() => handleCheckboxChange(platillo)}
                  disabled={isSubmitting}
                />
                {platillo.nombre}
              </label>
            </div>
          ))}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {isSubmitting ? "Guardando..." : "Guardar Permisos"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ConfiguracionCocinas;