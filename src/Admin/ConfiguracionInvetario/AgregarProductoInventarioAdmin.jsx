import React, { useState } from "react";
import NavBarInventario from '../NavBars/NavBarInventario';
import { db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";

function AgregarProductoInventarioAdmin() {
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [ingreso, setIngreso] = useState("KG");
  const [file, setFile] = useState(null);
  const [costo, setCosto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cantidadPaquete, setCantidadPaquete] = useState(""); // Nuevo estado para la cantidad unitaria por paquete

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !costo) {
      alert("Por favor, completa todos los campos y selecciona una imagen.");
      return;
    }

    if (!cantidad) {
      setCantidad(0);
    }

    if (file && !file.type.startsWith("image/")) {
      alert("Por favor, sube solo archivos de imagen.");
      return;
    }

    if (ingreso === "KG") {
      if (isNaN(parseFloat(cantidad))) {
        alert("La cantidad debe ser un número válido.");
        return;
      }
    } else if (ingreso === "Paquetes") {
      if (!Number.isInteger(parseFloat(cantidad))) {
        alert("La cantidad debe ser un número entero.");
        return;
      }
    } else {
      if (!Number.isInteger(parseFloat(cantidad))) {
        alert("La cantidad debe ser un número entero.");
        return;
      }
      if (parseInt(cantidad) < 1) {
        alert("La cantidad debe ser mayor a 1.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let downloadUrl = "";
      if (file) {
        const storageRef = ref(storage, `productos/${file.name}`);
        await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(storageRef);
      } else {
        downloadUrl = "https://tse3.mm.bing.net/th/id/OIP.0nEFZ6umUtwq2FJce32emgHaE8?rs=1&pid=ImgDetMain";
      }

      const docRef = await addDoc(collection(db, "products"), {
        nombre: nombre,
        cantidad: parseFloat(cantidad),
        costo: parseFloat(costo),
        ingreso: ingreso,
        url: downloadUrl,
        estatus: true,
        baja: false,
        cantidad_paquete: ingreso === "Paquetes" ? parseInt(cantidadPaquete) : null,
      });

      console.log("Producto guardado con ID:", docRef.id);
      alert("Producto guardado correctamente.");

      setNombre("");
      setCantidad("");
      setCosto("");
      setIngreso("KG");
      setFile(null);
      setCantidadPaquete("");
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      alert("Hubo un error al guardar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarInventario />
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto", marginTop: "5%" }}>
        <h2>Agregar Producto</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Nombre del Producto:</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Cantidad:</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              step={ingreso === "KG" ? "0.01" : "1"}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Costo:</label>
            <input
              type="number"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              step={"0.01"}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Tipo de Ingreso:</label>
            <select
              value={ingreso}
              onChange={(e) => {
                setIngreso(e.target.value);
                setCantidad("");
              }}
              required
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="KG">KG</option>
              <option value="Unidades">Unidades</option>
              <option value="Paquetes">Paquetes</option>
            </select>
          </div>

          {ingreso === "Paquetes" && ( // Mostrar solo si el tipo de ingreso es "Paquetes"
            <div style={{ marginBottom: "15px" }}>
              <label>Cantidad unitaria por paquete:</label>
              <input
                type="number"
                value={cantidadPaquete}
                onChange={(e) => setCantidadPaquete(e.target.value)}
                step="1"
                required
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "15px" }}>
            <label>Imagen del Producto:</label>
            <input
              type="file"
              onChange={handleFileChange}
              style={{ width: "100%", padding: "8px" }}
            />
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
            {isSubmitting ? "Guardando..." : "Guardar Producto"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AgregarProductoInventarioAdmin;