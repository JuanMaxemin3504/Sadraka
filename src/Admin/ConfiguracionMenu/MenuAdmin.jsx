import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { deleteObject, ref } from "firebase/storage";
import NavBarMenuAdmin from "../NavBars/NavBarMenuAdmin";

// Función para obtener los productos del menú
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

function MenuAdmin() {
    const [products, setProducts] = useState([]); // Estado para almacenar los productos

    useEffect(() => {
        console.log("Cargando productos al montar el componente...");
        loadProducts();
    }, []);

    // Función para cargar los productos
    const loadProducts = async () => {
        console.log("Cargando productos...");
        const productsData = await getProducts();
        console.log("Productos cargados:", productsData);
        setProducts(productsData);
    };

    const handleDelete = async (productId, url) => {
        try {
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
          await deleteDoc(doc(db, "menu", productId));
          alert("Producto eliminado correctamente.");
          loadProducts();
        } catch (error) {
          console.error("Error al eliminar el producto:", error);
          alert("Hubo un error al eliminar el producto.");
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

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarMenuAdmin />
            <div style={{ justifyContent: 'center', padding: '20px' }}>
                <h1>Lista de Productos</h1>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Imagen</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Nombre</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Precio</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Descripción</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Ingredientes</th>
                            <th></th>
                            <th></th>
                            <th></th>

                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
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
                                <td style={{ padding: '10px', textAlign: 'center' }}>{product.nombre}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>${product.precio}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{product.descripcion}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {product.ingredientes.map((ingrediente, index) => (
                                        <div key={index}>
                                            <h5>{ingrediente.nombre}</h5>
                                        </div>
                                    ))}
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <Link to={`/edicion_inventario/${product.id}`}>
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
                                        onClick={() => handleDelete(product.id, product.url)}
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