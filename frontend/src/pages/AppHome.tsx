import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';
import { connectOffersSocket } from '../api/socket';
import { useAuth } from '../auth/useAuth';

export function AppHome() {
  const { logout, token, user } = useAuth();
  const [socketStatus, setSocketStatus] = useState('conectando...');

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket: Socket = connectOffersSocket(token);

    socket.on('connect', () => setSocketStatus('conectado'));
    socket.on('connect_error', () => setSocketStatus('falha na conexao'));
    socket.on('disconnect', () => setSocketStatus('desconectado'));

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return (
    <main className="home-shell">
      <nav className="topbar">
        <div>
          <span className="brand-mark">Flash</span>
          <p>Frontend conectado ao backend</p>
        </div>
        <button onClick={logout} type="button">
          Sair
        </button>
      </nav>

      <section className="welcome-band">
        <p className="eyebrow">{user?.role === 'LOJISTA' ? 'Painel do lojista' : 'Feed do comprador'}</p>
        <h1>Ola, {user?.name}</h1>
        <p>
          Sessao autenticada com JWT. A proxima etapa encaixa aqui o dashboard, o feed e as
          notificacoes visuais do layout proposto.
        </p>
      </section>

      <section className="connection-grid">
        <article>
          <span className="material-symbols-outlined">dns</span>
          <h2>API HTTP</h2>
          <p>{API_BASE_URL}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">sensors</span>
          <h2>WebSocket ofertas</h2>
          <p>Status: {socketStatus}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">verified_user</span>
          <h2>Usuario atual</h2>
          <p>{user?.email}</p>
        </article>
      </section>
    </main>
  );
}
