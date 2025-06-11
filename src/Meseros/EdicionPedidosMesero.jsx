import React, { useEffect, useState } from "react";
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

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
    const [complementoSeleccionado, setComplementoSeleccionado] = useState(null);
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
    const [promociones, setPromociones] = useState([]);
    const [promocionSeleccionada, setPromocionSeleccionada] = useState(null);
    const [seleccionarPromociones, setSeleccionarPromociones] = useState(false);
    const [seleccionarPlatillosPromocion, setSeleccionarPlatillosPromocion] = useState(false);
    const [platillosPromocion, setPlatillosPromocion] = useState([]);
    const [personalizarPlatilloPromo, setPersonalizarPlatilloPromo] = useState(false);
    const [carritoPromociones, setCarritoPromociones] = useState([]);
    const [editandoPromo, setEditandoPromo] = useState(false);
    const [editandoPromoIndex, setEditandoPromoIndex] = useState(null);


    useEffect(() => {
        loadMesas();
        loadSecciones();
        loadPlatillos();
        loadPromociones();
    }, []);

    const loadPromociones = async () => {
            try {
                const q = query(collection(db, "promociones"));
                const querySnapshot = await getDocs(q);
                const promocionesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
    
                const hoy = new Date();
    
                const promocionesVigentes = [];
    
                for (const promo of promocionesData) {
                    // 1. Validar si está vigente
                    let esVigente = false;
    
                    if (promo.esSemanal) {
                        const diaSemana = hoy.getDay(); // 0=Domingo
                        const diasActivos = [
                            promo.dias.domingo,
                            promo.dias.lunes,
                            promo.dias.martes,
                            promo.dias.miercoles,
                            promo.dias.jueves,
                            promo.dias.viernes,
                            promo.dias.sabado
                        ];
                        esVigente = diasActivos[diaSemana];
                    } else {
                        const inicio = new Date(promo.fechaInicio);
                        const fin = new Date(promo.fechaFin);
                        esVigente = hoy >= inicio && hoy <= fin;
                    }
    
                    if (!esVigente) continue;
    
                    // 2. Validar platillos según tipo
                    const platillos = promo.platillos || []; // Asume que promo tiene un campo `platillos` con array de IDs
                    if (platillos.length === 0) continue;
    
                    const platillosSnap = await Promise.all(
                        platillos.map(pid => getDoc(doc(db, "menu", pid)))
                    );
    
                    const bloqueados = platillosSnap.filter(doc => {
                        const data = doc.data();
                        return data?.bloqueo;
                    });
    
                    if (
                        (promo.tipo === 0 || promo.tipo === 1) &&
                        bloqueados.length < platillos.length // al menos uno no bloqueado
                    ) {
                        promocionesVigentes.push(promo);
                    }
    
                    if (promo.tipo === 2 && bloqueados.length === 0) {
                        promocionesVigentes.push(promo);
                    }
                }
    
                setPromociones(promocionesVigentes);
            } catch (error) {
                console.error("Error obteniendo promociones:", error);
            }
        };

    const ObtenerPromocion = async (promoid) => {
        try {
            const promoRef = doc(db, "promociones", promoid);
            const promoDoc = await getDoc(promoRef);
            if (!promoDoc.exists()) {
                throw new Error("Promoción no encontrada");
            }
            const promoSec = { id: promoDoc.id, ...promoDoc.data() };
            return promoSec;
        } catch (error) {
            console.error("Error cargando la promocion: ", error);
            throw error;
        }
    };

    const handleEditarPromocion = async (promocionC, index) => {
        try {
            const promocionCompleta = await ObtenerPromocion(promocionC.idPromocion);
            handleSeleccionarPromocion(promocionCompleta);
            setPlatillosPromocion(promocionC.platillos);
            setEditandoPromo(true);
            setEditandoPromoIndex(index);
            setSeleccionarPromociones(true);
            setSeleccionarPlatillosPromocion(true);
        } catch (error) {
            console.error("Error al editar promoción:", error);
            alert("No se pudo cargar la promoción para editar");
        }
    };

    const handleSeleccionarPromocion = (promocion) => {
        setPromocionSeleccionada(promocion);
        const platillosDePromocion = platillos.filter(platillo =>
            promocion.platillos.some(p => p.id === platillo.id)
        );
        setPlatillosFiltrados(platillosDePromocion);

        if (promocion.tipo !== 2) {
            setPlatillosPromocion([]);
            setSeleccionarPlatillosPromocion(true);
        } else {
            // Para promociones por paquete, permitir personalización
            const platillosParaPedido = platillosDePromocion.map(platillo => ({
                idPlatillo: platillo.id,
                nombre: platillo.nombre,
                ingredientes: [],
                extras: [],
                complemento: null,
                cantidad: 1,
                precio: platillo.precio,
                descripcion: null,
                completado: false,
                esPromocion: true,
                idPromocion: promocion.id,
                tiempo: platillo.tiempo,
                prioridad: platillo.prioridad
            }));

            setPlatillosPromocion(platillosParaPedido);
            setSeleccionarPlatillosPromocion(true);
        }
    };

    const handleSeleccionarPlatilloPromociones = async (platilloId) => {
        const tipo = promocionSeleccionada.tipo;
        if (tipo == 1 && platillosPromocion.length >= 3) {
            alert("Solo se pueden elegir 3 platillos como máximo");
            return;
        }
        if (tipo == 0 && platillosPromocion.length >= 2) {
            alert("Solo se pueden elegir 2 platillos como máximo");
            return;
        }

        try {
            const platilloRef = doc(db, "menu", platilloId);
            const platilloDoc = await getDoc(platilloRef);
            if (platilloDoc.exists()) {
                const platilloData = platilloDoc.data();

                // Configurar extras y complementos disponibles
                const ext = [];
                const comp = [];
                if (platilloData.extras) {
                    platilloData.extras.forEach(element => {
                        if (element.extra) {
                            ext.push(element);
                        } else {
                            comp.push(element);
                        }
                    });
                }

                setExtrasPlatillo(ext);
                setComplementosPlatillo(comp);
                setPlatilloSeleccionadoId(platilloId);
                setPlatilloActual(platilloData);
                setPersonalizarPlatilloPromo(true);

                // Crear objeto base del platillo
                const PlatilloEditado = {
                    idPlatillo: platilloId,
                    nombre: platilloData.nombre,
                    ingredientes: [],
                    extras: [],
                    complemento: null,
                    cantidad: 1,
                    precio: platilloData.precio,
                    tiempo: platilloData.tiempo,
                    prioridad: platilloData.prioridad,
                    descripcion: descripcion || null,
                    completado: false,
                    esPromocion: true,
                    idPromocion: promocionSeleccionada.id,
                    costeNeto: platilloData.costeNeto,
                };

                setPlatillosPromocion(prev => [...prev, PlatilloEditado]);
            } else {
                alert("Platillo no encontrado");
            }
        } catch (error) {
            console.error("Error cargando el platillo: ", error);
        }
    };

    const handleQuitarPlatilloPromociones = (index) => {
        setPlatillosPromocion(prev => prev.filter((_, i) => i !== index));
    };

    const handleQuitarPromoCarrito = (index) => {
        setCarritoPromociones(prev => prev.filter((_, i) => i !== index));
    };

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
        let platilloAEditar;
        if (seleccionarPlatillosPromocion) {
            platilloAEditar = platillosPromocion[index];
            handleResetPlatillos();
        } else {
            platilloAEditar = platillosSeleccionados[index];
        }
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

            if (descripcion.length > 50) {
                alert("El comentario no puede exceder los 50 caracteres");
                return
            }

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
                tiempo: platilloActual.tiempo,
                prioridad: platilloActual.prioridad,
                ...(promocionSeleccionada && {
                    esPromocion: true,
                    idPromocion: promocionSeleccionada.id
                })
            };

            if (personalizarPlatilloPromo) {
                setPlatillosPromocion(prev =>
                    prev.map((item, index) =>
                        index === editandoIndex ? platilloActualizado : item
                    )
                );
                setPersonalizarPlatilloPromo(false);
                if (!editandoPromo) {
                    handleResetSoft();
                } else {
                    handleResetSoftModificacion();
                }
            } else {
                setPlatillosSeleccionados(prev =>
                    prev.map((item, index) =>
                        index === editandoIndex ? platilloActualizado : item
                    )
                );
                setSeccionSeleccionada(null);
                handleReset();
            }
        }
    };

    const seleccionarPedido = (pedido) => {
        handleReset();
        setPedidoSeleccionado(pedido);
        setPlatillosSeleccionados(pedido.platillos || []);
        setCarritoPromociones(pedido.promociones || []);
        setCambioPedido(true);
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
            setComplementoSeleccionado(null);
            return;
        }

        const compElegido = complementosPlatillo.find((comp) => comp.id === idSeleccionado);

        if (compElegido) {
            setComplementoSeleccionado(compElegido);
        } else {
            console.log("Error al cambiar el complemento");
            setComplementoSeleccionado(null);
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

            if (descripcion.length > 50) {
                alert("El comentario no puede exceder los 50 caracteres");
                return
            }

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
                tiempo: platilloActual.tiempo,
                prioridad: platilloActual.prioridad,
                costeNeto: platilloActual.costeNeto,
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
            const productosRef = collection(db, "secciones");
            const q = query(productosRef, orderBy("posicion", "asc"));
            const querySnapshot = await getDocs(q);
            let seccionesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Mover la primera sección al final
            if (seccionesData.length > 0) {
                const primeraSeccion = seccionesData.shift(); // Remueve el primer elemento
                seccionesData.push(primeraSeccion); // Agrega al final
            }

            setSecciones(seccionesData);
        } catch (error) {
            console.error("Error obteniendo las secciones:", error);
        }
    }
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

    const handleResetSoft = () => {
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
        setEditandoPromo(false);
        setEditandoPromoIndex(null);
    };

    const handleResetSoftModificacion = () => {
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
    };

    const handleResetPlatillos = () => {
        setExtrasPlatillo([]);
        setlistaExtra([]);
        setComplementosPlatillo([]);
        setComplementoSeleccionado(null);
        setListaIngredientes([]);
        setCantidad(1);
        setDescripcion("");
    };

    const handleDelete = async (pedidoId, num) => {
        const usuarioConfirmo = window.confirm("Estas seguro que quieres eliminar el pedido numero " + num);
        if (usuarioConfirmo) {
            try {
                await deleteDoc(doc(db, "ordenes", pedidoId));
                alert("Pedido eliminado correctamente.");
                window.location.reload()
            } catch (error) {
                console.error("Error al eliminar el producto:", error);
                alert("Hubo un error al eliminar el producto.");
            }
        }
    };

    const enviarPedido = async () => {
        setEnviandoPedido(true);
        if (!mesaSeleccionada.id) {
            alert("Por favor selecciona una mesa primero");
            return;
        }

        if (platillosSeleccionados.length === 0 && carritoPromociones.length === 0) {
            alert("No hay platillos en el pedido");
            return;
        }

        try {
            const extraerDetallesPlatillo = (platillo) => {
                const detalles = [];
                let puntos = 0;

                if (platillo.extras && platillo.extras.length > 0) {
                    platillo.extras.forEach(extra => {
                        detalles.push({
                            idPlatillo: extra.id,
                            tipo: 'extra',
                            nombre: extra.nombre,
                            precio: extra.precio,
                            platilloAsociado: platillo.nombre,
                            completado: false,
                            costeNeto: platillo.costeNeto,
                        });
                        puntos += parseInt(platillo.prioridad || 0);
                    });
                }

                if (platillo.complemento) {
                    detalles.push({
                        idPlatillo: platillo.complemento.id,
                        tipo: 'complemento',
                        nombre: platillo.complemento.nombre,
                        precio: platillo.complemento.precio || 0,
                        platilloAsociado: platillo.nombre,
                        prioridad: platillo.prioridad,
                        tiempo: platillo.tiempo,
                        completado: false,
                        costeNeto: platillo.costeNeto,
                    });
                    puntos = puntos + parseInt(platillo.prioridad);
                }

                return { detalles, puntos };
            };

            let todosExtrasComplementos = [];
            let puntosTotales = 0;

            platillosSeleccionados.forEach(platillo => {
                const { detalles, puntos } = extraerDetallesPlatillo(platillo);
                todosExtrasComplementos = [...todosExtrasComplementos, ...detalles];
                puntosTotales += puntos;
            });

            carritoPromociones.forEach(promocion => {
                promocion.platillos.forEach(platillo => {
                    const { detalles, puntos } = extraerDetallesPlatillo(platillo);
                    todosExtrasComplementos = [...todosExtrasComplementos, ...detalles];
                    puntosTotales += puntos;
                });
            });

            const pedidoRef = collection(db, "ordenes");
            const nuevoPedido = {
                mesaId: mesaSeleccionada.id,
                mesaNombre: mesaSeleccionada.nombre,
                platillos: [...platillosSeleccionados],
                promociones: carritoPromociones.length > 0 ? [...carritoPromociones] : null,
                extrasYcomplementos: todosExtrasComplementos.length > 0 ? todosExtrasComplementos : null,
                total: platillosSeleccionados.reduce((sum, platillo) => sum + (platillo.precio * platillo.cantidad), 0) +
                    (carritoPromociones.reduce((sum, promo) => sum + promo.precio, 0) || 0),
                estado: "pendiente",
                puntos: puntosTotales,
                preparando: false,
                llevar: false,
                fecha: serverTimestamp()
            };

            if (pedidoSeleccionado) {
                await updateDoc(doc(pedidoRef, pedidoSeleccionado.id), nuevoPedido);
                alert("Pedido actualizado correctamente");
            } else {
                await addDoc(pedidoRef, nuevoPedido);
                alert("Pedido enviado correctamente");
            }

            setPlatillosSeleccionados([]);
            setCarritoPromociones([]);
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
                            disabled={(platillosSeleccionados.length === 0 && carritoPromociones.length === 0) || !mesaSeleccionada.id || enviandoPedido}
                            style={{
                                padding: '8px 15px',
                                backgroundColor: (platillosSeleccionados.length > 0 || carritoPromociones.length > 0) && mesaSeleccionada.id ? '#28a745' : '#cccccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (platillosSeleccionados.length > 0 || carritoPromociones.length > 0) && mesaSeleccionada.id ? 'pointer' : 'not-allowed',
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
                                {pedidosPendientes.map((pedido, index) => (
                                    <div
                                        key={pedido.id}
                                        style={{
                                            padding: '10px',
                                            border: '1px solid #ddd',
                                            borderRadius: '5px',
                                            backgroundColor: pedidoSeleccionado?.id === pedido.id ? '#e6f7ff' : 'white',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => (seleccionarPedido(pedido), handleReset())}
                                    >

                                        <div>
                                            <strong>Pedido #{pedidosPendientes.indexOf(pedido) + 1}</strong>
                                            <div>Total: ${pedido.total.toFixed(2)}</div>
                                            <div>Platillos: {pedido.platillos.length}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(pedido.id, index + 1)}
                                            style={{
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                marginRight: '5px'
                                            }}
                                        >
                                            Eliminar
                                        </button>

                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No hay pedidos pendientes para esta mesa</p>
                        )}
                    </div>
                )}

                {/* Matriz de secciones (6 columnas) */}
                {!seccionSeleccionada && mesaSeleccionada.id && pedidoSeleccionado && (
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
                                {promociones.length > 0 && (
                                    <button
                                        key="promociones-btn"
                                        onClick={() => setSeleccionarPromociones(true)}
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
                                        Promociones del dia
                                    </button>
                                )}
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
                                platillo.bloqueo != true && platillo.estatus == true && (
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
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Detalles del platillo seleccionado */}
                {platilloEdicion && platilloActual && (
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
                                    value={complementoSeleccionado?.id || ""}
                                    style={{ marginBottom: "15px", padding: "8px" }}
                                >
                                    <option value="">Seleccione un complemento</option>
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

                {/* Matriz de promociones */}
                {seleccionarPromociones && !personalizarPlatilloPromo && !promocionSeleccionada && (
                    <div style={{ marginBottom: "30px" }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                                onClick={() => setSeleccionarPromociones(false)}
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

                        <h3>Seleccione una promocion:</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '10px',
                            marginTop: '15px'
                        }}>
                            {promociones.map(promo => (
                                <button
                                    key={promo.id}
                                    onClick={() => handleSeleccionarPromocion(promo)}
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
                                    {promo.nombre}
                                    <p>{promo.tipo == 0 ? "2x1" :
                                        (promo.tipo == 1 ? "3x2" : ("$" + promo.precio))}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Seleccionar platillos promociones 2x1 y 3x2 */}
                {seleccionarPlatillosPromocion && !platilloActual && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                                onClick={() => (setSeleccionarPlatillosPromocion(false),
                                    setPromocionSeleccionada(null),
                                    handleResetSoft()
                                )}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Volver a promociones
                            </button>
                        </div>

                        {(promocionSeleccionada.tipo == 0 || promocionSeleccionada.tipo == 1) && (
                            <div>
                                <h3>Seleccione {promocionSeleccionada.tipo == 1 ? "3" : "2"} platillos:</h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '10px',
                                    marginTop: '15px'
                                }}>
                                    {platillosFiltrados.map(platillo => (
                                        platillo.bloqueo != true && platillo.estatus == true && (
                                            <button
                                                onClick={() => handleSeleccionarPlatilloPromociones(platillo.id)}
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
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {platillosPromocion.map((platillo, index) => (
                            <li
                                key={`${index}-${Date.now()}`}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    borderBottom: '1px solid #eee'
                                }}
                            >
                                <div>
                                    <span>{platillo.nombre} - ${platillo.precio}</span> <br />
                                    {platillo.descripcion}
                                </div>
                                <div>
                                    <button
                                        onClick={() => (handleEditarPlatillo(index),
                                            setPersonalizarPlatilloPromo(true))}
                                        style={{
                                            padding: '5px 10px',
                                            backgroundColor: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Editar
                                    </button>
                                    {promocionSeleccionada.tipo != 2 && (
                                        <button
                                            onClick={() => handleQuitarPlatilloPromociones(index)}
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
                                    )}
                                </div>
                            </li>))}

                        {((promocionSeleccionada.tipo == 2) ||
                            (promocionSeleccionada.tipo == 1 && platillosPromocion.length == 3) ||
                            (promocionSeleccionada.tipo == 0 && platillosPromocion.length == 2)) && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                                    <button
                                        onClick={() => {
                                            let precioTotal = 0;
                                            let preciosPlatillos = [];

                                            platillosPromocion.forEach(platillo => {
                                                let precioPlatillo = platillo.precio;

                                                if (platillo.extras && platillo.extras.length > 0) {
                                                    precioPlatillo += platillo.extras.reduce((sum, extra) => sum + extra.precio, 0);
                                                }

                                                if (platillo.complemento && platillo.complemento.precio) {
                                                    precioPlatillo += platillo.complemento.precio;
                                                }

                                                preciosPlatillos.push(precioPlatillo);
                                            });

                                            if (promocionSeleccionada.tipo === 0) {
                                                precioTotal = Math.max(...preciosPlatillos);
                                            }
                                            else if (promocionSeleccionada.tipo === 1) {
                                                const sorted = [...preciosPlatillos].sort((a, b) => b - a);
                                                precioTotal = sorted[0] + sorted[1];
                                            } else {
                                                precioTotal = promocionSeleccionada.precio;
                                                const totalExtras = platillosPromocion.reduce((sum, platillo) => {
                                                    let extrasPlatillo = 0;
                                                    if (platillo.extras && platillo.extras.length > 0) {
                                                        extrasPlatillo += platillo.extras.reduce((sumExtra, extra) => sumExtra + extra.precio, 0);
                                                    }
                                                    return sum + extrasPlatillo;
                                                }, 0);
                                                precioTotal += totalExtras;
                                            }

                                            const promocionParaPedido = {
                                                idPromocion: promocionSeleccionada.id,
                                                nombre: promocionSeleccionada.nombre,
                                                platillos: platillosPromocion,
                                                precio: precioTotal,
                                                tipo: promocionSeleccionada.tipo,
                                                descripcion: "Promoción aplicada",
                                                completado: false
                                            };

                                            if (editandoPromo) {
                                                setCarritoPromociones(prev =>
                                                    prev.map((item, index) =>
                                                        index === editandoPromoIndex ? promocionParaPedido : item
                                                    )
                                                );
                                            } else {
                                                setCarritoPromociones(prev => [...prev, promocionParaPedido]);
                                            }
                                            setPlatillosPromocion([]);
                                            setPromocionSeleccionada(null);
                                            setSeleccionarPlatillosPromocion(false);
                                            handleResetSoft();
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '16px'
                                        }}
                                    >
                                        {editandoPromo ? "Editar promoción" : "Agregar Promoción al Pedido"}
                                    </button>
                                </div>
                            )}
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

                {/* Lista de promociones seleccionadas (carrito) */}
                {carritoPromociones.map((promocionC, index) => (
                    <li
                        key={`${index}-${Date.now()}`}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px',
                            borderBottom: '1px solid #eee'
                        }}
                    >
                        <div>
                            <span>{promocionC.nombre} - ${promocionC.precio}</span>
                        </div>
                        <div>
                            <button
                                onClick={() => (handleEditarPromocion(promocionC, index)
                                )}
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
                                onClick={() => handleQuitarPromoCarrito(index)}
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