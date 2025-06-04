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

    const [seccionSeleccionada, setSeccionSeleccionada] = useState({
        id: "",
        nombre: "",
    });

    const navigate = useNavigate(); // Inicializa useNavigate

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
                {
                    ...extra,
                    costo: 0, // Inicializamos en 0 (se ajustará después si es extra)
                    extra: true // Por defecto es extra (el usuario puede cambiarlo a complemento)
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

        console.log(seccionSeleccionada)

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
                setPrioriad(platilloData.prioridad);
                setTiempo(platilloData.tiempo);
                setSecciones(platilloData.seccion);
                setSeccionSeleccionada({
                    id: platilloData.seccion.id,
                    nombre: platilloData.seccion.nombre,
                })
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

        // Validación de campos obligatorios
        if (!nombre || !precio || !descripcion || ingredientesSeleccionados.length === 0 || !tiempo) {
            alert("Por favor, completa todos los campos y selecciona al menos un ingrediente.");
            return;
        }

        // Validar que los extras de tipo "extra" tengan costo > 0
        const extraSinCosto = extrasSeleccionados.some(
            (ext) => ext.extra === true && ext.costo <= 0
        );

        if (extraSinCosto) {
            alert("Los extras deben tener un costo mayor a 0.");
            return;
        }

        // Resto de validaciones (tiempo, etc.)
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

            // Si es por kilo, asumimos que el costo es por kilo y la cantidad está en gramos → convertir a kilos
            const cantidadUsada = esPorKilo ? cantidad / 1000 : cantidad;

            costeNeto += cantidadUsada * costoUnitario;
        });

        try {
            // Subir imagen y crear el platillo (código existente)
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

                    <label>Selecciona una sección</label> <br />
                    <select onChange={handleSeccionChange} value={seccionSeleccionada.id} style={{ marginBottom: "15px" }}>
                        <option value="">Sin seccion</option>
                        {secciones.map((seccion) => (
                            <option key={seccion.id} value={seccion.id}>
                                {seccion.nombre}
                            </option>
                        ))}
                    </select>

                    <div style={{ marginBottom: "15px" }}>
                        <label>Tiempo</label>
                        <input
                            type="number"
                            value={tiempo}
                            onChange={(e) => setTiempo(e.target.value)}
                            required
                            style={{ width: "100%", padding: "8px" }}
                        />
                    </div>

                    <label>Prioridad</label> <br />
                    <select onChange={(e) => setPrioriad(e.target.value)} value={prioridad} style={{ marginBottom: "15px" }}>
                        <option value="1">Prioridad alta</option>
                        <option value="2">Prioridad media</option>
                        <option value="3">Prioridad baja</option>
                    </select>

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
                                    {platillo.nombre}
                                </label>
                                {extrasSeleccionados.some((ext) => ext.id === platillo.id) && (
                                    <>
                                        <br />
                                        <select
                                            value={extrasSeleccionados.find((ext) => ext.id === platillo.id)?.extra ? "true" : "false"}
                                            onChange={(e) => handleExtraChange(platillo.id, e.target.value)}
                                            style={{ width: "100%", padding: "8px" }}
                                        >
                                            <option value="true">Extra</option>
                                            <option value="false">Complemento</option>
                                        </select>
                                        {/* Mostrar campo de costo solo si es extra */}
                                        {extrasSeleccionados.find((ext) => ext.id === platillo.id)?.extra && (
                                            <>
                                                <label>Costo:</label>
                                                <input
                                                    type="number"
                                                    placeholder="Costo"
                                                    value={extrasSeleccionados.find((ext) => ext.id === platillo.id)?.costo}
                                                    onChange={(e) => handleCostoChangeExtras(platillo.id, e.target.value)}
                                                    min="0"
                                                    required // Solo requerido para extras
                                                    style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
                                                />
                                            </>
                                        )}
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