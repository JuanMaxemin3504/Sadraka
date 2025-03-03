import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, getDocs } from "firebase/firestore";

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
        return []; // Retorna un array vacío en caso de error
    }
};

function ProductTable() {
    const [products, setProducts] = useState([]);

    const loadProducts = async () => {
        console.log("Cargando productos...");
        const productsData = await getProducts(); // Obtiene los productos
        console.log("Productos cargados:", productsData);
        setProducts(productsData); // Actualiza el estado con los productos
    };

    useEffect(() => {
        console.log("Cargando productos al montar el componente...");
        loadProducts();
    }, []);

    return (
        <div>
            <h1>Lista de Productos</h1>
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product.id}>
                            <td>{product.nombre}</td>
                            <td>{product.cantidad}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ProductTable;