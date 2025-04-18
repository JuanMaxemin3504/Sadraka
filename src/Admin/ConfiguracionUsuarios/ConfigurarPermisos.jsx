import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, updateDoc } from "firebase/firestore";
import NavBarUsuarios from "../NavBars/NavBarUsuarios";

function ConfigurarPermisos() {
  const { id } = useParams();
  const navigate = useNavigate();

  const listaPemisos = [{
    nombre: "Menu",
    id: 1
  }, 
  {
    nombre: "Cocinas",
    id: 2
  }, 
  {
    nombre: "Promociones",
    id: 3
  }, 
  {
    nombre: "Reportes",
    id: 4
  }, 
  {
    nombre: "Inventario",
    id: 5
  }, 
  {
    nombre: "Usuarios",
    id: 6
  }

]
  const [PermisosSeleccionados, setPermisosSeleccionados] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCocina();
  }, [id]);

  const loadCocina = async () => {
    try {
      const cocinaref = doc(db, "users", id);
      const cocinaDoc = await getDoc(cocinaref);

      if (cocinaDoc.exists()) {
        const permisos = cocinaDoc.data().permisos || [];
        setPermisosSeleccionados(permisos);
      } else {
        alert("Usuario cocina no encontrado");
      }
    } catch (error) {
      console.error("Error al cargar los permisos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (platillo) => {
    setPermisosSeleccionados(prev => {
      const existe = prev.some(p => p.id === platillo.id);
      return existe
        ? prev.filter(p => p.id !== platillo.id)
        : [...prev, { id: platillo.id, nombre: platillo.nombre}];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if(PermisosSeleccionados.length < 1){
      alert("Se debe elegir al menos 1 permiso para el administrador");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, "users", id), {
        permisos: PermisosSeleccionados
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
      <div style={{ marginBottom: "15px", textAlign: "center" }}>
      <h1>Configurar Permisos</h1>
        <form onSubmit={handleSubmit}>
          <h2>Platillos:</h2>
          {listaPemisos.map((permiso) => (
            <div key={permiso.id} style={{ marginBottom: "10px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={PermisosSeleccionados.some(p => p.id === permiso.id)}
                  onChange={() => handleCheckboxChange(permiso)}
                  disabled={isSubmitting}
                />
                {permiso.nombre}
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

export default ConfigurarPermisos;