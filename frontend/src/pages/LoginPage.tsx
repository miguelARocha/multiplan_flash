import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";

export function LoginPage() {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const year = new Date().getFullYear();

  if (isAuthenticated && user) {
    return <Navigate to={location.state?.from?.pathname ?? "/app"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate("/app", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível entrar agora.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-brand">
          <div className="brand-content">
            <span className="brand-mark">Flash</span>
          </div>

          <div className="brand-copy">
            <h1>Ofertas Flash!</h1>
            <p>
              Ofertas em tempo real para quem decide rápido e compra melhor.
            </p>
          </div>

          <div className="kinetic-rings" aria-hidden="true">
            <span />
            <span />
          </div>
          <img
            alt=""
            className="brand-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwqfnyJdfr2V-hDkA0gepOdHhBJ90i9oIKX5Iw1zexla0cAM0mj875oG4qqxVvKXr9qmW1C-0FhBWLTz39kuebEH1pMuYYKx_WuxJ9uYKd7KGL6T47O3ED9p2QwGouH25EuMejEJTvlLnDjhHsb8QBZ_BbyyAMbBUKCX3rKwlEVGupH2cG8ft_-90tkwf-5XmAoBZQeAkoAq9fn7Xc-V9Gk1xZPNMY0rpPvtUELGBkSrrbPhr1Y1ep6RZ5uGwiZYr2h3N3KGnhaEzu"
          />
        </section>

        <section className="login-form-panel">
          <div className="mobile-login-brand">
            <span className="brand-mark">Flash</span>
          </div>

          <div className="login-form-card">
            <header>
              <h2>Bem-vindo</h2>
              <p>Digite suas credenciais para acessar as ofertas.</p>
            </header>

            <form onSubmit={handleSubmit} className="template-form login-form">
              <div className="template-field">
                <label htmlFor="email">E-mail</label>
                <div className="input-shell icon-right">
                  <input
                    autoComplete="email"
                    id="email"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    required
                    type="email"
                    value={email}
                  />
                  <span className="material-symbols-outlined">mail</span>
                </div>
              </div>

              <div className="template-field">
                <div className="field-heading">
                  <label htmlFor="password">Senha</label>
                  <a href="#forgot">Esqueceu a senha?</a>
                </div>
                <div className="input-shell icon-right">
                  <input
                    autoComplete="current-password"
                    id="password"
                    minLength={8}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    required
                    type="password"
                    value={password}
                  />
                  <span className="material-symbols-outlined">lock</span>
                </div>
              </div>

              <label className="remember-row">
                <input type="checkbox" />
                <span>Manter-me conectado</span>
              </label>

              {error ? <div className="form-error">{error}</div> : null}

              <button
                disabled={isSubmitting}
                type="submit"
                className="template-primary pill"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="template-divider">
              <span>ou continue com</span>
            </div>

            <p className="switch-auth template-switch">
              Novo na Flash? <Link to="/registro">Criar uma conta</Link>
            </p>
          </div>

          <footer className="login-footer">
            © {year} Flash. Ofertas em tempo real.
          </footer>
        </section>
      </div>

      {/* <aside className="login-toast">
        <div className="toast-icon">
          <span className="material-symbols-outlined">bolt</span>
        </div>
        <div>
          <p>Oferta ativa ao vivo</p>
          <span>O lojista "Aero" acabou de publicar uma oferta relâmpago.</span>
        </div>
      </aside> */}
    </main>
  );
}
