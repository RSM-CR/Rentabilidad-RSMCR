import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAccount.css";
import logo_icon from "../CreateAccount/assets/logo.webp";
import user_icon from "../CreateAccount/assets/user.png";
import password_logo from "../CreateAccount/assets/password.png";

export const CreateAccount = () => {
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
    window.location.href = "./createacc";
  };

  return (
    <div className="container">
      <div className="title">
        <img className="logo" src={logo_icon} alt="logo" />
        <div className="text">Crear Cuenta</div>
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
          <button className="submit" onClick={handleSubmit}>
            Crear
          </button>
          <button className="login-acc">Ya tengo una cuenta existente</button>
        </div>
      </div>
    </div>
  );
};
