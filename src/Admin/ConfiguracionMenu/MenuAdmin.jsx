import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { deleteObject, ref } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";

const urlImagenBlanco = "https://firebasestorage.googleapis.com/v0/b/restaurante-fbf21.firebasestorage.app/o/productos%2Ffondo%20blanco.jpeg?alt=media&token=de3a3e6f-110c-4612-b992-3b221a813549";

const getProducts = async () => {
    try {
        const productosRef = collection(db, "menu");
        const q = query(productosRef);
        const querySnapshot = await getDocs(q);
        const productsData = [];

        querySnapshot.forEach((doc) => {
            productsData.push({ id: doc.id, ...doc.data() });
        });

        return productsData;
    } catch (error) {
        console.error("Error obteniendo los productos: ", error);
        return [];
    }
};

const getSecciones = async () => {
    try {
        const productosRef = collection(db, "seccciones");
        const q = query(productosRef);
        const querySnapshot = await getDocs(q);
        const productsData = [];

        querySnapshot.forEach((doc) => {
            productsData.push({ id: doc.id, ...doc.data() });
        });

        return productsData;
    } catch (error) {
        console.error("Error obteniendo los productos: ", error);
        return [];
    }
};

function MenuAdmin() {
    const [products, setProducts] = useState([]);
    const [secciones, setSecciones] = useState([]);

    useEffect(() => {
        console.log("Cargando productos al montar el componente...");
        loadProducts();
        loadSeccion();
    }, []);

    const loadProducts = async () => {
        console.log("Cargando productos...");
        const productsData = await getProducts();
        console.log("Productos cargados:", productsData);
        setProducts(productsData);
    };

    const loadSeccion = async () => {
        console.log("Cargando productos...");
        const productsData = await getSecciones();
        console.log("Productos cargados:", productsData);
        setSecciones(productsData);
    };


    const handleDelete = async (productId, url, nom) => {
        const usuarioConfirmo = window.confirm("Estas seguro que quieres eliminar el platillo " + nom);
        if (usuarioConfirmo) {
            try {
                /*
                if (url != urlImagenBlanco) {
                    const startIndex = url.indexOf("/o/") + 3;
                    const endIndex = url.indexOf("?alt=media");
                    const encodedFilePath = url.substring(startIndex, endIndex);
                    const filePath = decodeURIComponent(encodedFilePath);
                    const fileRef = ref(storage, filePath);
                    try {
                        await deleteObject(fileRef);
                        console.log("Archivo eliminado correctamente.");
                    } catch (error) {
                        console.error("Error al eliminar el archivo:", error);
                    }
                }
                 */
                await deleteDoc(doc(db, "menu", productId));
                alert("Producto eliminado correctamente.");
                loadProducts();
            } catch (error) {
                console.error("Error al eliminar el producto:", error);
                alert("Hubo un error al eliminar el producto.");
            }
        }
    };

    const handleStatus = async (productId, estatus) => {
        try {
            const productRef = doc(db, "menu", productId);
            if (estatus == true) {
                await updateDoc(productRef, {
                    estatus: false
                });
            } else {
                await updateDoc(productRef, {
                    estatus: true
                });
            }
            window.location.reload();
        } catch (error) {
            console.error("Error al actualizar el producto:", error);
            alert("Hubo un error al actualizar el producto.");
        }
    }


    const mapaSecciones = new Map();
    secciones.forEach((seccion) => {
        mapaSecciones.set(seccion.id, seccion.posicion);
    });

    const platillosOrdenados = products.sort((a, b) => {
        if (a.seccion === null) return 1;
        if (b.seccion === null) return -1;

        const posicionA = mapaSecciones.get(a.seccion.id);
        const posicionB = mapaSecciones.get(b.seccion.id);

        if (posicionA === posicionB) {
            return a.nombre.localeCompare(b.nombre);
        }

        return posicionA - posicionB;
    });


    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarMenuAdmin />
            <div style={{ justifyContent: 'center', padding: '20px' }}>
                <h1 style={{ textAlign: 'center', padding: '20px' }}>
                    <div >
                        Lista de Productos
                    </div>
                </h1>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Imagen</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Nombre y seccion</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Precio</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Coste</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Descripción</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Ingredientes</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Complementos y extras</th>
                            <th></th>
                            <th></th>
                            <th></th>

                        </tr>
                    </thead>
                    <tbody>
                        {platillosOrdenados.map((product) => (
                            <tr key={product.id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {product.url && (
                                        <img
                                            src={product.url}
                                            alt={product.nombre}
                                            style={{ width: '100px', height: '100px', borderRadius: '10px' }}
                                        />
                                    )}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{product.nombre} <br /> {product.seccion != null ? "Seccion: " + product.seccion.nombre : "Sin seccion"}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>${product.precio}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>${product.costeNeto}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{product.descripcion}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {product.ingredientes.map((ingrediente, index) => (
                                        <div key={index}>
                                            <h5>{ingrediente.nombre}</h5>
                                        </div>
                                    ))}
                                </td>

                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {product.extras == null ?
                                        "Este platillo no tiene extras o complementos"
                                        :
                                        product.extras
                                            .sort((a, b) => {
                                                if (a.extra === b.extra) {
                                                    return a.nombre.localeCompare(b.nombre);
                                                }
                                                return a.extra ? 1 : -1;
                                            })
                                            .map((ob, index) => (
                                                <div key={index}>
                                                    {ob.extra === true ? "Extra" : "Complemento"}: {ob.nombre}
                                                </div>
                                            ))
                                    }
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <Link to={`/edicion_platillo/${product.id}`}>
                                        <button
                                            disabled={product.baja}
                                            style={{
                                                backgroundColor: '#007bff',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                cursor: product.baja ? "not-allowed" : "pointer",
                                                marginRight: '5px',
                                            }}
                                        >
                                            Editar
                                        </button>
                                    </Link>
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        disabled={product.baja}
                                        onClick={() => handleDelete(product.id, product.url, product.nombre)}
                                        style={{
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            padding: '5px 10px',
                                            borderRadius: '5px',
                                            cursor: product.baja ? "not-allowed" : "pointer",
                                            marginRight: '5px'
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        disabled={product.baja}
                                        onClick={() => handleStatus(product.id, product.estatus)}
                                        style={{
                                            backgroundColor: product.estatus === true ? 'green' : 'gray',
                                            color: 'white',
                                            border: 'none',
                                            padding: '5px 10px',
                                            borderRadius: '5px',
                                            cursor: product.baja ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {product.estatus === true ? "Activo" : "Inactivo"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MenuAdmin;