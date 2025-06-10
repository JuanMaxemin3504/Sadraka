import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { doc, getDoc, updateDoc, collection, query, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const urlImagenBlanco = "https://whatcolor.net/wp-content/uploads/2022/04/Significado-del-color-blanco.png";

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
    const [secciones, setSecciones] = useState([]);
    const [tiempo, setTiempo] = useState("");
    const [prioridad, setPrioriad] = useState(1);
    const [vistaActual, setVistaActual] = useState(1); // 1 = info, 2 = ingredientes

    const [seccionSeleccionada, setSeccionSeleccionada] = useState({
        id: "",
        nombre: "",
    });

    const navigate = useNavigate();

    useEffect(() => {
        ObtenerInventario();
        CargarPlatillo();
        ObtenerMenu();
        ObternerSecciones();
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

    const ObternerSecciones = async () => {
        try {
            const productosRef = collection(db, "secciones");
            const q = query(productosRef);
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
                    merma: ingrediente.merma || 0 // Incluimos merma con valor inicial 0
                },
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

    const CargarPlatillo = async () => {
        try {
            const platilloRef = doc(db, "menu", id);
            const platilloDoc = await getDoc(platilloRef);
            if (platilloDoc.exists()) {
                const platilloData = platilloDoc.data();
                setNombre(platilloData.nombre);
                setPrecio(platilloData.precio.toString());
                setDescripcion(platilloData.descripcion);
                
                // Asegurarnos que cada ingrediente tenga su merma (o 0 si no existe)
                const ingredientesConMerma = platilloData.ingredientes.map(ing => ({
                    ...ing,
                    merma: ing.merma || 0
                }));
                
                setIngredientesSeleccionados(ingredientesConMerma);
                setExtrasSeleccionados(platilloData.extras || []);
                setPrioriad(platilloData.prioridad);
                setTiempo(platilloData.tiempo);
                setSecciones(platilloData.seccion);
                setSeccionSeleccionada({
                    id: platilloData.seccion.id,
                    nombre: platilloData.seccion.nombre,
                });
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

        setIsSubmitting(true);

        let costeNeto = 0;

        ingredientesSeleccionados.forEach((ing) => {
            const ingredienteCompleto = listaIngredientes.find((item) => item.id === ing.id);
            if (!ingredienteCompleto) return;

            const costoUnitario = ingredienteCompleto.costo || 0;
            const esPorKilo = ingredienteCompleto.ingreso === "KG";
            const cantidad = ing.cantidad;
            const merma = ing.merma || 0;

            // Ajustamos la cantidad por la merma
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
                    merma: ing.merma || 0 // Incluimos la merma en cada ingrediente
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
                costeNeto: parseFloat(costeNeto.toFixed(2))
            };

            await updateDoc(doc(db, "menu", id), platillo); 
            navigate("/menu_admin");
        } catch (error) {
            console.error("Error al actualizar el platillo:", error);
            alert("Hubo un error al actualizar el platillo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const subirImagen = async (file) => {
        const storageRef = ref(storage, `platillos/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarMenuAdmin />
            <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
                <h2>Editar Platillo</h2>
        
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

export default EdicionMenuAdmin;