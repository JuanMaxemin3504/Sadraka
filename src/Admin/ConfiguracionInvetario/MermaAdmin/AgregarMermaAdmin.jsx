import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, getDocs, serverTimestamp, addDoc } from "firebase/firestore";
import NavBarMerma from "../../NavBars/NavBarMerma";

function AgregarMermaAdmin() {
    const [listaPlatillos, setListaPlatillos] = useState([]);
    const [listaInventario, setListaInventario] = useState([]);
    const [mostrarInventario, setMostrarInventario] = useState(true);
    const [merma, setMerma] = useState({
        id: "",
        nombre: "",
        gramaje: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cantidad, setCantidad] = useState(0);

    useEffect(() => {
        getInventario();
        getPlatillos();
    }, []);

    const getPlatillos = async () => {
        try {
            const productosRef = collection(db, "menu");
            const q = query(
                productosRef, (
                where("bloqueo", "==", false),
                where("estatus", "==", true))
            );
            const querySnapshot = await getDocs(q);
            const productsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setListaPlatillos(productsData);
        } catch (error) {
            console.error("Error obteniendo los platillos: ", error);
        }
    };

    const getInventario = async () => {
        try {
            const productosRef = collection(db, "products");
            const q = query(
                productosRef, (
                where("baja", "==", false),
                where("estatus", "==", true))
            );
            const querySnapshot = await getDocs(q);
            const productsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setListaInventario(productsData);
        } catch (error) {
            console.error("Error obteniendo el inventario: ", error);
        }
    };

    const chunkArray = (array, size) => {
        const chunkedArr = [];
        for (let i = 0; i < array.length; i += size) {
            chunkedArr.push(array.slice(i, i + size));
        }
        return chunkedArr;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!merma.id || !merma.nombre || !cantidad) {
            alert("Por favor, completa todos los campos y selecciona al menos un ingrediente.");
            return;
        }

        if (parseInt(cantidad) < 1) {
            alert("La cantidad de la merma debe ser 1 como minimo");
            return;
        }

        setIsSubmitting(true);

        let precioUnitario = 0;

        if (mostrarInventario) {
            const productRef = doc(db, "products", merma.id);
            const productSnap = await getDoc(productRef);
            precioUnitario = parseFloat(productSnap.data().costo / 1000);
        } else {
            const platilloRef = doc(db, "menu", id);
            const platilloDoc = await getDoc(platilloRef);
            precioUnitario = platilloDoc.data().precio;
        }


        try {

            const Merma = {
                producto: merma.nombre,
                cantidad: cantidad,
                inventario: mostrarInventario,
                creacion: serverTimestamp(),
                edicion: serverTimestamp(),
                idReferente: merma.id,
                precioUnitario: precioUnitario,
                aplicada: false, // 🔹 Marca la merma como no aplicada
            };

            const docRef = await addDoc(collection(db, "merma"), Merma);
            console.log("Merma creada con ID:", docRef.id);
            alert("Merma creada correctamente.");

            setMerma({
                id: "",
                nombre: "",
                gramaje: false,
            })
            setCantidad(0)
        } catch (error) {
            console.error("Error al crear el platillo:", error);
            alert("Hubo un error al crear el platillo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarMerma />

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <button
                    onClick={() => (setMostrarInventario(true),
                        setMerma({
                            id: "",
                            nombre: "",
                        })
                    )}
                    style={{
                        margin: '0 10px',
                        padding: '10px 20px',
                        backgroundColor: mostrarInventario ? '#4CAF50' : '#f0f0f0',
                        color: mostrarInventario ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Inventario
                </button>
                <button
                    onClick={() => (setMostrarInventario(false),
                        setMerma({
                            id: "",
                            nombre: "",
                        })
                    )}
                    style={{
                        margin: '0 10px',
                        padding: '10px 20px',
                        backgroundColor: !mostrarInventario ? '#4CAF50' : '#f0f0f0',
                        color: !mostrarInventario ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Platillos
                </button>
            </div>

            <div style={{
                width: '90%',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {mostrarInventario ? (
                    chunkArray(listaInventario, 5).map((row, rowIndex) => (
                        <div key={`inventario-row-${rowIndex}`} style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            width: '100%'
                        }}>
                            {row.map(item => (
                                <button
                                    key={`inventario-${item.id}`}
                                    onClick={() => setMerma({
                                        id: item.id,
                                        nombre: item.nombre,
                                        gramaje: item.ingreso === "KG" ? true : false
                                    })}
                                    style={{
                                        margin: '0 5px',
                                        padding: '10px 15px',
                                        minWidth: '150px',
                                        backgroundColor: merma === item.id ? '#2196F3' : '#f0f0f0',
                                        color: merma === item.id ? 'white' : 'black',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {item.nombre}
                                </button>
                            ))}
                        </div>
                    ))
                ) : (
                    chunkArray(listaPlatillos, 5).map((row, rowIndex) => (
                        <div key={`platillos-row-${rowIndex}`} style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            width: '100%'
                        }}>
                            {row.map(item => (
                                <button
                                    key={`platillos-${item.id}`}
                                    onClick={() => setMerma({
                                        id: item.id,
                                        nombre: item.nombre,
                                    })}
                                    style={{
                                        margin: '0 5px',
                                        padding: '10px 15px',
                                        minWidth: '150px',
                                        backgroundColor: merma === item.id ? '#2196F3' : '#f0f0f0',
                                        color: merma === item.id ? 'white' : 'black',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {item.nombre}
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <form onSubmit={handleSubmit}>
                    <label>{mostrarInventario ? "Producto: " : "Platillo: "}
                        {merma.nombre}
                    </label>
                    <br />

                    <input
                        type="number"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        step={"0.01"}
                        required
                        style={{ width: "100%", padding: "8px" }}
                    />
                    <label> {merma.id ? (mostrarInventario ? (merma.gramaje ? "gramos" : "unidades") : "platillos") : ""} </label>

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
                        {isSubmitting ? "Guardando..." : "Guardar Merma"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AgregarMermaAdmin;