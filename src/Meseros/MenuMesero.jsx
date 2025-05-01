import React, { useEffect, useState } from "react";
import NavBarMeseros from '../Admin/NavBars/NavBarMeseros'
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

function MenuMesero() {
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

  useEffect(() => {
    loadMesas();
    loadSecciones();
    loadPlatillos();
  }, []);

  const handleMesaChange = (event) => {
    const idSeleccionado = event.target.value;

    if (!idSeleccionado) {
      setMesaSeleccionada({ id: "", nombre: "Mesa sin seleccionar" });
      return;
    }

    const mesaElegida = mesas.find((mesa) => mesa.id === idSeleccionado);

    if (mesaElegida) {
      setMesaSeleccionada({
        id: mesaElegida.id,
        nombre: mesaElegida.username,
      });
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
      const PlatilloEditado = {
        idPlatillo: platilloSeleccionadoId,
        nombre: platilloActual.nombre,
        ingredientes: listaIngredientes,
        extras: listaExtra.length > 1 ? listaExtra : null,
        complemento: complementoSeleccionado ? complementoSeleccionado : null,
        cantidad: cantidad,
      }
      console.log(PlatilloEditado);
      //Arreglar el carrito
      setPlatillosSeleccionados(prev => [...prev, PlatilloEditado]);
      setSeccionSeleccionada(null);
      handleReset();
    }
  };

  const handleQuitarPlatillo = (platilloId) => {
    setPlatillosSeleccionados(prev => prev.filter(p => p.id !== platilloId));
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
    setPlatilloSeleccionadoId(null)
    setPlatilloActual(null)
    setPlatilloEdicion(false);
    setExtrasPlatillo([])
    setlistaExtra([])
    setComplementosPlatillo([])
    setComplementoSeleccionado();
  }



  const seccionesMatriz = [];
  for (let i = 0; i < secciones.length; i += 6) {
    seccionesMatriz.push(secciones.slice(i, i + 6));
  }

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarMeseros />

      <div style={{ padding: "20px", width: "80vw", margin: "0 auto" }}>
        <h3>Mesa: {""}
          <select
            onChange={handleMesaChange}
            value={mesaSeleccionada.id}
            style={{ marginBottom: "15px", padding: "8px" }}
          >
            <option value="">Sin mesa</option>
            {mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                {mesa.username}
              </option>
            ))}
          </select>
        </h3>

        {/* Matriz de secciones (6 columnas) */}
        {!seccionSeleccionada && (
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
                onClick={() => setCantidad(cantidad + 1)}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                +
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
                onClick={() => setCantidad(cantidad - 1)}
                disabled={cantidad <= 1}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                -
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
                onClick={handleAgregarAlPedido}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Agregar al pedido
              </button>
            </div>
          </div>
        )}

        {/* Lista de platillos seleccionados (carrito) */}
        {platillosSeleccionados.length > 0 && (
          <div style={{ marginTop: "30px", padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <h3>Pedido para {mesaSeleccionada.nombre}:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {platillosSeleccionados.map((platillo, index) => (
                <li
                  key={`${platillo.id}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <span>{platillo.nombre} - ${platillo.precio}</span>
                  <button
                    onClick={() => handleQuitarPlatillo(platillo.id)}
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
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '1.2em' }}>
              Total: ${platillosSeleccionados.reduce((sum, platillo) => sum + (parseFloat(platillo.precio) || 0), 0).toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div >
  )
}

export default MenuMesero;