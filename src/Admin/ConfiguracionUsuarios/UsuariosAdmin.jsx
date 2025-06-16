import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, where } from "firebase/firestore";
import { Link, Navigate } from "react-router-dom";
import NavBarUsuarios from "../NavBars/NavBarUsuarios";

function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);

    // Estados para el primer modal (creación de usuario)
    const [showModal, setShowModal] = useState(false);
    const [modalNombre, setModalNombre] = useState("");
    const [modalContra, setModalContra] = useState("");
    const [errorContra, setErrorContra] = useState("");
    const [tipoUsuarioModal, setTipoUsuarioModal] = useState(null);

    // Estados para el segundo modal (permisos de admin)
    const [showPermisosModal, setShowPermisosModal] = useState(false);
    const [nuevoAdminId, setNuevoAdminId] = useState("");
    const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);

    // Estados para el modal de configuración de cocina
    const [showCocinaModal, setShowCocinaModal] = useState(false);
    const [nuevaCocinaId, setNuevaCocinaId] = useState("");
    const [platillosSeleccionados, setPlatillosSeleccionados] = useState([]);
    const [listaPlatillos, setListaPlatillos] = useState([]);

    const [nombre, setNombre] = useState("");
    const [contra, setContra] = useState("");
    const [tipoUsuario, setTipoUsuario] = useState();
    const [usuarioId, setUsuarioId] = useState();

    const [usuarioIdRespaldo, setUsuarioIdRespaldo] = useState();

    const listaPermisos = [
        { nombre: "Menu", id: 1 },
        { nombre: "Cocinas", id: 2 },
        { nombre: "Promociones", id: 3 },
        { nombre: "Reportes", id: 4 },
        { nombre: "Inventario", id: 5 },
        { nombre: "Usuarios", id: 6 }
    ];

    const handleCrearUsuario = async () => {
        const error = validarContraseña(modalContra);
        if (error) {
            setErrorContra(error);
            return;
        }

        try {
            let nuevoUsuario = {
                username: modalNombre,
                password: modalContra,
                isAdmin: tipoUsuarioModal === "admin",
                permisos: []
            };

            if (tipoUsuarioModal !== "admin") {
                nuevoUsuario.tipo = parseInt(
                    tipoUsuarioModal === "cocina" ? 1 :
                        tipoUsuarioModal === "mesa" ? 2 : 0
                );
            }

            const docRef = await addDoc(collection(db, "users"), nuevoUsuario);
            console.log("Nuevo usuario creado con ID:", docRef.id);
            setUsuarioIdRespaldo(docRef.id);

            setShowModal(false);

            if (tipoUsuarioModal === "admin") {
                setNuevoAdminId(docRef.id);
                setPermisosSeleccionados(listaPermisos);
                setShowPermisosModal(true);
            } else if (tipoUsuarioModal === "cocina") {
                setNuevaCocinaId(docRef.id);
                setShowCocinaModal(true);
            } else {
                loadUsuarios();
            }
        } catch (error) {
            console.error("Error al crear el usuario.", error);
            alert("Hubo un error al crear el usuario.");
        }
    };

    const handleGuardarPermisos = async () => {
        if(permisosSeleccionados.length < 1){
            alert("El administrador debe tener al menos 1 permiso");
            return;
        }
        try {
            await updateDoc(doc(db, "users", nuevoAdminId), {
                permisos: permisosSeleccionados
            });
            setShowPermisosModal(false);
            loadUsuarios();
        } catch (error) {
            console.error("Error al guardar permisos:", error);
            alert("Hubo un error al guardar los permisos.");
        }
    };

    const handleGuardarCocina = async () => {
        if(platillosSeleccionados.length < 1){
            alert("La cocina debe tener al menos 1 platillo");
            return;
        }
        try {
            await updateDoc(doc(db, "users", nuevaCocinaId), {
                permisos: platillosSeleccionados
            });
            setShowCocinaModal(false);
            loadUsuarios();
        } catch (error) {
            console.error("Error al guardar configuración de cocina:", error);
            alert("Hubo un error al guardar la configuración.");
        }
    };

    const togglePermiso = (permiso) => {
        setPermisosSeleccionados(prev =>
            prev.some(p => p.id === permiso.id)
                ? prev.filter(p => p.id !== permiso.id)
                : [...prev, permiso]
        );
    };

    const togglePlatillo = (platillo) => {
        setPlatillosSeleccionados(prev => {
            const existe = prev.some(p => p.id === platillo.id);
            return existe
                ? prev.filter(p => p.id !== platillo.id)
                : [...prev, { id: platillo.id, nombre: platillo.nombre, seccion: platillo.seccion }];
        });
    };

    const loadUsuarios = async () => {
        try {
            const querySnapshot = await getDocs(query(collection(db, "users")));
            const usuariosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const { admins, cocinas, mesas, meseros } = usuariosData.reduce(
                (acc, user) => {
                    if (user.isAdmin) acc.admins.push(user);
                    else if (user.tipo === 1) acc.cocinas.push(user);
                    else if (user.tipo === 2) acc.mesas.push(user);
                    else if (user.tipo === 0) acc.meseros.push(user);
                    return acc;
                },
                { admins: [], cocinas: [], mesas: [], meseros: [] }
            );

            setUsuarios([...admins, ...cocinas, ...mesas, ...meseros]);
        } catch (error) {
            console.error("Error obteniendo los usuarios: ", error);
        }
    };

    const loadPlatillos = async () => {
        try {
            const querySnapshot = await getDocs(query(collection(db, "menu")));
            const platillosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(platillosData);
            setListaPlatillos(platillosData);
        } catch (error) {
            console.error("Error al cargar los platillos:", error);
        }
    };

    const abrirModal = (tipo) => {
        setTipoUsuarioModal(tipo);
        setModalNombre("");
        setModalContra("");
        setErrorContra("");
        setShowModal(true);
    };

    const validarContraseña = (contraseña) => {
        if (contraseña.length < 6 || contraseña.length > 16) {
            return "La contraseña debe tener entre 6 y 16 caracteres";
        }
        return "";
    };

    const handleCrearCocina = async () => {
        abrirModal("cocina");
    };

    const handleCrearAdmin = async () => {
        abrirModal("admin");
    };

    const handleCrearMesa = async () => {
        abrirModal("mesa");
    };

    const handleCrearMesero = async () => {
        abrirModal("mesero");
    };

    const handleDelete = async (id, nom) => {
        const usuarioConfirmo = window.confirm("Estas seguro que quieres eliminar el usuario " + nom);
        if (usuarioConfirmo) {
            try {
                await deleteDoc(doc(db, "users", id));
                loadUsuarios();
            } catch (error) {
                console.error("Error al eliminar el producto:", error);
                alert("Hubo un error al eliminar el producto.");
            }
        }
    };

    const handleEditar = (usuario) => {
        setUsuarioId(usuario.id);
        setTipoUsuario(usuario.isAdmin ? "null" : usuario.tipo?.toString());
        setContra(usuario.password);
        setNombre(usuario.username);
    };

    const handleCancelarEdicion = () => {
        setUsuarioId(null);
    };

    const handleGuardarCambios = async (id) => {
        try {
            const esAdmin = tipoUsuario === null || tipoUsuario === "null";

            const seccionRef = doc(db, "users", id);

            const datosActualizados = {
                username: nombre,
                password: contra,
                isAdmin: esAdmin,
            };

            if (!esAdmin) {
                datosActualizados.tipo = parseInt(tipoUsuario);
            } else {
                datosActualizados.tipo = null;
            }

            await updateDoc(seccionRef, datosActualizados);

            setUsuarioId(null);
            loadUsuarios();
        } catch (error) {
            console.error("Error actualizando el usuario: ", error);
            alert("Hubo un error actualizando el usuario.");
        }
    };

    const cancelarCreacionUsuario = async () => {
        await deleteDoc(doc(db, "users", usuarioIdRespaldo));
    }

    useEffect(() => {
        loadUsuarios();
        loadPlatillos();
    }, []);

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarUsuarios />

            {/* Modal para crear usuario */}
            {showModal && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h2>Crear nuevo {tipoUsuarioModal === "admin" ? "administrador" : tipoUsuarioModal}</h2>

                        <div style={inputGroupStyle}>
                            <label>Nombre de usuario:</label>
                            <input
                                type="text"
                                value={modalNombre}
                                onChange={(e) => setModalNombre(e.target.value)}
                                style={inputStyle}
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label>Contraseña:</label>
                            <input
                                type="password"
                                value={modalContra}
                                onChange={(e) => {
                                    setModalContra(e.target.value);
                                    setErrorContra(validarContraseña(e.target.value));
                                }}
                                style={inputStyle}
                            />
                            {errorContra && <p style={{ color: 'red', fontSize: '12px' }}>{errorContra}</p>}
                        </div>

                        <div style={buttonGroupStyle}>
                            <button onClick={() => setShowModal(false)} style={cancelButtonStyle}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearUsuario}
                                disabled={!modalNombre || !modalContra || errorContra}
                                style={createButtonStyle(!modalNombre || !modalContra || errorContra)}
                            >
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para configurar permisos de admin */}
            {showPermisosModal && (
                <div style={modalStyle}>
                    <div style={modalContentStyle}>
                        <h2>Configurar Permisos de Administrador</h2>

                        <div style={{ marginBottom: '20px' }}>
                            {listaPermisos.map((permiso) => (
                                <div key={permiso.id} style={{ marginBottom: '10px' }}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={permisosSeleccionados.some(p => p.id === permiso.id)}
                                            onChange={() => togglePermiso(permiso)}
                                            style={{ marginRight: '10px' }}
                                        />
                                        {permiso.nombre}
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div style={buttonGroupStyle}>
                            <button
                                onClick={() => {
                                    setShowPermisosModal(false);
                                    loadUsuarios();
                                    cancelarCreacionUsuario();
                                }}
                                style={cancelButtonStyle}
                            >
                                Saltar (usar permisos por defecto)
                            </button>
                            <button
                                onClick={handleGuardarPermisos}
                                style={saveButtonStyle}
                            >
                                Guardar Permisos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para configurar cocina */}
            {showCocinaModal && (
                <div style={modalStyle}>
                    <div style={{ ...modalContentStyle, width: '600px' }}>
                        <h2>Configurar Platillos para Cocina</h2>

                        <div style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                            {listaPlatillos.map((platillo) => (
                                <div key={platillo.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={platillosSeleccionados.some(p => p.id === platillo.id)}
                                        onChange={() => togglePlatillo(platillo)}
                                        style={{ marginRight: '10px' }}
                                    />
                                    <div>
                                        <div><strong>{platillo.nombre || "Sin nombre"}</strong></div>
                                        <div style={{ fontSize: '0.8em', color: '#666' }}>Sección: {platillo.seccion.nombre || 'Sin sección'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={buttonGroupStyle}>
                            <button
                                onClick={() => {
                                    setShowCocinaModal(false);
                                    loadUsuarios();
                                    cancelarCreacionUsuario();
                                }}
                                style={cancelButtonStyle}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardarCocina}
                                disabled={platillosSeleccionados.length === 0}
                                style={platillosSeleccionados.length === 0 ? disabledButtonStyle : saveButtonStyle}
                            >
                                Guardar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Tipo de usuario</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Nombre</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Contraseña</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Permisos</th>
                        <th></th>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((user) => (
                        <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                {usuarioId === user.id ? (
                                    <select onChange={(e) => {
                                        setTipoUsuario(e.target.value);
                                    }} value={tipoUsuario} style={{ marginBottom: "15px" }}>
                                        <option value="null">Admin</option>
                                        <option value="1">Cocina</option>
                                        <option value="2">Mesa</option>
                                        <option value="0">Mesero</option>
                                    </select>
                                ) : (
                                    user.isAdmin ? "Administrador" :
                                        (user.tipo === 1 ? "Cocina" :
                                            (user.tipo === 2 ? "Mesa" :
                                                "Mesero"
                                            ))
                                )}
                            </td>

                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                {usuarioId === user.id ? (
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        style={{ width: "100%", padding: "5px" }}
                                    />
                                ) : (
                                    user.username
                                )}
                            </td>

                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                {usuarioId === user.id ? (
                                    <input
                                        type="text"
                                        value={contra}
                                        onChange={(e) => setContra(e.target.value)}
                                        style={{ width: "100%", padding: "5px" }}
                                    />
                                ) : (user.password)}
                            </td>

                            <td style={{ padding: '10px', textAlign: 'center' }}>{
                                user.permisos == null ? ((user.tipo == 1 || user.isAdmin) ? "Sin permisos asignados" :
                                    (user.tipo == 0 ? "Permisos de mesero" : "Permisos de mesa")) :
                                    user.permisos.map((permiso) => (
                                        <div key={permiso.id}> {permiso.nombre} </div>
                                    ))
                            }
                            </td>

                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                {usuarioId === user.id ? (
                                    <>
                                        <button
                                            onClick={() => handleGuardarCambios(user.id)}
                                            style={{
                                                backgroundColor: "#28a745",
                                                color: "white",
                                                border: "none",
                                                padding: "5px 10px",
                                                borderRadius: "5px",
                                                cursor: "pointer",
                                                marginRight: "5px",
                                            }}
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={handleCancelarEdicion}
                                            style={{
                                                backgroundColor: "#dc3545",
                                                color: "white",
                                                border: "none",
                                                padding: "5px 10px",
                                                borderRadius: "5px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleEditar(user)}
                                        style={{
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            border: "none",
                                            padding: "5px 10px",
                                            borderRadius: "5px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Editar
                                    </button>
                                )}
                            </td>

                            <td style={{ textAlign: 'center' }}>
                                <button
                                    onClick={() => handleDelete(user.id, user.username)}
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
                            </td>

                            <td style={{ textAlign: 'center' }}>
                                <button
                                    disabled={user.tipo == 2 || user.tipo == 0}
                                    onClick={() => {
                                        if (user.isAdmin) {
                                            setNuevoAdminId(user.id);
                                            setPermisosSeleccionados(user.permisos || []);
                                            setShowPermisosModal(true);
                                        } else if (user.tipo == 1) {
                                            setNuevaCocinaId(user.id);
                                            setPlatillosSeleccionados(user.permisos || []);
                                            loadPlatillos().then(() => setShowCocinaModal(true));
                                        }
                                    }}
                                    style={{
                                        backgroundColor: (user.isAdmin == true || user.tipo == 1) ? '#007bff' : "gray",
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 10px',
                                        borderRadius: '5px',
                                        cursor: (user.isAdmin == true || user.tipo == 1) ? "pointer" : "not-allowed",
                                    }}
                                >
                                    {(user.isAdmin == true || user.tipo == 1) ?
                                        (user.isAdmin ? "Configurar permisos" : "Configurar divisiones de menu")
                                        : "No configurable"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
                <button
                    style={{ marginRight: "20px", marginLeft: "20px", cursor: "pointer" }}
                    onClick={handleCrearCocina}
                >
                    Crear cocina
                </button>
                <button
                    style={{ marginRight: "20px", marginLeft: "20px", cursor: "pointer" }}
                    onClick={handleCrearMesero}
                >
                    Crear mesero
                </button>
                <button
                    style={{ marginRight: "20px", marginLeft: "20px", cursor: "pointer" }}
                    onClick={handleCrearMesa}
                >
                    Crear mesa
                </button>
                <button
                    style={{ marginRight: "20px", marginLeft: "20px", cursor: "pointer" }}
                    onClick={handleCrearAdmin}
                >
                    Crear administrador
                </button>
            </div>
        </div>
    );
}


// Estilos reutilizables
const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '400px',
    maxWidth: '90%'
};

const inputGroupStyle = {
    marginBottom: '15px'
};

const inputStyle = {
    width: '100%',
    padding: '8px',
    marginTop: '5px'
};

const buttonGroupStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
};

const cancelButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
};

const createButtonStyle = (disabled) => ({
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1
});

const saveButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
};

const disabledButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#cccccc',
    color: '#666666',
    border: 'none',
    borderRadius: '4px',
    cursor: 'not-allowed'
};

export default UsuariosAdmin;