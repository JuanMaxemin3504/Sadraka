import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";

const urlImagenBlanco = "https://firebasestorage.googleapis.com/v0/b/restaurante-fbf21.firebasestorage.app/o/productos%2Ffondo%20blanco.jpeg?alt=media&token=de3a3e6f-110c-4612-b992-3b221a813549"

function CreacionPlatilloMenu() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState(null);
  const [listaIngredientes, setListaIngredientes] = useState([]); // Lista completa de ingredientes
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]); // Ingredientes seleccionados con cantidad
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener la lista de ingredientes al cargar el componente
  useEffect(() => {
    const ObtenerInventario = async () => {
      try {
        const productosRef = collection(db, "products");
        const q = query(productosRef);
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setListaIngredientes(productsData);
      } catch (error) {
        console.error("Error obteniendo los productos: ", error);
      }
    };

    ObtenerInventario();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Manejar la selección de ingredientes
  const handleCheckboxChange = (ingrediente) => {
    const existe = ingredientesSeleccionados.some((ing) => ing.id === ingrediente.id);

    if (existe) {
      // Si el ingrediente ya está seleccionado, quitarlo de la lista
      setIngredientesSeleccionados((prev) =>
        prev.filter((ing) => ing.id !== ingrediente.id)
      );
    } else {
      // Si no está seleccionado, agregarlo con cantidad 1 (valor mínimo)
      setIngredientesSeleccionados((prev) => [
        ...prev,
        { ...ingrediente, cantidad: 1 }, // Inicializar con cantidad 1
      ]);
    }
  };

  // Manejar el cambio de cantidad para un ingrediente seleccionado
  const handleCantidadChange = (id, cantidad) => {
    const nuevaCantidad = parseFloat(cantidad);
    if (nuevaCantidad < 1) {
      alert("La cantidad no puede ser menor a 1.");
      return;
    }

    setIngredientesSeleccionados((prev) =>
      prev.map((ing) =>
        ing.id === id ? { ...ing, cantidad: nuevaCantidad } : ing
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todos los campos estén completos
    if (!nombre || !precio || !descripcion || ingredientesSeleccionados.length === 0) {
      alert("Por favor, completa todos los campos y selecciona al menos un ingrediente.");
      return;
    }

    // Validar que la cantidad de cada ingrediente sea mayor o igual a 1
    const cantidadInvalida = ingredientesSeleccionados.some((ing) => ing.cantidad < 1);
    if (cantidadInvalida) {
      alert("La cantidad de cada ingrediente debe ser mayor o igual a 1.");
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
      if(downloadUrl == ""){
        downloadUrl = urlImagenBlanco
      }

      const platillo = {
        nombre,
        precio: parseFloat(precio),
        descripcion,
        url: downloadUrl,
        estatus: true, // Estatus siempre comienza en true
        ingredientes: ingredientesSeleccionados.map((ing) => ({
          id: ing.id,
          nombre: ing.nombre,
          cantidad: ing.cantidad,
          unitario: ing.ingreso !== "KG", // Si no es KG, es unitario
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
      setIngredientesSeleccionados([]);
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
            {listaIngredientes.map((ingrediente) => (
              <div key={ingrediente.id} style={{ marginBottom: "10px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={ingredientesSeleccionados.some((ing) => ing.id === ingrediente.id)}
                    onChange={() => handleCheckboxChange(ingrediente)}
                  />
                  {ingrediente.nombre}
                </label>
                {ingredientesSeleccionados.some((ing) => ing.id === ingrediente.id) && (
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={
                      ingredientesSeleccionados.find((ing) => ing.id === ingrediente.id)?.cantidad
                    }
                    onChange={(e) => handleCantidadChange(ingrediente.id, e.target.value)}
                    min="1" // Establecer el valor mínimo
                    required
                    style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
                  />
                )}
              </div>
            ))}
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