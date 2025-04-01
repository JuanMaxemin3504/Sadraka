import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import NavBarUsuarios from "../NavBars/NavBarUsuarios";

function UsuariosAdmin() {

    const [usuarios, setUsuarios] = useState([]);
    const [botonAgregarCocina, setBotonAgregarCocina] = useState(false);
    const [botonAgregarMesero, setBotonAgregarMesero] = useState(false);
    const [botonAgregarMesa, setBotonAgregarMesa] = useState(false);
    const [botonAgregarAdmin, setBotonAgregarAdmin] = useState(false);

    const [nombre, setNombre] = useState("")
    const [contra, setContra] = useState("")
    const [tipoUsuario, setTipoUsuario] = useState()
    const [usuarioId, setUsuarioId] = useState()

    const loadUsuarios = async () => {
        console.log("Cargando usuarios...");
        try {
            const querySnapshot = await getDocs(query(collection(db, "users")));

            const usuariosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            const { admins, cocinas, mesas, meseros } = usuariosData.reduce(
                (acc, user) => {
                    if (user.isAdmin) {
                        acc.admins.push(user);
                    } else if (user.tipo === 1) {
                        acc.cocinas.push(user);
                    } else if (user.tipo === 2) {
                        acc.mesas.push(user);
                    } else if (user.tipo === 0) {
                        acc.meseros.push(user);
                    }
                    return acc;
                },
                { admins: [], cocinas: [], mesas: [], meseros: [] }
            );

            setUsuarios([...admins, ...cocinas, ...mesas, ...meseros]);
        } catch (error) {
            console.error("Error obteniendo los usuarios: ", error);
        }
    };
    const handleCrearCocina = async () => {
        setBotonAgregarCocina(true);
        let numero = 1;
        try {
            const q = query(
                collection(db, "users"),
                where("username", ">=", "Cocina nueva"),
                where("username", "<=", "Cocina nuev" + "\uf8ff")
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                numero++;
            });

            const nombre = "Cocina nueva " + numero
            const nuevaCocina = {
                username: nombre,
                isAdmin: false,
                tipo: parseInt(1),
                password: "cocina"
            };
            const docRef = await addDoc(collection(db, "users"), nuevaCocina);
            console.log("Nueva cocina creada con ID:", docRef.id);
            loadUsuarios();
        } catch (error) {
            console.error("Error al crear la cocina.", error);
            alert("Hubo un error al crear la cocina.");
        } finally {
            setBotonAgregarCocina(false);
        }
    }
    const handleCrearAdmin = async () => {
        setBotonAgregarAdmin(true);
        let numero = 1;
        try {
            const q = query(
                collection(db, "users"),
                where("username", ">=", "Admin nuevo"),
                where("username", "<=", "Admin nuev" + "\uf8ff")
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                numero++;
            });

            const nombre = "Admin nuevo " + numero
            const nuevoAdmin = {
                username: nombre,
                isAdmin: true,
                password: "admin"
            };
            const docRef = await addDoc(collection(db, "users"), nuevoAdmin);
            console.log("Nueva admin creado con ID:", docRef.id);
            loadUsuarios();
        } catch (error) {
            console.error("Error al crear el admin.", error);
            alert("Hubo un error al crear el admin.");
        } finally {
            setBotonAgregarAdmin(false);
        }
    }
    const handleCrearMesa = async () => {
        setBotonAgregarMesa(true);
        let numero = 1;
        try {
            const q = query(
                collection(db, "users"),
                where("username", ">=", "Mesa nueva"),
                where("username", "<=", "Mesa nuev" + "\uf8ff")
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                numero++;
            });

            const nombre = "Mesa nueva " + numero
            const nuevaMesa = {
                username: nombre,
                isAdmin: false,
                tipo: parseInt(2),
                password: "mesa"
            };
            const docRef = await addDoc(collection(db, "users"), nuevaMesa);
            console.log("Nueva mesa creada con ID:", docRef.id);
            loadUsuarios();
        } catch (error) {
            console.error("Error al crear la mesa.", error);
            alert("Hubo un error al crear la mesa.");
        } finally {
            setBotonAgregarMesa(false);
        }
    }
    const handleCrearMesero = async () => {
        setBotonAgregarMesero(true);
        let numero = 1;
        try {
            const q = query(
                collection(db, "users"),
                where("username", ">=", "Mesero nuevo"),
                where("username", "<=", "Mesero nuev" + "\uf8ff")
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                numero++;
            });

            const nombre = "Mesero nuevo " + numero
            const nuevaCocina = {
                username: nombre,
                isAdmin: false,
                tipo: parseInt(0),
                password: "mesero"
            };
            const docRef = await addDoc(collection(db, "users"), nuevaCocina);
            console.log("Nueva mesero cread0 con ID:", docRef.id);
            loadUsuarios();
        } catch (error) {
            console.error("Error al crear al mesero.", error);
            alert("Hubo un error al crear al mesero.");
        } finally {
            setBotonAgregarMesero(false);
        }
    }
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
    }
    const handleEditar = (usuario) => {
        setUsuarioId(usuario.id);
        setTipoUsuario(usuario.isAdmin ? "null" : usuario.tipo?.toString());
        setContra(usuario.password);
        setNombre(usuario.username);
    };

    const handleCancelarEdicion = () => {
        setUsuarioId(null);
    }

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

    useEffect(() => {
        loadUsuarios();
    }, []);

    return (
        <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <NavBarUsuarios />
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
                                user.permisos == null ? ( (user.tipo == 1 || user.isAdmin )? "Sin permisos asignados" :
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
                                <Link to={ user.tipo == 1 ? `/edicion_cocinas/${user.id}` : `/edicion_permisos/${user.id}`}>
                                    <button
                                        disabled={user.tipo == 2 || user.tipo == 0}
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
                                </Link>
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
                <button style={{ marginRight: "20px", marginLeft: "20px", cursor: botonAgregarCocina ? "not-allowed" : "pointer" }}
                    disabled={botonAgregarCocina}
                    onClick={async () => handleCrearCocina()}>
                    {botonAgregarCocina ? "Creando cocina" : "Crear cocina"}
                </button>
                <button style={{ marginRight: "20px", marginLeft: "20px", cursor: botonAgregarMesero ? "not-allowed" : "pointer" }}
                    disabled={botonAgregarMesero}
                    onClick={async () => handleCrearMesero()}>
                    {botonAgregarMesero ? "Creando mesero" : "Crear mesero"}
                </button>
                <button style={{ marginRight: "20px", marginLeft: "20px", cursor: botonAgregarMesa ? "not-allowed" : "pointer" }}
                    disabled={botonAgregarMesa}
                    onClick={async () => handleCrearMesa()}>
                    {botonAgregarMesa ? "Creando mesa" : "Crear mesa"}
                </button>
                <button style={{ marginRight: "20px", marginLeft: "20px", cursor: botonAgregarAdmin ? "not-allowed" : "pointer" }}
                    disabled={botonAgregarAdmin}
                    onClick={async () => handleCrearAdmin()}>
                    {botonAgregarAdmin ? "Creando administrador" : "Crear administrador"}
                </button>
            </div>

        </div>
    )
}

export default UsuariosAdmin
