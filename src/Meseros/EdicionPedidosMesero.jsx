import React, { useEffect, useState } from "react";
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros'
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

function EdicionPedidosMesero() {
    const [mesas, setMesas] = useState([]);
    const [secciones, setSecciones] = useState([]);
    const [platillos, setPlatillos] = useState([]);
    const [platilloEdicion, setPlatilloEdicion] = useState(false);
    const [platilloActual, setPlatilloActual] = useState(null);
    const [platillosFiltrados, setPlatillosFiltrados] = useState([]);
    const [platillosSeleccionados, setPlatillosSeleccionados] = useState([]);
    const [listaIngredientes, setListaIngredientes] = useState([]);
    const [listaExtra, setlistaExtra] = useState([]);
    const [extrasPlatillo, setExtrasPlatillo] = useState([])
    const [complementosPlatillo, setComplementosPlatillo] = useState([])
    const [complementoSeleccionado, setComplementoSeleccionado] = useState();
    const [platilloSeleccionadoId, setPlatilloSeleccionadoId] = useState(null)
    const [cantidad, setCantidad] = useState(1);
    const [mesaSeleccionada, setMesaSeleccionada] = useState({
        id: "",
        nombre: "Mesa sin seleccionar",
    });
    const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
    const [descripcion, setDescripcion] = useState("");
    const [editandoIndex, setEditandoIndex] = useState(null);
    const [enviandoPedido, setEnviandoPedido] = useState(false);
    const [pedidosPendientes, setPedidosPendientes] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [cargandoPedidos, setCargandoPedidos] = useState(false);
    const [cambioPedido, setCambioPedido] = useState(false);


    useEffect(() => {
        loadMesas();
        loadSecciones();
        loadPlatillos();
    }, []);

    const cargarPedidosPendientes = async (mesaId) => {
        setCargandoPedidos(true);
        try {
            const pedidosRef = collection(db, "ordenes");
            const q = query(
                pedidosRef,
                where("mesaId", "==", mesaId),
                where("estado", "==", "pendiente")
            );

            const querySnapshot = await getDocs(q);
            const pedidosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const pedidosFiltrados = pedidosData.filter(pedido =>
                pedido.preparando == false
              )

            setPedidosPendientes(pedidosFiltrados);
        } catch (error) {
            console.error("Error cargando pedidos:", error);
        } finally {
            setCargandoPedidos(false);
        }
    };

    const handleEditarPlatillo = (index) => {
        const platilloAEditar = platillosSeleccionados[index];
        setEditandoIndex(index);
        handleSeleccionarPlatillo(platilloAEditar.idPlatillo)
        setListaIngredientes(platilloAEditar.ingredientes || []);
        setlistaExtra(platilloAEditar.extras || []);
        setComplementoSeleccionado(platilloAEditar.complemento || null);
        setCantidad(platilloAEditar.cantidad);
        setDescripcion(platilloAEditar.descripcion || "");
        setPlatilloEdicion(true);
        setCambioPedido(false);
    };

    const handleActualizarPlatillo = () => {
        if (platilloActual && editandoIndex !== null) {
            let costo = platilloActual.precio * cantidad;
            if (listaExtra.length > 0) {
                listaExtra.forEach((ext) => {
                    costo += ext.precio;
                });
            }

            const platilloActualizado = {
                idPlatillo: platilloSeleccionadoId,
                nombre: platilloActual.nombre,
                ingredientes: listaIngredientes,
                extras: listaExtra.length > 0 ? listaExtra : null,
                complemento: complementoSeleccionado || null,
                cantidad: cantidad,
                precio: costo,
                descripcion: descripcion || null,
                completado: false,
            };

            setPlatillosSeleccionados(prev =>
                prev.map((item, index) =>
                    index === editandoIndex ? platilloActualizado : item
                )
            );

            setEditandoIndex(null);
            setSeccionSeleccionada(null);
            handleReset();
        }
    };

    const seleccionarPedido = (pedido) => {
        handleReset();
        setPedidoSeleccionado(pedido);
        setPlatillosSeleccionados(pedido.platillos);
        setCambioPedido(true)
    };

    const handleMesaChange = async (event) => {
        const idSeleccionado = event.target.value;

        if (!idSeleccionado) {
            setMesaSeleccionada({ id: "", nombre: "Mesa sin seleccionar" });
            setPedidosPendientes([]);
            setPedidoSeleccionado(null);
            setPlatillosSeleccionados([]);
            return;
        }

        const mesaElegida = mesas.find((mesa) => mesa.id === idSeleccionado);

        if (mesaElegida) {
            setMesaSeleccionada({
                id: mesaElegida.id,
                nombre: mesaElegida.username,
            });
            await cargarPedidosPendientes(mesaElegida.id);
        } else {
            console.log("Error al cambiar la mesa");
        }
    };

    const handleComplementoChange = (event) => {
        const idSeleccionado = event.target.value;

        if (!idSeleccionado) {
            setComplementoSeleccionado({ id: "", nombre: "Complemento sin seleccionar" });
            return;
        }

        const compElegido = complementosPlatillo.find((comp) => comp.id === idSeleccionado);

        if (compElegido) {
            setMesaSeleccionada(compElegido);
        } else {
            console.log("Error al cambiar la mesa");
        }
    };

    const handleSeleccionarSeccion = (seccionId, seccionNombre) => {
        setSeccionSeleccionada({ id: seccionId, nombre: seccionNombre });
        setPlatillosFiltrados(
            platillos.filter((platillo) =>
                platillo.seccion && platillo.seccion.id === seccionId
            )
        );
        setPlatilloEdicion(false);
    };

    const handleSeleccionarPlatillo = async (platilloId) => {
        try {
            const platilloRef = doc(db, "menu", platilloId);
            const platilloDoc = await getDoc(platilloRef);
            if (platilloDoc.exists()) {
                const platilloData = platilloDoc.data();
                setPlatilloSeleccionadoId(platilloId)
                setPlatilloActual(platilloData);
                setPlatilloEdicion(true);
                if (platilloData.extras) {
                    const ext = [];
                    const comp = [];
                    platilloData.extras.forEach(element => {
                        if (element.extra) {
                            ext.push(element)
                        } else {
                            comp.push(element)
                        }
                        setExtrasPlatillo(ext);
                        setComplementosPlatillo(comp);
                    });
                }
            } else {
                alert("Platillo no encontrado");
            }
        } catch (error) {
            console.error("Error cargando el platillo: ", error);
        }
    };

    const handleAgregarAlPedido = () => {
        if (platilloActual) {
            let costo = platilloActual.precio
            if (listaExtra.length > 0) {
                listaExtra.map((ext) => {
                    costo = costo + ext.precio;
                })
            }
            const PlatilloEditado = {
                idPlatillo: platilloSeleccionadoId,
                nombre: platilloActual.nombre,
                ingredientes: listaIngredientes,
                extras: listaExtra.length > 0 ? listaExtra : null,
                complemento: complementoSeleccionado ? complementoSeleccionado : null,
                cantidad: cantidad,
                precio: costo,
                descripcion: descripcion ? descripcion : null,
                completado: false,
            }
            console.log(PlatilloEditado);
            setPlatillosSeleccionados(prev => [...prev, PlatilloEditado]);
            setSeccionSeleccionada(null);
            handleReset();
        }
    };

    const handleQuitarPlatillo = (index) => {
        setPlatillosSeleccionados(prev => prev.filter((_, i) => i !== index));
    };

    const loadMesas = async () => {
        try {
            const q = query(collection(db, "users"), where("tipo", "==", 2));
            const querySnapshot = await getDocs(q);
            const mesasData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMesas(mesasData);
        } catch (error) {
            console.error("Error obteniendo las mesas:", error);
        }
    };

    const loadSecciones = async () => {
        try {
            const q = query(collection(db, "secciones"));
            const querySnapshot = await getDocs(q);
            const seccionesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSecciones(seccionesData);
        } catch (error) {
            console.error("Error obteniendo las secciones:", error);
        }
    };

    const loadPlatillos = async () => {
        try {
            const q = query(collection(db, "menu"));
            const querySnapshot = await getDocs(q);
            const platillosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlatillos(platillosData);
        } catch (error) {
            console.error("Error obteniendo los platillos:", error);
        }
    };

    const handleIngredientes = (ingrediente) => {
        const existe = listaIngredientes.some((ingre) => ingre.id === ingrediente.id)
        if (existe) {
            setListaIngredientes((prev) => prev.filter((ingre) => ingre.id !== ingrediente.id))
        } else {
            setListaIngredientes((prev) => [
                ...prev, { ...ingrediente },
            ]);
        }
    };

    const handleExtras = (extra) => {
        const existe = listaExtra.some((ext) => ext.id === extra.id)
        if (existe) {
            setlistaExtra((prev) => prev.filter((ext) => ext.id !== extra.id))
        } else {
            setlistaExtra((prev) => [
                ...prev, { ...extra },
            ]);
        }
    };

    const handleReset = () => {
        setPlatilloSeleccionadoId(null);
        setPlatilloActual(null);
        setPlatilloEdicion(false);
        setExtrasPlatillo([]);
        setlistaExtra([]);
        setComplementosPlatillo([]);
        setComplementoSeleccionado(null);
        setListaIngredientes([]);
        setCantidad(1);
        setDescripcion("");
        setEditandoIndex(null);
      };

    const enviarPedido = async () => {
        if (!mesaSeleccionada.id) {
            alert("Por favor selecciona una mesa primero");
            return;
        }

        if (platillosSeleccionados.length === 0) {
            alert("No hay platillos en el pedido");
            return;
        }

        setEnviandoPedido(true);
        try {
            const pedidoRef = collection(db, "ordenes");
            const pedidoData = {
                mesaId: mesaSeleccionada.id,
                mesaNombre: mesaSeleccionada.nombre,
                platillos: platillosSeleccionados,
                total: platillosSeleccionados.reduce((sum, platillo) => sum + (platillo.precio * platillo.cantidad), 0),
                estado: "pendiente",
                preparando: false,
                fecha: serverTimestamp()
            };

            if (pedidoSeleccionado) {
                // Actualizar pedido existente
                await updateDoc(doc(pedidoRef, pedidoSeleccionado.id), pedidoData);
                alert("Pedido actualizado correctamente");
            } else {
                // Crear nuevo pedido
                await addDoc(pedidoRef, pedidoData);
                alert("Pedido enviado correctamente");
            }

            setPlatillosSeleccionados([]);
            setPedidoSeleccionado(null);
            await cargarPedidosPendientes(mesaSeleccionada.id);
        } catch (error) {
            console.error("Error procesando el pedido: ", error);
            alert("Error al procesar el pedido");
        } finally {
            setEnviandoPedido(false);
        }
    };

    const seccionesMatriz = [];
    for (let i = 0; i < secciones.length; i += 6) {
        seccionesMatriz.push(secciones.slice(i, i + 6));
    }

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarMeseros />

            <div style={{ padding: "20px", width: "80vw", margin: "0 auto" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', justifyContent: 'center' }}>
                    <h3>Mesa: {""}
                        <select
                            onChange={handleMesaChange}
                            value={mesaSeleccionada.id}
                            style={{ padding: "8px" }}
                        >
                            <option value="">Sin mesa</option>
                            {mesas.map((mesa) => (
                                <option key={mesa.id} value={mesa.id}>
                                    {mesa.username}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={enviarPedido}
                            disabled={platillosSeleccionados.length === 0 || !mesaSeleccionada.id || enviandoPedido}
                            style={{
                                padding: '8px 15px',
                                backgroundColor: platillosSeleccionados.length > 0 && mesaSeleccionada.id ? '#28a745' : '#cccccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: platillosSeleccionados.length > 0 && mesaSeleccionada.id ? 'pointer' : 'not-allowed',
                                margin: '10px'
                            }}
                        >
                            {enviandoPedido ? 'Actualizando...' : 'Actualizar Pedido'}
                        </button>
                    </h3>
                </div>

                {mesaSeleccionada.id && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3>Pedidos pendientes para esta mesa:</h3>
                        {cargandoPedidos ? (
                            <p>Cargando pedidos...</p>
                        ) : pedidosPendientes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {pedidosPendientes.map(pedido => (
                                    <div
                                        key={pedido.id}
                                        style={{
                                            padding: '10px',
                                            border: '1px solid #ddd',
                                            borderRadius: '5px',
                                            backgroundColor: pedidoSeleccionado?.id === pedido.id ? '#e6f7ff' : 'white',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => seleccionarPedido(pedido)}
                                    >
                                        <div>
                                            <strong>Pedido #{pedidosPendientes.indexOf(pedido) + 1}</strong>
                                            <div>Total: ${pedido.total.toFixed(2)}</div>
                                            <div>Platillos: {pedido.platillos.length}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No hay pedidos pendientes para esta mesa</p>
                        )}
                    </div>
                )}

                {/* Matriz de secciones (6 columnas) */}
                {!seccionSeleccionada &&  mesaSeleccionada.id && pedidoSeleccionado &&(
                    <div style={{ marginBottom: "30px" }}>
                        <h3>Seleccione una sección:</h3>
                        {seccionesMatriz.map((fila, index) => (
                            <div key={index} style={{ display: 'flex', marginBottom: '10px' }}>
                                {fila.map(seccion => (
                                    <button
                                        key={seccion.id}
                                        onClick={() => handleSeleccionarSeccion(seccion.id, seccion.nombre)}
                                        style={{
                                            flex: 1,
                                            margin: '0 5px',
                                            padding: '10px',
                                            backgroundColor: '#4CAF50',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            minWidth: '100px'
                                        }}
                                    >
                                        {seccion.nombre}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* Lista de platillos de la sección seleccionada */}
                {seccionSeleccionada && !platilloEdicion && (
                    <div style={{ marginBottom: "30px" }}>
                        <h3>Platillos de la sección: {seccionSeleccionada.nombre} </h3>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                                onClick={() => setSeccionSeleccionada(null)}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Volver a secciones
                            </button>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '10px',
                            marginTop: '15px'
                        }}>
                            {platillosFiltrados.map(platillo => (
                                <button
                                    onClick={() => handleSeleccionarPlatillo(platillo.id)}
                                    key={platillo.id}
                                    style={{
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <p>{platillo.nombre}</p>
                                    <p>${platillo.precio}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Detalles del platillo seleccionado */}
                {platilloEdicion && platilloActual &&(
                    <div style={{ marginBottom: "30px", }}>
                        <h3>{platilloActual.nombre}</h3>
                        <p>Precio: ${platilloActual.precio}</p>

                        <h4>Ingredientes:</h4>
                        {platilloActual.ingredientes.map(ingrediente => (
                            <button
                                onClick={() => (handleIngredientes(ingrediente)
                                )}
                                key={ingrediente.id}
                                style={{
                                    backgroundColor: listaIngredientes.find(ing => ing.id === ingrediente.id) ?
                                        'red' : '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    margin: '5px'
                                }}
                            >
                                <p>{ingrediente.nombre}</p>
                            </button>
                        ))}

                        <br />

                        {complementosPlatillo.length > 0 && (
                            <div>
                                <h4>Complementos:</h4>
                                <select
                                    onChange={handleComplementoChange}
                                    value={complementoSeleccionado.id}
                                    style={{ marginBottom: "15px", padding: "8px" }}
                                >
                                    {complementosPlatillo.map((comp) => (
                                        <option key={comp.id} value={comp.id}>
                                            {comp.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <br />

                        {extrasPlatillo.length > 0 && (
                            <div>
                                <h4>Extras:</h4>
                                {
                                    extrasPlatillo.map(extra => (
                                        <button
                                            onClick={() => (handleExtras(extra)
                                            )}
                                            key={extra.id}
                                            style={{
                                                backgroundColor: listaExtra.find(ext => ext.id === extra.id) ?
                                                    'green' : '#007bff',
                                                color: 'white',
                                                border: 'none',
                                                padding: '10px',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                margin: '5px'
                                            }}
                                        >
                                            <p>{extra.nombre}</p>
                                            <p>${extra.precio}</p>
                                        </button>

                                    ))
                                }
                            </div>
                        )}

                        <div style={{ marginBottom: "15px" }}>
                            <label>Comentarios:</label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                required
                                style={{ width: "100%", padding: "8px" }}
                            />
                        </div>



                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: "center" }}>
                            <button
                                disabled={true}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: 'transparent',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '4px',
                                }}
                            >
                                cantidad:
                            </button>


                            <button
                                onClick={() => setCantidad(cantidad - 1)}
                                disabled={cantidad <= 1}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                -
                            </button>

                            <button
                                disabled={true}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: 'transparent',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '4px',
                                }}
                            >
                                {cantidad}
                            </button>

                            <button
                                onClick={() => setCantidad(cantidad + 1)}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                }}
                            >
                                +
                            </button>
                        </div>

                        <br />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: "center" }}>
                            <button
                                onClick={() => (setPlatilloEdicion(false),
                                    handleReset()
                                )}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Volver a platillos
                            </button>

                            <button
                                onClick={editandoIndex !== null ? handleActualizarPlatillo : handleAgregarAlPedido}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {editandoIndex !== null ? 'Actualizar platillo' : 'Agregar al pedido'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de platillos seleccionados (carrito) */}
                {platillosSeleccionados.map((platillo, index) => (
                    <li
                        key={`${index}-${Date.now()}`} // Mejor clave única
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px',
                            borderBottom: '1px solid #eee'
                        }}
                    >
                        <div>
                            <span>{platillo.nombre} - ${platillo.precio} | Cantidad: {platillo.cantidad}</span>
                            {platillo.descripcion && <div>Notas: {platillo.descripcion}</div>}
                        </div>
                        <div>
                            <button
                                onClick={() => handleEditarPlatillo(index)}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#ffc107',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginRight: '5px'
                                }}
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => handleQuitarPlatillo(index)}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Quitar
                            </button>
                        </div>
                    </li>
                ))}
            </div>
        </div >
    )
}

export default EdicionPedidosMesero;