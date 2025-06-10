import React, { useEffect, useState } from "react";
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros'
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material'
  ;

function MesasPrincipal() {
  const { mesaId } = useParams();
  const [mesa, setMesa] = useState({
    id: null,
    nombre: "Cargando..."
  });
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
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
  const [descripcion, setDescripcion] = useState("");
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
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
    loadMesa(mesaId);
    loadSecciones();
    loadPlatillos();
    loadPromociones();
  }, [mesaId]);

  const loadMesa = async (id) => {
    if (id) {
      try {
        const mesaRef = doc(db, "users", id);
        const mesaDoc = await getDoc(mesaRef);
        if (mesaDoc.exists()) {
          setMesa({
            id: id,
            nombre: mesaDoc.data().username
          });
        } else {
          console.error("Mesa no encontrada");
          setMesa({
            id: id,
            nombre: "Mesa no encontrada"
          });
        }
      } catch (error) {
        console.error("Error cargando datos de la mesa:", error);
        setMesa({
          id: id,
          nombre: "Error cargando mesa"
        });
      }
    }
  }

  const loadPromociones = async () => {
    try {
      const q = query(collection(db, "promociones"));
      const querySnapshot = await getDocs(q);
      const promocionesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar promociones vigentes
      const hoy = new Date();
      const promocionesVigentes = promocionesData.filter(promo => {
        if (promo.esSemanal) {
          const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes, etc.
          const diasActivos = [
            promo.dias.domingo,
            promo.dias.lunes,
            promo.dias.martes,
            promo.dias.miercoles,
            promo.dias.jueves,
            promo.dias.viernes,
            promo.dias.sabado
          ];
          return diasActivos[diaSemana];
        } else {
          const inicio = new Date(promo.fechaInicio);
          const fin = new Date(promo.fechaFin);
          return hoy >= inicio && hoy <= fin;
        }
      });

      setPromociones(promocionesVigentes);
    } catch (error) {
      console.error("Error obteniendo promociones:", error);
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

  const handleComplementoChange = (event) => {
    const idSeleccionado = event.target.value;

    if (!idSeleccionado) {
      setComplementoSeleccionado({ id: "", nombre: "Complemento sin seleccionar" });
      return;
    }

    const compElegido = complementosPlatillo.find((comp) => comp.id === idSeleccionado);

    if (compElegido) {
      setComplementoSeleccionado(compElegido);
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

  const ObtenerPromocion = async (promoid) => {
    try {
      const promoRef = doc(db, "promociones", promoid);
      const promoDoc = await getDoc(promoRef);
      if (!promoDoc.exists()) {
        throw new Error("Promoción no encontrada");
      }
      const promoSec = { id: promoDoc.id, ...promoDoc.data() };
      console.log("Promocion edicion:", promoSec); // Usar coma en lugar de +
      return promoSec;
    } catch (error) {
      console.error("Error cargando la promocion: ", error);
      throw error; // Propaga el error para manejarlo donde se llame
    }
  };

  const handleEditarPromocion = async (promocionC, index) => {
    try {
      const promocionCompleta = await ObtenerPromocion(promocionC.idPromocion);
      handleSeleccionarPromocion(promocionCompleta);
      setPlatillosPromocion(promocionC.platillos); // Corregido el nombre del campo
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
    console.log(promocion);
    setPromocionSeleccionada(promocion);

    const platillosDePromocion = platillos.filter(platillo =>
      promocion.platillos.some(p => p.id === platillo.id)
    );

    setPlatillosFiltrados(platillosDePromocion);

    if (promocion.tipo !== 2) {
      setPlatillosPromocion([]);
      setSeleccionarPlatillosPromocion(true);
    } else {
      // Para promociones por paquete, permitir personalización de cada platillo
      setPlatillosPromocion(
        platillosDePromocion.map(platillo => ({
          idPlatillo: platillo.id,
          nombre: platillo.nombre,
          ingredientes: [],
          extras: [],
          complemento: null,
          cantidad: 1,
          precio: platillo.precio,
          descripcion: null,
          tiempo: platillo.tiempo,
          prioridad: platillo.prioridad,
          completado: false,
          esPromocion: true,
          idPromocion: promocion.id,
          costeNeto: platillo.costeNeto,
        }))
      );

      // Mostrar pantalla para personalizar cada platillo
      setSeleccionarPlatillosPromocion(true);
    }
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
            if (element.extra == true) {
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

  const handleSeleccionarPlatilloPromociones = async (platilloId) => {
    const tipo = promocionSeleccionada.tipo;

    // Corregir las condiciones de límite
    if (tipo === 1 && platillosPromocion.length >= 3) {
      alert("Solo se pueden elegir 3 platillos como máximo");
      return;
    } else if (tipo === 0 && platillosPromocion.length >= 2) {
      alert("Solo se pueden elegir 2 platillos como máximo");
      return;
    }

    try {
      const platilloRef = doc(db, "menu", platilloId);
      const platilloDoc = await getDoc(platilloRef);
      if (platilloDoc.exists()) {
        const platilloData = platilloDoc.data();
        setPlatillosPromocion(prev => [...prev, {
          idPlatillo: platilloId,
          nombre: platilloData.nombre,
          precio: platilloData.precio,
          tiempo: platilloData.tiempo,
          prioridad: platilloData.prioridad,
          costeNeto: platilloData.costeNeto,
          cantidad: 1,
          ingredientes: [],
          extras: [],
          complemento: null,
          descripcion: ""
        }]);
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

      let costo = platilloActual.precio * cantidad;
      if (listaExtra.length > 0) {
        listaExtra.forEach((ext) => {
          costo += ext.precio;
        });
      }
      const PlatilloEditado = {
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
        costeNeto: platilloActual.costeNeto,
      };

      setPlatillosSeleccionados(prev => [...prev, PlatilloEditado]);
      setSeccionSeleccionada(null);
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
    }
  };

  const handleQuitarPlatillo = (index) => {
    setPlatillosSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuitarPromoCarrito = (index) => {
    setCarritoPromociones(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuitarPlatilloPromociones = (index) => {
    setPlatillosPromocion(prev => prev.filter((_, i) => i !== index));
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

  const handleResetPlatillos = () => {
    setExtrasPlatillo([]);
    setlistaExtra([]);
    setComplementosPlatillo([]);
    setComplementoSeleccionado(null);
    setListaIngredientes([]);
    setCantidad(1);
    setDescripcion("");
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
    setSeleccionarPromociones(false);
    setPlatillosPromocion([]);
    setPromocionSeleccionada(null);
    setEditandoPromo(false);
    setEditandoPromoIndex(null);
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

  const enviarPedido = async () => {
    setEnviandoPedido(true);
    if (!mesa.id) {
      alert("No se ha configurado correctamente la mesa");
      return;
    }

    if (platillosSeleccionados.length === 0 && carritoPromociones.length === 0) {
      alert("No hay platillos en el pedido");
      return;
    }

    let puntos = 0;

    try {
      // Función para extraer extras y complementos de un platillo
      const extraerDetallesPlatillo = (platillo) => {
        const detalles = [];

        // Agregar extras si existen
        if (platillo.extras && platillo.extras.length > 0) {
          platillo.extras.forEach(extra => {
            detalles.push({
              idPlatillo: extra.id,
              tipo: 'extra',
              nombre: extra.nombre,
              precio: extra.precio,
              platilloAsociado: platillo.nombre,
              prioridad: platillo.prioridad,
              tiempo: platillo.tiempo,
              completado: false,
              costeNeto: platillo.costeNeto,
            });
            puntos = puntos + parseInt(platillo.prioridad);
          });
        }

        // Agregar complemento si existe
        if (platillo.complemento) {
          detalles.push({
            idPlatillo: platillo.complemento.id,  // <-- Corregido: ahora sí hace referencia al complemento del platillo
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

        return detalles;
      };

      // Recolectar todos los extras y complementos
      let todosExtrasComplementos = [];

      // Procesar platillos normales
      platillosSeleccionados.forEach(platillo => {
        todosExtrasComplementos = [
          ...todosExtrasComplementos,
          ...extraerDetallesPlatillo(platillo)
        ];
        puntos = puntos + parseInt(platillo.prioridad) * platillo.cantidad;
      });

      // Procesar platillos en promociones
      carritoPromociones.forEach(promocion => {
        promocion.platillos.forEach(platillo => {
          todosExtrasComplementos = [
            ...todosExtrasComplementos,
            ...extraerDetallesPlatillo(platillo)
          ];
          puntos = puntos + parseInt(platillo.prioridad);
        });
      });

      const pedidoRef = collection(db, "ordenes");
      const nuevoPedido = {
        mesaId: mesa.id,
        mesaNombre: mesa.nombre,
        platillos: [...platillosSeleccionados],
        promociones: carritoPromociones.length > 0 ? [...carritoPromociones] : null,
        extrasYcomplementos: todosExtrasComplementos.length > 0 ? todosExtrasComplementos : null,
        total: platillosSeleccionados.reduce((sum, platillo) => sum + platillo.precio, 0) +
          carritoPromociones.reduce((sum, promo) => sum + promo.precio, 0),
        estado: "pendiente",
        puntos: puntos,
        preparando: false,
        llevar: false,
        fecha: serverTimestamp()
      };

      await addDoc(pedidoRef, nuevoPedido);
      alert("Pedido enviado correctamente");
      setPlatillosSeleccionados([]);
      setCarritoPromociones([]);
      setPromocionSeleccionada(null);
    } catch (error) {
      console.error("Error enviando el pedido: ", error);
      alert("Error al enviar el pedido");
    } finally {
      setEnviandoPedido(false);
    }
  };


  const seccionesMatriz = [];
  for (let i = 0; i < secciones.length; i += 6) {
    seccionesMatriz.push(secciones.slice(i, i + 6));
  }

  const promocionesMatriz = [];
  for (let j = 0; j < promociones.length; j += 6) {
    promocionesMatriz.push(promociones.slice(j, j + 6));
  }

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <div>
        <AppBar position="static">
          <Toolbar style={{ justifyContent: "center" }}>
            <Button
              color="inherit"
              component={Link}
              to={`/mesas_principal/${mesaId}`}  // Añade mesaId a la ruta
            >
              Menu
            </Button>
            <Button
              color="inherit"
              component={Link}
              to={`/editar_pedidos_mesa/${mesaId}`}  // Añade mesaId a la ruta
            >
              Editar pedidos
            </Button>
          </Toolbar>
        </AppBar>
      </div>

      <div style={{ padding: "20px", width: "80vw", margin: "0 auto" }}>
        {/* Mesero mesa y boton enviar pedido */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', justifyContent: 'center' }}>
          <h3>Mesa: {mesa.nombre}</h3>

          <button
            onClick={enviarPedido}
            disabled={(platillosSeleccionados.length === 0 && carritoPromociones.length === 0) || !mesa.id || enviandoPedido}
            style={{
              padding: '8px 15px',
              backgroundColor: (platillosSeleccionados.length > 0 || carritoPromociones.length > 0) && mesa.id ? '#28a745' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (platillosSeleccionados.length > 0 || carritoPromociones.length > 0) && mesa.id ? 'pointer' : 'not-allowed',
              margin: '10px'
            }}
          >
            {enviandoPedido ? 'Enviando...' : 'Enviar Pedido'}
          </button>
        </div>

        {/* Matriz de secciones (6 columnas) */}
        {!seccionSeleccionada && !seleccionarPromociones && (
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
                {
                  promociones.length > 0 && (
                    <button
                      key={1234567890}
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
                  )
                }
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
                <h3>Seleccione {promocionSeleccionada == 1 ? "2" : "3"} platillos:</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px',
                  marginTop: '15px'
                }}>
                  {platillosFiltrados.map(platillo => (
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
                  ))}
                </div>
              </div>
            )}


            {platillosPromocion.map((platillo, index) => (
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
                      // Calcular precio total según tipo de promoción incluyendo extras
                      let precioTotal = 0;
                      let preciosPlatillos = [];

                      // Calcular el precio de cada platillo incluyendo sus extras
                      platillosPromocion.forEach(platillo => {
                        let precioPlatillo = platillo.precio;

                        // Sumar extras si existen
                        if (platillo.extras && platillo.extras.length > 0) {
                          precioPlatillo += platillo.extras.reduce((sum, extra) => sum + extra.precio, 0);
                        }

                        // Sumar complemento si existe
                        if (platillo.complemento && platillo.complemento.precio) {
                          precioPlatillo += platillo.complemento.precio;
                        }

                        preciosPlatillos.push(precioPlatillo);
                      });

                      if (promocionSeleccionada.tipo === 0) { // 2x1
                        // Tomar el platillo más caro (con extras) como pago
                        precioTotal = Math.max(...preciosPlatillos);
                      }
                      else if (promocionSeleccionada.tipo === 1) { // 3x2
                        // Ordenar de mayor a menor y sumar los 2 más caros (con extras)
                        const sorted = [...preciosPlatillos].sort((a, b) => b - a);
                        precioTotal = sorted[0] + sorted[1];
                      }
                      else { // Promoción por paquete (tipo 2)
                        // El precio fijo de la promoción más los extras de cada platillo
                        precioTotal = promocionSeleccionada.precio;
                        // Sumar todos los extras de los platillos de la promoción
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

            {!personalizarPlatilloPromo && (
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
            )}

            <br />

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: "center" }}>
              {
                personalizarPlatilloPromo == true ? (
                  <button
                    onClick={() => (setPlatilloActual(null), setPersonalizarPlatilloPromo(false)
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
                    Volver a promociones
                  </button>
                ) : (
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
                )
              }

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
                {editandoIndex !== null ? 'Modificar platillo' : 'Agregar al pedido'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de platillos seleccionados (carrito) */}
        {!editandoIndex && (
          platillosSeleccionados.map((platillo, index) => (
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
          )))}

        {/* Lista de promociones seleccionadas (carrito 2) */}
        {!editandoIndex && (
          carritoPromociones.map((promocionC, index) => (
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
          )))
        }

      </div>
    </div >
  )
}

export default MesasPrincipal;