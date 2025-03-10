import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";

const urlImagenBlanco = "https://firebasestorage.googleapis.com/v0/b/restaurante-fbf21.firebasestorage.app/o/productos%2Ffondo%20blanco.jpeg?alt=media&token=de3a3e6f-110c-4612-b992-3b221a813549";

function CreacionPlatilloMenu() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState(null);
  const [listaIngredientes, setListaIngredientes] = useState([]);
  const [listaMenu, setListaMenu] = useState([]);
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ObtenerInventario();
    ObtenerMenu();
  }, []);

  const ObtenerMenu = async () => {
    try {
      const productosRef = collection(db, "menu");
      const q = query(productosRef);
      const querySnapshot = await getDocs(q);
      const productsData = [];

      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });

      setListaMenu(productsData);
    } catch (error) {
      console.error("Error obteniendo los productos: ", error);
    }
  };

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

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCheckboxChange = (ingrediente) => {
    const existe = ingredientesSeleccionados.some((ing) => ing.id === ingrediente.id);

    if (existe) {
      setIngredientesSeleccionados((prev) =>
        prev.filter((ing) => ing.id !== ingrediente.id)
      );
    } else {
      setIngredientesSeleccionados((prev) => [
        ...prev,
        { ...ingrediente, cantidad: 1 },
      ]);
    }
  };

  const handleCheckboxChangeExtras = (extra) => {
    const existe = extrasSeleccionados.some((ext) => ext.id === extra.id);

    if (existe) {
      setExtrasSeleccionados((prev) =>
        prev.filter((ext) => ext.id !== extra.id)
      );
    } else {
      setExtrasSeleccionados((prev) => [
        ...prev,
        { ...extra, costo: 0, extra: true },
      ]);
    }
  };

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

  const handleCostoChangeExtras = (id, costo) => {
    const nuevoCosto = parseFloat(costo);
    if (nuevoCosto < 0) {
      alert("El costo no puede ser menor a 0.");
      return;
    }

    setExtrasSeleccionados((prev) =>
      prev.map((ext) =>
        ext.id === id ? { ...ext, costo: nuevoCosto } : ext
      )
    );
  };

  const handleExtraChange = (id, extra) => {
    setExtrasSeleccionados((prev) =>
      prev.map((ext) =>
        ext.id === id ? { ...ext, extra: extra === "true" } : ext
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !precio || !descripcion || ingredientesSeleccionados.length === 0) {
      alert("Por favor, completa todos los campos y selecciona al menos un ingrediente.");
      return;
    }

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
      if (downloadUrl === "") {
        downloadUrl = urlImagenBlanco;
      }

      const platillo = {
        nombre,
        precio: parseFloat(precio),
        descripcion,
        url: downloadUrl,
        estatus: true,
        ingredientes: ingredientesSeleccionados.map((ing) => ({
          id: ing.id,
          nombre: ing.nombre,
          cantidad: ing.cantidad,
          unitario: ing.ingreso !== "KG",
        })),
        extras: extrasSeleccionados.map((ext) => ({
          id: ext.id,
          nombre: ext.nombre,
          costo: ext.costo,
          extra: ext.extra,
        })),
      };

      const docRef = await addDoc(collection(db, "menu"), platillo);
      console.log("Platillo creado con ID:", docRef.id);
      alert("Platillo creado correctamente.");

      setNombre("");
      setPrecio("");
      setDescripcion("");
      setFile(null);
      setIngredientesSeleccionados([]);
      setExtrasSeleccionados([]);
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
                  {ingrediente.nombre} :
                </label>
                {ingredientesSeleccionados.some((ing) => ing.id === ingrediente.id) && (
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={
                      ingredientesSeleccionados.find((ing) => ing.id === ingrediente.id)?.cantidad
                    }
                    onChange={(e) => handleCantidadChange(ingrediente.id, e.target.value)}
                    min="1"
                    required
                    style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
                  />
                )}
                {" "} {ingrediente.ingreso === "KG" ? "Gramos" : "Unidades"}
              </div>
            ))}
          </div>


          <div style={{ marginBottom: "15px" }}>
            <label>Extras:</label>
            {listaMenu.map((platillo) => (
              <div key={platillo.id} style={{ marginBottom: "10px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={extrasSeleccionados.some((ext) => ext.id === platillo.id)}
                    onChange={() => handleCheckboxChangeExtras(platillo)}
                  />
                  {platillo.nombre} :
                </label>
                {extrasSeleccionados.some((ext) => ext.id === platillo.id) && (
                  <>
                  <br/>
                  Costo
                    <input
                      type="number"
                      placeholder="Costo"
                      value={
                        extrasSeleccionados.find((ext) => ext.id === platillo.id)?.costo
                      }
                      onChange={(e) => handleCostoChangeExtras(platillo.id, e.target.value)}
                      min="0"
                      required
                      style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
                    />
                    El platillo es un extra?
                    <select
                      value={extrasSeleccionados.find((ext) => ext.id === platillo.id)?.extra ? "true" : "false"}
                      onChange={(e) => handleExtraChange(platillo.id, e.target.value)}
                      required
                      style={{ width: "100%", padding: "8px" }}
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </>
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