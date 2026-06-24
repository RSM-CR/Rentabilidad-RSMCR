import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import "./LoginSignup.css";
import logo_icon from "../LoginSignup/assets/logo.webp";
import user_icon from "../LoginSignup/assets/user.png";
import password_logo from "../LoginSignup/assets/password.png";

export const LoginSignup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    console.log("Email:", email);
    console.log("Password:", password);

    if (!email || !password) {
      alert("Completa todos los campos");
      return;
    }

    // Simulación de login exitoso
    localStorage.setItem("token", "mi_token");

    // Redireccionar
    window.location.href = "./login";
  };
  
  const navigate = useNavigate();
  
  return (
    <div className="container">
      <div className="title">
        <img className="logo" src={logo_icon} alt="logo" />
        <div className="text">Inicio de Sesión</div>
      </div>

      <div className="inputs">
        <div className="input">
          <img src={user_icon} alt="user icon" />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input">
          <img src={password_logo} alt="password icon" />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="buttons">
          <div className="stay-logged-in">
            <label>
              <input type="checkbox" /> Mantener sesión iniciada
            </label>
          </div>

          <button className="submit" onClick={handleSubmit}>
            Ingresar
          </button>

          <button className="new-acc" onClick={() => navigate("/createacc")}>
            Crear una cuenta nueva
          </button>
        </div>
      </div>
    </div>
  );
};
