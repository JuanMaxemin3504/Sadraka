import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import NavBarInventario from '../NavBars/NavBarInventario';

function AgregarInventarioAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(0);
  const [ingreso, setIngreso] = useState("KG");
  const [url, setUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventario, setInventario] = useState(0); // Usar useState para inventario
  const [paquetes, setPaquetes] = useState(null); // Usar useState para paquetes

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();
          setNombre(productData.nombre);
          setIngreso(productData.ingreso);
          setInventario(productData.cantidad);
          setPaquetes(productData.cantidad_paquete || null); // Guardar cantidad_paquete o null
          setUrl(productData.url);
        } else {
          alert("Producto no encontrado.");
          navigate("/inventario");
        }
      } catch (error) {
        console.error("Error al cargar el producto:", error);
        alert("Hubo un error al cargar el producto.");
      }
    };

    loadProduct();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar la cantidad
    if (isNaN(cantidad)) {
      alert("La cantidad debe ser un número válido.");
      return;
    }
    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor a 0.");
      return;
    }

    setIsSubmitting(true);

    try {
      let nuevoInventario;
      if (paquetes) {
        // Si el producto es por paquetes, multiplicar la cantidad por la cantidad unitaria por paquete
        nuevoInventario = inventario + (parseFloat(cantidad) * parseFloat(paquetes));
      } else {
        // Si no es por paquetes, sumar directamente la cantidad
        nuevoInventario = parseFloat(inventario) + parseFloat(cantidad);
      }

      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        cantidad: nuevoInventario,
      });

      alert("Producto actualizado correctamente.");
      navigate("/inventario");
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      alert("Hubo un error al actualizar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarInventario />
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Editar Producto</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Nombre del Producto:</label> <br />
            <label>{nombre}</label>
          </div>

          <img
            src={url}
            alt={nombre}
            style={{ width: '100px', height: '100px', borderRadius: '10px' }}
          />

          <div style={{ marginBottom: "15px" }}>
            <label>Cantidad:</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              step={ingreso === "KG" ? "0.01" : "1"}
              required
              style={{ width: "100%", padding: "8px" }}
            />
            <label>{ingreso}</label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: isSubmitting ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AgregarInventarioAdmin;