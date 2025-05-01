import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import NavBarInventario from '../NavBars/NavBarInventario';
import { Link } from "react-router-dom";
import { deleteObject, ref } from "firebase/storage";

const urlImagenBlanco = "https://tse3.mm.bing.net/th/id/OIP.0nEFZ6umUtwq2FJce32emgHaE8?rs=1&pid=ImgDetMain"

const getProducts = async () => {
  try {
    const productosRef = collection(db, "products");
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

function InvenarioAdmin() {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    console.log("Cargando productos...");
    const productsData = await getProducts();
    console.log("Productos cargados:", productsData);
    setProducts(productsData);
  };

  useEffect(() => {
    console.log("Cargando productos al montar el componente...");
    loadProducts();
  }, []);

  const handleDelete = async (productId, url, nom) => {
    const usuarioConfirmo = window.confirm("Estas seguro que quieres eliminar el platillo " + nom);
    if (usuarioConfirmo) {
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
        await deleteDoc(doc(db, "products", productId));
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
      const productRef = doc(db, "products", productId);
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

  const handleBaja = async (productId, baja) => {
    try {
      const productRef = doc(db, "products", productId);
      if (baja == true) {
        await updateDoc(productRef, {
          baja: false
        });
      } else {
        await updateDoc(productRef, {
          baja: true
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
      <NavBarInventario />
      <div style={{ justifyContent: 'center', padding: '20px' }}>
        <h1>Lista de Productos</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', textAlign: 'center' }}>Imagen</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Nombre</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Costo por unidad</th>
              <th></th>
              <th></th>
              <th></th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Estatus</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Producto dado de baja</th>
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
                <td style={{ padding: '10px', textAlign: 'center' }}>{product.cantidad} {product.ingreso === "KG" ? "KG" : "Unidades"}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>${product.costo}</td>

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
                  <Link to={`/agregar_inventario/${product.id}`}>
                    <button
                      disabled={product.baja}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        cursor: product.baja ? "not-allowed" : "pointer",
                      }}
                    >
                      Agregar inventario
                    </button>
                  </Link>
                </td>


                <td style={{ textAlign: 'center' }}>
                  <button
                    disabled={product.baja}
                    onClick={() => handleStatus(product.id, product.estatus)}
                    style={{
                      backgroundColor: product.estatus === true && product.baja == false ? 'green' : 'gray',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      cursor: product.baja ? "not-allowed" : "pointer",
                    }}
                  >
                    {product.baja === true ? "Suspendido" : product.estatus === true ? "Activo" : "Baja"}
                  </button>
                </td>

                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => handleBaja(product.id, product.baja)}
                    style={{
                      backgroundColor: product.baja === false ? 'green' : 'gray',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    {product.baja == false ? "Alta" : "Baja"}
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

export default InvenarioAdmin;