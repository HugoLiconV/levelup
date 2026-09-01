import React from 'react';

export default function Page() {
  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>levelup</span>
        </div>
        <p className="login-subtitle">Inicia sesión para continuar tu checkpoint.</p>
        <form className="modal-form">
          <div className="field"><label htmlFor="login-email">Correo</label><input id="login-email" type="email" /></div>
          <div className="field"><label htmlFor="login-password">Contraseña</label><input id="login-password" type="password" /></div>
          <button type="button" className="primary-button">Entrar</button>
        </form>
      </div>
    </main>
  );
}
