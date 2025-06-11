import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, updateDoc } from "firebase/firestore";
import NavBarAdminPromos from "../NavBars/NavBarAdminPromos";

const EdicionPromocionesAdmin = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Obtenemos el ID de la promoción a editar

    const [listaPlatillos, setListaPlatillos] = useState([]);
    const [platillosSeleccionados, setPlatillosSeleccionados] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [promocionSemanal, setPromocionSemanal] = useState(true);
    const [tipoPromocion, setTipoPromocion] = useState(0);
    const [diasSemana, setDiasSemana] = useState({
        lunes: false,
        martes: false,
        miercoles: false,
        jueves: false,
        viernes: false,
        sabado: false,
        domingo: false
    });
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [precioPaquete, setPrecioPaquete] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [nombrePromo, setNombrePromo] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            await loadPlatillos();
            await loadPromocion();
        };
        cargarDatos();
    }, [id]);

    const loadPlatillos = async () => {
        try {
            const querySnapshot = await getDocs(query(collection(db, "menu")));
            const platillosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setListaPlatillos(platillosData);
        } catch (error) {
            console.error("Error al cargar los platillos:", error);
        }
    };

    const loadPromocion = async () => {
        try {
            const promocionRef = doc(db, "promociones", id);
            const promocionDoc = await getDoc(promocionRef);
            
            if (!promocionDoc.exists()) {
                alert("Promoción no encontrada");
                navigate("/promociones_admin");
                return;
            }

            const promocionData = promocionDoc.data();
            
            // Establecer los valores de la promoción existente
            setNombrePromo(promocionData.nombre || "");
            setDescripcion(promocionData.descripcion || "");
            setPlatillosSeleccionados(promocionData.platillos || []);
            setTipoPromocion(promocionData.tipo || 0);
            setPromocionSemanal(promocionData.esSemanal || true);
            
            if (promocionData.esSemanal) {
                setDiasSemana(promocionData.dias || {
                    lunes: false,
                    martes: false,
                    miercoles: false,
                    jueves: false,
                    viernes: false,
                    sabado: false,
                    domingo: false
                });
            } else {
                setFechaInicio(promocionData.fechaInicio || "");
                setFechaFin(promocionData.fechaFin || "");
            }
            
            if (promocionData.tipo === 2) {
                setPrecioPaquete(promocionData.precio?.toString() || "");
            }
            
        } catch (error) {
            console.error("Error al cargar la promoción:", error);
            alert("Error al cargar la promoción");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (platillo) => {
        setPlatillosSeleccionados(prev => {
            const existe = prev.some(p => p.id === platillo.id);
            return existe
                ? prev.filter(p => p.id !== platillo.id)
                : [...prev, { id: platillo.id, nombre: platillo.nombre, seccion: platillo.seccion }];
        });
    };

    const handleDiaChange = (dia) => {
        setDiasSemana(prev => ({
            ...prev,
            [dia]: !prev[dia]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (platillosSeleccionados.length < 1) {
            alert("Se debe seleccionar por lo menos 1 platillo");
            setIsSubmitting(false);
            return;
        }

        if (promocionSemanal) {
            const diasSeleccionados = Object.values(diasSemana).filter(Boolean).length;
            if (diasSeleccionados < 1) {
                alert("Debe seleccionar al menos 1 día de la semana");
                setIsSubmitting(false);
                return;
            }
        } else {
            if (!fechaInicio || !fechaFin) {
                alert("Debe especificar fechas de inicio y fin");
                setIsSubmitting(false);
                return;
            }
            if (new Date(fechaInicio) > new Date(fechaFin)) {
                alert("La fecha de inicio no puede ser mayor a la fecha de fin");
                setIsSubmitting(false);
                return;
            }
            if (new Date(fechaInicio) < new Date()) {
                alert("La fecha de inicio no puede ser anterior al día actual");
                setIsSubmitting(false);
                return;
            }
        }

        if (tipoPromocion === 2 && !precioPaquete) {
            alert("Debe especificar un precio para el paquete");
            setIsSubmitting(false);
            return;
        }
        if(tipoPromocion === 2 && parseFloat(precioPaquete) < 1){
            alert("El precio del paquete debe ser mayor a 0");
            setIsSubmitting(false);
            return;
        }

        try {
            const promocionData = {
                nombre: nombrePromo,
                descripcion: descripcion,
                platillos: platillosSeleccionados,
                tipo: tipoPromocion,
                esSemanal: promocionSemanal,
                ...(promocionSemanal ? { dias: diasSemana } : { fechaInicio, fechaFin }),
                ...(tipoPromocion === 2 && { precio: parseFloat(precioPaquete) }),
                fechaActualizacion: new Date() // Agregamos fecha de actualización
            };

            await updateDoc(doc(db, "promociones", id), promocionData);
            alert("Promoción actualizada exitosamente");
            navigate("/promociones_admin");
        } catch (error) {
            console.error("Error al actualizar la promoción:", error);
            alert("Hubo un error al actualizar la promoción.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
                <NavBarAdminPromos />
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>Cargando promoción...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarAdminPromos />
            <div style={{ marginBottom: "15px", textAlign: "center" }}>
                <h1>Editar promoción o paquete</h1>
                <div style={{ width: '100vw', textAlign: "center", justifyContent: "center" }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Duración de la promoción</th>
                                <th>Tipo de promoción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                                        <button
                                            onClick={() => setPromocionSemanal(true)}
                                            style={{
                                                margin: '0 10px',
                                                padding: '10px 20px',
                                                backgroundColor: promocionSemanal ? '#4CAF50' : '#f0f0f0',
                                                color: promocionSemanal ? 'white' : 'black',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Semanal
                                        </button>
                                        <button
                                            onClick={() => setPromocionSemanal(false)}
                                            style={{
                                                margin: '0 10px',
                                                padding: '10px 20px',
                                                backgroundColor: !promocionSemanal ? '#4CAF50' : '#f0f0f0',
                                                color: !promocionSemanal ? 'white' : 'black',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Tiempo definido
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                                        <button
                                            onClick={() => setTipoPromocion(0)}
                                            style={{
                                                margin: '0 10px',
                                                padding: '10px 20px',
                                                backgroundColor: tipoPromocion === 0 ? '#4CAF50' : '#f0f0f0',
                                                color: tipoPromocion === 0 ? 'white' : 'black',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            2x1
                                        </button>
                                        <button
                                            onClick={() => setTipoPromocion(1)}
                                            style={{
                                                margin: '0 10px',
                                                padding: '10px 20px',
                                                backgroundColor: tipoPromocion === 1 ? '#4CAF50' : '#f0f0f0',
                                                color: tipoPromocion === 1 ? 'white' : 'black',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            3x2
                                        </button>
                                        <button
                                            onClick={() => setTipoPromocion(2)}
                                            style={{
                                                margin: '0 10px',
                                                padding: '10px 20px',
                                                backgroundColor: tipoPromocion === 2 ? '#4CAF50' : '#f0f0f0',
                                                color: tipoPromocion === 2 ? 'white' : 'black',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Paquete / Combo
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style={{ margin: '20px auto', maxWidth: '600px' }}>
                    {promocionSemanal ? (
                        <div>
                            <h3>Seleccione los días de la semana:</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {Object.keys(diasSemana).map(dia => (
                                    <label key={dia} style={{ margin: '0 10px 10px 0' }}>
                                        <input
                                            type="checkbox"
                                            checked={diasSemana[dia]}
                                            onChange={() => handleDiaChange(dia)}
                                        />
                                        {dia.charAt(0).toUpperCase() + dia.slice(1)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3>Especifique el rango de fechas:</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                                <div>
                                    <label>Fecha de inicio:</label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        style={{ marginLeft: '10px' }}
                                    />
                                </div>
                                <div>
                                    <label>Fecha de fin:</label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        style={{ marginLeft: '10px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {tipoPromocion === 2 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3>Precio del paquete:</h3>
                            <input
                                type="number"
                                value={precioPaquete}
                                onChange={(e) => setPrecioPaquete(e.target.value)}
                                placeholder="Ingrese el precio"
                                min="0"
                                step="0.01"
                                style={{ padding: '8px', width: '200px' }}
                            />
                        </div>
                    )}

                    {tipoPromocion !== 2 && (
                        <div style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
                            {tipoPromocion === 0 ? "Promoción 2x1" : "Promoción 3x2"}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
                    <h2>Platillos incluidos:</h2>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '0 auto 20px', maxWidth: '600px' }}>
                        {listaPlatillos.map((platillo) => (
                            <div key={platillo.id} style={{ marginBottom: "10px" }}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={platillosSeleccionados.some(p => p.id === platillo.id)}
                                        onChange={() => handleCheckboxChange(platillo)}
                                        disabled={isSubmitting}
                                    />
                                    {platillo.nombre}
                                </label>
                            </div>
                        ))}
                    </div>

                    <label>Nombre de la promoción:</label><br />
                    <input
                        type="text"
                        value={nombrePromo}
                        onChange={(e) => setNombrePromo(e.target.value)}
                        disabled={isSubmitting}
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                    /><br />

                    <label>Descripción:</label><br/>
                    <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                    /><br/>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "16px",
                            marginBottom: "20px"
                        }}
                    >
                        {isSubmitting ? "Actualizando..." : "Actualizar Promoción"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default EdicionPromocionesAdmin;