import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import {doc, updateDoc, getDoc } from "firebase/firestore";
import NavBarSistemaAdmin from "../NavBars/NavBarSistemaAdmin";

const ConfigurarSistemaAdmin = () => {

    useEffect(() => {
        getOrdenamientoMetod();
        getPedidoParallevar();
        getAutopedidoCliente();
    }, []);

    const [metodo, setMetodo] = useState(false);
    const [pedidoParaLlevar, setPedidoParaLlevar] = useState(false);
    const [autopedidoCliente, setAutopedidoCliente] = useState(false);


    const getOrdenamientoMetod = async () => {
        try {
            const InformacionRef = doc(db, "informacion", "MetodoOrdenamiento");
            const InformacionDoc = await getDoc(InformacionRef);
            const InformacionData = InformacionDoc.data();
            setMetodo(InformacionData.prioridad);
        } catch (error) {
            console.error("Error obteniendo el metodo de ordenamiento: ", error);
        }
    };

    const getPedidoParallevar = async () => {
        try {
            const InformacionRef = doc(db, "informacion", "PedidoParaLlevar");
            const InformacionDoc = await getDoc(InformacionRef);
            const InformacionData = InformacionDoc.data();
            setPedidoParaLlevar(InformacionData.activado);
        } catch (error) {
            console.error("Error obteniendo el metodo de ordenamiento: ", error);
        }
    };

    const getAutopedidoCliente = async () => {
        try {
            const InformacionRef = doc(db, "informacion", "AutopedidoCliente");
            const InformacionDoc = await getDoc(InformacionRef);
            const InformacionData = InformacionDoc.data();
            setAutopedidoCliente(InformacionData.activado);
        } catch (error) {
            console.error("Error obteniendo el metodo de ordenamiento: ", error);
        }
    };

    const handleMetodo = async () => {
        try {
            const metodRef = doc(db, "informacion", "MetodoOrdenamiento");
            if (metodo == true) {
                await updateDoc(metodRef, {
                    prioridad: false
                });
            } else {
                await updateDoc(metodRef, {
                    prioridad: true
                });
            }
            window.location.reload();
        } catch (error) {
            console.error("Error al actualizar el producto:", error);
            alert("Hubo un error al actualizar el producto.");
        }
    }

    const handlePedidoParaLlevar = async () => {
        try {
            const pedidoRef = doc(db, "informacion", "PedidoParaLlevar");
            if (pedidoParaLlevar == true) {
                await updateDoc(pedidoRef, {
                    activado: false
                });
            } else {
                await updateDoc(pedidoRef, {
                    activado: true
                });
            }
            window.location.reload();
        } catch (error) {
            console.error("Error al actualizar el producto:", error);
            alert("Hubo un error al actualizar el producto.");
        }
    }

    const handleAutopedidoCliente = async () => {
        try {
            const pedidoRef = doc(db, "informacion", "AutopedidoCliente");
            if (autopedidoCliente == true) {
                await updateDoc(pedidoRef, {
                    activado: false
                });
            } else {
                await updateDoc(pedidoRef, {
                    activado: true
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
            <div style={{ justifyContent: 'center', padding: '20px' }}>
                <NavBarSistemaAdmin />
                <h3 style={{ textAlign: 'center', padding: '20px' }}>
                    Lista de Productos
                    <div >

                        <button
                            onClick={() => handleMetodo()}
                            style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '5px',
                                marginLeft: '20px',
                            }}
                        >
                            Metodo de ordenamiento: <br />
                            {metodo ? " Prioridad" : " PEPS"}
                        </button>

                        <button
                            onClick={() => handlePedidoParaLlevar()}
                            style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '5px',
                                marginLeft: '20px',
                            }}
                        >
                            Pedido para llevar: <br />
                            {pedidoParaLlevar ? " Activado" : " Desactivado"}
                        </button>

                        <button
                            onClick={() => handleAutopedidoCliente()}
                            style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '5px',
                                marginLeft: '20px',
                            }}
                        >
                            Autopedido cliente: <br />
                            {autopedidoCliente ? " Activado" : " Desactivado"}
                        </button>
                    </div>
                </h3>
            </div>
        </div>
    )
}

export default ConfigurarSistemaAdmin
