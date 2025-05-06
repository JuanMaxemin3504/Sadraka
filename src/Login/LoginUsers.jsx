import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from "./inicioSesion";
import "./LoginStyle.css";

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const onUsernameChange = (event) => {
        setUsername(event.target.value);
    };

    const onPasswordChange = (event) => {
        setPassword(event.target.value);
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        const loginResult = await loginUser(username, password);
        if (loginResult) {
            setUsername('');
            setPassword('');
            if(loginResult.isAdmin)
                navigate('/admin');
            else{
                if(loginResult.tipo == 0)
                    navigate('/mesero')
                if(loginResult.tipo == 1)
                    navigate(`/cocina_principal/${loginResult.id}`)
                if(loginResult.tipo == 2)
                    navigate('/mesas_principal')
            }
        } else {
            alert("Error en el inicio de sesión, Contraseña o usuario incorrectos");
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
            <form onSubmit={onSubmit} className="login-form p-4 shadow rounded">
                <h2 className="text-center mb-4">Sadraka</h2>
                <div className="form-group mb-3">
                    <label htmlFor="username" className="form-label">Usuario</label>
                    <input
                        type="text"
                        id="username"
                        className="form-control"
                        placeholder="Ingresa tu usuario"
                        value={username}
                        onChange={onUsernameChange}
                    />
                </div>
                <div className="form-group mb-3">
                    <label htmlFor="password" className="form-label">Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        className="form-control"
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChange={onPasswordChange}
                    />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                    Iniciar Sesión
                </button>
            </form>
        </div>
    );
}

export default Login;