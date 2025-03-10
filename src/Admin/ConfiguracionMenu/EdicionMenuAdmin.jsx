import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { doc, getDoc, updateDoc, collection, query, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";
import { useParams } from "react-router-dom";

const urlImagenBlanco = "https://firebasestorage.googleapis.com/v0/b/restaurante-fbf21.appspot.com/o/productos%2Ffondo%20blanco.jpeg?alt=media&token=de3a3e6f-110c-4612-b992-3b221a813549";

function EdicionMenuAdmin() {
    const { id } = useParams();
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
        CargarPlatillo();
        ObtenerMenu();
    }, [id]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

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

    const CargarPlatillo = async () => {
        try {
            const platilloRef = doc(db, "menu", id);
            const platilloDoc = await getDoc(platilloRef);
            if (platilloDoc.exists()) {
                const platilloData = platilloDoc.data();
                setNombre(platilloData.nombre);
                setPrecio(platilloData.precio.toString());
                setDescripcion(platilloData.descripcion);
                setIngredientesSeleccionados(platilloData.ingredientes);
                setExtrasSeleccionados(platilloData.extras || []);
            } else {
                alert("Platillo no encontrado");
            }
        } catch (error) {
            console.error("Error cargando el platillo: ", error);
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!nombre || !precio || !descripcion || ingredientesSeleccionados.length === 0) {
            alert("Por favor, completa todos los campos y selecciona al menos un ingrediente.");
            return;
        }

        setIsSubmitting(true);

        try {
            let downloadUrl = "";
            if (file) {
                const storageRef = ref(storage, `platillos/${file.name}`);
                await uploadBytes(storageRef, file);
                downloadUrl = await getDownloadURL(storageRef);
            } else {
                downloadUrl = urlImagenBlanco;
            }

            const platillo = {
                nombre,
                precio: parseFloat(precio),
                descripcion,
                url: downloadUrl,
                estatus: true,
                ingredientes: ingredientesSeleccionados,
                extras: extrasSeleccionados,
            };

            await updateDoc(doc(db, "menu", id), platillo);
            alert("Platillo actualizado correctamente.");
        } catch (error) {
            console.error("Error al actualizar el platillo:", error);
            alert("Hubo un error al actualizar el platillo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarMenuAdmin />
            <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
                <h2>Editar Platillo</h2>
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
                                        <br />
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
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Actualizando..." : "Actualizar Platillo"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default EdicionMenuAdmin;