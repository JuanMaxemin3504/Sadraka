import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, addDoc, collection, getDocs, query, deleteDoc } from "firebase/firestore";
import NavBarAdminPromos from "../NavBars/NavBarAdminPromos";


const PromocionesAdmin = () => {
    const navigate = useNavigate();

    const [listaPromociones, setListaPromociones] = useState([]);

    useEffect(() => {
        loadPromociones();
    }, []);

    const loadPromociones = async () => {
        try {
            const querySnapshot = await getDocs(query(collection(db, "promociones")));
            const promocionesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setListaPromociones(promocionesData);
        } catch (error) {
            console.error("Error al cargar las promociones:", error);
        }
    };

    const handleDelete = async (id, nom) => {
        try {
            const usuarioConfirmo = window.confirm("Estas seguro que quieres eliminar la promocion " + nom);
            if (usuarioConfirmo) {
                try {
                    await deleteDoc(doc(db, "promociones", id));
                    loadPromociones();
                } catch (error) {
                    console.error("Error al eliminar la promocion:", error);
                    alert("Hubo un error al eliminar la promocion.");
                }
            }
        } catch (error) {
            console.error("Error al eliminar la promocion:", error);
            alert("Hubo un error al eliminar la promocion.");
        }
    }

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarAdminPromos />
            <div style={{ marginBottom: "15px", textAlign: "center" }}>
                <h1>Promociones</h1>
                <table style={{ width: '100%', borderCollapse: 'collapse', justifyContent: 'center' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Nombre</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Descripción</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Precio</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Tipo de promo</th>
                            <th></th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaPromociones.map((promo) => (
                            <tr key={promo.id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{promo.nombre}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{promo.descripcion}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{promo.tipo == 0 ? "2x1" :
                                    (promo.tipo == 1 ? "3x2" : "$" + promo.precio)}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{promo.tipo == 0 ? "2x1" :
                                    (promo.tipo == 1 ? "3x2" : "Combo / paquete")} </td>

                                <td style={{ textAlign: 'center' }}>
                                    <Link to={`/editar_promociones_admin/${promo.id}`}>
                                        <button
                                            disabled={promo.baja}
                                            style={{
                                                backgroundColor: '#007bff',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                cursor: promo.baja ? "not-allowed" : "pointer",
                                                marginRight: '5px',
                                            }}
                                        >
                                            Editar
                                        </button>
                                    </Link>
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        disabled={promo.baja}
                                        onClick={() => handleDelete(promo.id, promo.nombre)}
                                        style={{
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            padding: '5px 10px',
                                            borderRadius: '5px',
                                            cursor: promo.baja ? "not-allowed" : "pointer",
                                            marginRight: '5px'
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default PromocionesAdmin;