import React from 'react'
import './LoginSignup.css'
import logo_icon from '../LoginSignup/assets/logo.webp'
import user_icon from '../LoginSignup/assets/user.png'
import password_logo from '../LoginSignup/assets/password.png'

export const LoginSignup = () => {
  return (
    <div className='container'>
        <div className='header'>
            <img className='logo' src={logo_icon} alt="" />
            <div className='text'>Inicio de Sesión</div>
        </div>
        <div className='inputs'>
            <div className='input'>
                <img src={user_icon} alt="" />
                <input type="email" placeholder='Email'/>
            </div>
            <div className='input'>
                <img src={password_logo} alt="" />
                <input type="password" placeholder='Contraseña' />
            </div>
        </div>
        <div className="forgot-password">¿Olvidaste tu contraseña? <span>Haz click acá</span></div>
        <div className="submit-container">
            <div className="submit">Iniciar Sesión</div>
            <div className="submit">Crear Cuenta</div>
        </div>
    </div>
  )
}
