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
            console.log("Inicio de sesión exitoso:", loginResult);
            if(loginResult.isAdmin)
                navigate('/admin');
            else
                navigate('/mesero')
        } else {
            console.log("Error en el inicio de sesión");
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