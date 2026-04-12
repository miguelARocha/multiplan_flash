import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { listActiveOffers } from "../api/offers";
import type { UserRole } from "../api/types";
import { useAuth } from "../auth/useAuth";

const ACTIVE_OFFERS_POLLING_MS = 3000;

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("COMPRADOR");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOffersCount, setActiveOffersCount] = useState(0);

  useEffect(() => {
    let shouldIgnore = false;

    async function fetchCounter() {
      try {
        const offers = await listActiveOffers();

        if (!shouldIgnore) {
          setActiveOffersCount(offers.length);
        }
      } catch {
        if (!shouldIgnore) {
          setActiveOffersCount(0);
        }
      }
    }

    void fetchCounter();
    const pollingId = window.setInterval(
      fetchCounter,
      ACTIVE_OFFERS_POLLING_MS,
    );

    return () => {
      shouldIgnore = true;
      window.clearInterval(pollingId);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register({ name, email, password, role });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar sua conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-container">
        <section className="register-visual">
          <img
            alt=""
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEGoBYoBxL9WIXi3k5W4grSysF0vwB_ah6IZAHEwbzLn_nlyldyA9e6dl8TJNBDIBu4VpelWiTDWIJ4jtMOQUAzKLl69uhagWVFjm_8GWLg0EomxvxsS78EMjP72BQOcalw6Xev43RbS5Yf3avy1lfZCx5eFlHasxLozh9Qe1y-UncmbG7_rx_P0sy3xWKlrgRx430oNX34Zkiv1HusaoM-mIC9gIM0jT2RwegXrk5lYztZoFCaLsUf3sQobGIoLIJ4LMefp8YgPPr"
          />
          <div className="register-overlay" />
          <div className="register-copy">
            <div className="brand-mark">Flash</div>
            <h1>
              Ofertas em tempo <span>real.</span>
            </h1>
            <p>
              A plataforma definitiva para ofertas instantâneas que conectam
              lojistas audazes a compradores decididos.
            </p>
          </div>
          <div className="active-offers-card">
            <div className="metric-icon">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <p>Ofertas Ativas</p>
              <strong>{activeOffersCount.toLocaleString("pt-BR")}</strong>
            </div>
          </div>
        </section>

        <section className="register-form-panel">
          <div className="register-form-card">
            <header>
              <h2>Criar Conta</h2>
              <p>Junte-se à revolução do comércio em tempo real.</p>
            </header>

            <form
              onSubmit={handleSubmit}
              className="template-form register-form"
            >
              <div className="template-field">
                <span className="profile-label">Tipo de Perfil</span>
                <div className="profile-selector" aria-label="Tipo de perfil">
                  <button
                    className={role === "COMPRADOR" ? "selected" : ""}
                    onClick={() => setRole("COMPRADOR")}
                    type="button"
                  >
                    <span className="material-symbols-outlined">person</span>
                    Comprador
                  </button>
                  <button
                    className={role === "LOJISTA" ? "selected" : ""}
                    onClick={() => setRole("LOJISTA")}
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      storefront
                    </span>
                    Lojista
                  </button>
                </div>
              </div>

              <div className="register-grid">
                <div className="template-field">
                  <label htmlFor="full_name">Nome Completo</label>
                  <div className="input-shell icon-left">
                    <span className="material-symbols-outlined">badge</span>
                    <input
                      autoComplete="name"
                      id="full_name"
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex: João Silva"
                      required
                      value={name}
                    />
                  </div>
                </div>

                <div className="template-field">
                  <label htmlFor="email_address">E-mail</label>
                  <div className="input-shell icon-left">
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      autoComplete="email"
                      id="email_address"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="seu@email.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>
              </div>

              <div className="template-field">
                <label htmlFor="new_password">Senha</label>
                <div className="input-shell icon-left icon-right">
                  <span className="material-symbols-outlined">lock</span>
                  <input
                    autoComplete="new-password"
                    id="new_password"
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    required
                    type="password"
                    value={password}
                  />
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <p className="field-help">
                  Mínimo de 8 caracteres, incluindo números e símbolos.
                </p>
              </div>

              <label className="terms-row">
                <input required type="checkbox" />
                <span>
                  Ao me registrar, concordo com os{" "}
                  <strong>Termos de Serviço</strong> e a{" "}
                  <strong>Política de Privacidade</strong> da Flash.
                </span>
              </label>

              {error ? <div className="form-error">{error}</div> : null}

              <button
                disabled={isSubmitting}
                type="submit"
                className="template-primary register-cta"
              >
                {isSubmitting ? "Criando..." : "Começar Agora"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>

              <p className="switch-auth register-switch">
                Já possui uma conta? <Link to="/login">Entrar no Hub</Link>
              </p>
            </form>
          </div>
        </section>
      </div>

      {/* <aside className="register-toast">
        <div className="toast-flash-icon">
          <span className="material-symbols-outlined">flash_on</span>
        </div>
        <div>
          <p>Oferta Flash Detectada!</p>
          <span>Novos cupons de 70% em eletrônicos perto de você.</span>
        </div>
      </aside> */}
    </main>
  );
}
