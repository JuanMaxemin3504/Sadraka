import React, { useState } from "react";
import { db, storage } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";

function CreacionPlatilloMenu() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleIngredienteChange = (index, field, value) => {
    const nuevosIngredientes = [...ingredientes];
    nuevosIngredientes[index][field] = value;
    setIngredientes(nuevosIngredientes);
  };

  const agregarIngrediente = () => {
    setIngredientes([...ingredientes, { nombre: "", cantidad: 0, unitario: false }]);
  };

  const eliminarIngrediente = (index) => {
    const nuevosIngredientes = ingredientes.filter((_, i) => i !== index);
    setIngredientes(nuevosIngredientes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !precio || !descripcion || ingredientes.length === 0) {
      alert("Por favor, completa todos los campos y agrega al menos un ingrediente.");
      return;
    }

    if (file && !file.type.startsWith("image/")) {
      alert("Por favor, sube solo archivos de imagen.");
      return;
    }

    setIsSubmitting(true);

    try {
      let downloadUrl = "";
      if (file) {
        const storageRef = ref(storage, `platillos/${file.name}`);
        await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(storageRef);
      }

      const platillo = {
        nombre,
        precio: parseFloat(precio),
        descripcion,
        url: downloadUrl,
        estatus: true, // Estatus siempre comienza en true
        ingredientes: ingredientes.map((ing) => ({
          nombre: ing.nombre,
          cantidad: parseFloat(ing.cantidad),
          unitario: ing.unitario,
        })),
      };

      const docRef = await addDoc(collection(db, "menu"), platillo);
      console.log("Platillo creado con ID:", docRef.id);
      alert("Platillo creado correctamente.");

      // Limpiar el formulario
      setNombre("");
      setPrecio("");
      setDescripcion("");
      setFile(null);
      setIngredientes([]);
    } catch (error) {
      console.error("Error al crear el platillo:", error);
      alert("Hubo un error al crear el platillo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMenuAdmin />
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Crear Platillo</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Nombre del Platillo:</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Precio:</label>
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              step="0.01"
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Descripción:</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Imagen del Platillo:</label>
            <input
              type="file"
              onChange={handleFileChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Ingredientes:</label>
            {ingredientes.map((ingrediente, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="Nombre del ingrediente"
                  value={ingrediente.nombre}
                  onChange={(e) => handleIngredienteChange(index, "nombre", e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
                />
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={ingrediente.cantidad}
                  onChange={(e) => handleIngredienteChange(index, "cantidad", e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={ingrediente.unitario}
                    onChange={(e) => handleIngredienteChange(index, "unitario", e.target.checked)}
                  />
                  Unitario
                </label>
                <button
                  type="button"
                  onClick={() => eliminarIngrediente(index)}
                  style={{ marginLeft: "10px" }}
                >
                  Eliminar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={agregarIngrediente}
              style={{ marginTop: "10px" }}
            >
              Agregar Ingrediente
            </button>
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
            {isSubmitting ? "Guardando..." : "Guardar Platillo"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreacionPlatilloMenu;