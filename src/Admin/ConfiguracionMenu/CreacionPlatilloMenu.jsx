import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";

const urlImagenBlanco = "https://whatcolor.net/wp-content/uploads/2022/04/Significado-del-color-blanco.png";

function CreacionPlatilloMenu() {
  const [vistaActual, setVistaActual] = useState(1);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState(null);
  const [listaIngredientes, setListaIngredientes] = useState([]);
  const [listaMenu, setListaMenu] = useState([]);
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secciones, setSecciones] = useState([]);
  const [tiempo, setTiempo] = useState("");
  const [prioridad, setPrioriad] = useState("");

  const [seccionSeleccionada, setSeccionSeleccionada] = useState({
    id: "",
    nombre: "",
  });

  useEffect(() => {
    ObtenerInventario();
    ObtenerMenu();
    ObternerSecciones();
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
      console.error("Error obteniendo el menu: ", error);
    }
  };

  const ObternerSecciones = async () => {
    try {
      const productosRef = collection(db, "secciones");
      const q = query(productosRef);
      const querySnapshot = await getDocs(q);

      const seccionesFiltradas = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(seccion => seccion.posicion !== 0);

      setSecciones(seccionesFiltradas);
    } catch (error) {
      console.error("Error obteniendo las secciones: ", error);
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
      console.error("Error obteniendo el inventario: ", error);
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
        {
          ...ingrediente,
          cantidad: 1,
          merma: ingrediente.merma || 0,
          visible: true // Por defecto los ingredientes son visibles
        },
      ]);
    }
  };

  const handleVisibilityChange = (id, visible) => {
    setIngredientesSeleccionados((prev) =>
      prev.map((ing) =>
        ing.id === id ? { ...ing, visible: visible === "true" } : ing
      )
    );
  };

  const handleMermaChange = (id, merma) => {
    const nuevaMerma = parseFloat(merma);
    if (nuevaMerma < 0 || nuevaMerma > 100) {
      alert("La merma debe estar entre 0 y 100%");
      return;
    }
    setIngredientesSeleccionados((prev) =>
      prev.map((ing) =>
        ing.id === id ? { ...ing, merma: nuevaMerma } : ing
      )
    );
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
        {
          ...extra,
          costo: 0,
          extra: true
        },
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

  const handleSeccionChange = (event) => {
    const idSeleccionado = event.target.value;

    if (!idSeleccionado) {
      setSeccionSeleccionada({ id: "", nombre: "" });
      return;
    }

    const seccionElegida = secciones.find(
      (seccion) => seccion.id === idSeleccionado
    );

    if (seccionElegida) {
      setSeccionSeleccionada({
        id: seccionElegida.id,
        nombre: seccionElegida.nombre,
      });
    } else {
      console.log("Error al cambiar la sección");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !precio || !descripcion || ingredientesSeleccionados.length === 0 || !tiempo) {
      alert("Por favor, completa todos los campos y selecciona al menos un ingrediente.");
      return;
    }

    const extraSinCosto = extrasSeleccionados.some(
      (ext) => ext.extra === true && ext.costo <= 0
    );

    if (extraSinCosto) {
      alert("Los extras deben tener un costo mayor a 0.");
      return;
    }

    if (parseInt(tiempo) > 45 || parseInt(tiempo) < 1) {
      alert("El tiempo debe estar entre 1 y 45 minutos.");
      return;
    }

    // Validación de complementos/extras
    let countComplementos = 0;

    // Verificar si algún platillo seleccionado como extra/complemento tiene a su vez extras
    for (const extra of extrasSeleccionados) {
      // Si es complemento (no extra), incrementar contador
      if (extra.extra === false) {
        countComplementos++;
      }

      // Verificar si este platillo tiene sus propios extras
      try {
        const platilloRef = doc(db, "menu", extra.id);
        const platilloDoc = await getDoc(platilloRef);

        if (platilloDoc.exists() && platilloDoc.data().extras?.length > 0) {
          alert(`El platillo "${platilloDoc.data().nombre}" no puede ser extra/complemento porque ya tiene sus propios extras.`);
          return;
        }
      } catch (error) {
        console.error("Error verificando extras del platillo:", error);
        alert("Error al verificar los extras del platillo.");
        return;
      }
    }

    // Validar máximo de complementos
    if (countComplementos > 5) {
      alert("Puedes seleccionar máximo 5 complementos.");
      return;
    }

    setIsSubmitting(true);

    let costeNeto = 0;
    let platilloBloqueado = false;

    ingredientesSeleccionados.forEach((ing) => {
      const ingredienteCompleto = listaIngredientes.find((item) => item.id === ing.id);
      if (!ingredienteCompleto) return;

      if (ingredienteCompleto.baja == true || ingredienteCompleto.estatus == false) { platilloBloqueado = true; }

      const costoUnitario = ingredienteCompleto.costo || 0;
      const esPorKilo = ingredienteCompleto.ingreso === "KG";
      const cantidad = ing.cantidad;
      const merma = ing.merma || 0; // Obtenemos el porcentaje de merma

      // Ajustamos la cantidad por la merma (si hay 10% de merma, necesitamos 10% más de ingrediente)
      const cantidadAjustada = cantidad / (1 - (merma / 100));

      // Si es por kilo, convertimos a kilos
      const cantidadUsada = esPorKilo ? cantidadAjustada / 1000 : cantidadAjustada;

      costeNeto += cantidadUsada * costoUnitario;
    });

    try {
      let downloadUrl = file ? await subirImagen(file) : urlImagenBlanco;

      const platillo = {
        nombre,
        precio: parseFloat(precio),
        descripcion,
        url: downloadUrl,
        estatus: true,
        tiempo: parseInt(tiempo),
        prioridad: parseInt(prioridad),
        ingredientes: ingredientesSeleccionados.map((ing) => ({
          id: ing.id,
          nombre: ing.nombre,
          cantidad: ing.cantidad,
          unitario: ing.ingreso !== "KG",
          merma: ing.merma || 0,
          visible: ing.visible // Incluimos la visibilidad
        })),
        extras: extrasSeleccionados.length > 0
          ? extrasSeleccionados.map((ext) => {
            const data = {
              id: ext.id,
              nombre: ext.nombre,
              extra: ext.extra,
            };
            if (ext.extra) {
              data.costo = parseFloat(ext.costo) || 0;
            }
            return data;
          })
          : null,
        seccion: seccionSeleccionada.id
          ? { id: seccionSeleccionada.id, nombre: seccionSeleccionada.nombre }
          : { id: "hkw1cc4AbTex3jEQlFBR", nombre: "Seccion Base" },
        costeNeto: parseFloat(costeNeto.toFixed(2)),
        bloqueo: platilloBloqueado,
      };

      await addDoc(collection(db, "menu"), platillo);
      alert("Platillo creado correctamente.");
      resetForm();
    } catch (error) {
      console.error("Error al crear el platillo:", error);
      alert("Hubo un error al crear el platillo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subirImagen = async (file) => {
    const storageRef = ref(storage, `platillos/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const resetForm = () => {
    setNombre("");
    setPrecio("");
    setDescripcion("");
    setFile(null);
    setIngredientesSeleccionados([]);
    setExtrasSeleccionados([]);
    setTiempo("");
    setPrioriad("");
    setSeccionSeleccionada({ id: "", nombre: "" });
    setVistaActual(1);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMenuAdmin />
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <h2>Crear Platillo</h2>

        {vistaActual === 1 && (
          <form>
            <div style={{ marginBottom: "15px" }}>
              <label>Nombre del Platillo:</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Precio:</label>
              <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} step="0.01" required style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Descripción:</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Imagen:</label>
              <input type="file" onChange={handleFileChange} style={{ width: "100%" }} />
            </div>
            <label>Sección:</label><br />
            <select onChange={handleSeccionChange} value={seccionSeleccionada.id} style={{ marginBottom: "15px" }}>
              <option value="">Sin sección</option>
              {secciones.map((seccion) => (
                <option key={seccion.id} value={seccion.id}>{seccion.nombre}</option>
              ))}
            </select>
            <div style={{ marginBottom: "15px" }}>
              <label>Tiempo (min):</label>
              <input type="number" value={tiempo} onChange={(e) => setTiempo(e.target.value)} required style={{ width: "100%" }} />
            </div>
            <label>Prioridad:</label><br />
            <select onChange={(e) => setPrioriad(e.target.value)} value={prioridad} style={{ marginBottom: "15px" }}>
              <option value="1">Alta</option>
              <option value="2">Media</option>
              <option value="3">Baja</option>
            </select>
            <button type="button" onClick={() => setVistaActual(2)} style={{ width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px" }}>
              Siguiente: Ingredientes
            </button>
          </form>
        )}

        {vistaActual === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label>Ingredientes:</label>
              {listaIngredientes.map((ingrediente) => {
                const seleccionado = ingredientesSeleccionados.find((ing) => ing.id === ingrediente.id);
                return (
                  <div key={ingrediente.id}>
                    <label>
                      <input type="checkbox" checked={!!seleccionado} onChange={() => handleCheckboxChange(ingrediente)} />
                      {ingrediente.nombre}
                    </label>
                    {seleccionado && (
                      <>
                        <input
                          type="number"
                          placeholder="Cantidad"
                          value={seleccionado.cantidad}
                          onChange={(e) => handleCantidadChange(ingrediente.id, e.target.value)}
                          min="1"
                          style={{ width: "40%", margin: "5px" }}
                        />
                        {ingrediente.ingreso === "KG" ? "gramos" : "unidades"}
                        <input
                          type="number"
                          placeholder="% Merma"
                          value={seleccionado.merma}
                          onChange={(e) => handleMermaChange(ingrediente.id, e.target.value)}
                          min="0"
                          max="100"
                          step="1"
                          style={{ width: "40%", margin: "5px" }}
                        />
                        % merma
                        <select
                          value={seleccionado.visible ? "true" : "false"}
                          onChange={(e) => handleVisibilityChange(ingrediente.id, e.target.value)}
                          style={{ width: "100%", marginTop: "5px" }}
                        >
                          <option value="true">Visible para cliente</option>
                          <option value="false">Oculto para cliente</option>
                        </select>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Extras y complementos:</label>
              {listaMenu.map((platillo) => {
                const extra = extrasSeleccionados.find((ext) => ext.id === platillo.id);
                return (
                  <div key={platillo.id}>
                    <label>
                      <input type="checkbox" checked={!!extra} onChange={() => handleCheckboxChangeExtras(platillo)} />
                      {platillo.nombre}
                    </label>
                    {extra && (
                      <>
                        <select value={extra.extra ? "true" : "false"} onChange={(e) => handleExtraChange(platillo.id, e.target.value)} style={{ width: "100%" }}>
                          <option value="true">Extra</option>
                          <option value="false">Complemento</option>
                        </select>
                        {extra.extra && (
                          <input type="number" value={extra.costo} onChange={(e) => handleCostoChangeExtras(platillo.id, e.target.value)} min="0" placeholder="Costo extra" style={{ width: "100%", marginTop: "5px" }} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => setVistaActual(1)} style={{ padding: "10px" }}>Atrás</button>
              <button type="submit" disabled={isSubmitting} style={{ padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px" }}>
                {isSubmitting ? "Guardando..." : "Guardar Platillo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreacionPlatilloMenu;