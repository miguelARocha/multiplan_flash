import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createInterest,
  deleteInterest,
  listActiveOffers,
  listMyInterests,
  type Interest,
  type Offer,
} from "../api/offers";
import { connectOffersSocket } from "../api/socket";
import { useAuth } from "../auth/useAuth";

type BuyerNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

type AlertSettings = {
  flashOffers: boolean;
  priceChanges: boolean;
  onlyAvailable: boolean;
};

const alertSettingsStorageKey = "flash:buyer-alert-settings";

const productImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=320&q=80",
];

function getOfferImage(index: number) {
  return productImages[index % productImages.length];
}

function formatTimeLeft(value: string) {
  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) {
    return "expirada";
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function getDiscountedPriceInCents(offer: Offer) {
  return Math.round(
    offer.priceInCents * (1 - offer.discountPercentage / 100),
  );
}

function getDiscountValueInCents(offer: Offer) {
  return offer.priceInCents - getDiscountedPriceInCents(offer);
}

function getStockPercent(offer: Offer) {
  return Math.max(8, Math.min(100, offer.stock * 8));
}

function isOfferActive(offer: Offer) {
  return (
    offer.status === "ATIVA" && new Date(offer.expiresAt).getTime() > Date.now()
  );
}

function loadAlertSettings(): AlertSettings {
  const fallback = {
    flashOffers: true,
    priceChanges: true,
    onlyAvailable: true,
  };

  try {
    const payload = localStorage.getItem(alertSettingsStorageKey);

    if (!payload) {
      return fallback;
    }

    return { ...fallback, ...JSON.parse(payload) };
  } catch {
    return fallback;
  }
}

export function BuyerDashboard() {
  const { logout, token, user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [notifications, setNotifications] = useState<BuyerNotification[]>([]);
  const [socketStatus, setSocketStatus] = useState("conectando...");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInterests, setIsLoadingInterests] = useState(true);
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [alertSettings, setAlertSettings] = useState(loadAlertSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listActiveOffers()
      .then((activeOffers) => setOffers(activeOffers.filter(isOfferActive)))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      alertSettingsStorageKey,
      JSON.stringify(alertSettings),
    );
  }, [alertSettings]);

  useEffect(() => {
    if (!token) {
      return;
    }

    listMyInterests(token)
      .then(setInterests)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoadingInterests(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket: Socket = connectOffersSocket(token);

    socket.on("connect", () => setSocketStatus("conectado"));
    socket.on("connect_error", () => setSocketStatus("falha na conexao"));
    socket.on("disconnect", () => setSocketStatus("desconectado"));
    socket.on("offer.created", (offer: Offer) => {
      if (!isOfferActive(offer)) {
        return;
      }

      setOffers((current) => [
        offer,
        ...current.filter((currentOffer) => currentOffer.id !== offer.id),
      ]);

      if (alertSettings.flashOffers) {
        setNotifications((current) =>
          [
            {
              id: offer.id,
              title: "Nova oferta relampago",
              description: `${offer.title} entrou no ar com ${offer.discountPercentage}% OFF.`,
              createdAt: new Date().toISOString(),
            },
            ...current,
          ].slice(0, 5),
        );
      }
    });
    socket.on("offer.updated", (offer: Offer) => {
      setOffers((current) => {
        const remainingOffers = current.filter(
          (currentOffer) => currentOffer.id !== offer.id,
        );

        return isOfferActive(offer) ? [offer, ...remainingOffers] : remainingOffers;
      });

      if (alertSettings.priceChanges) {
        setNotifications((current) =>
          [
            {
              id: `${offer.id}-updated-${Date.now()}`,
              title: "Oferta atualizada",
              description: `${offer.title} agora está com ${offer.discountPercentage}% OFF por ${formatCurrencyFromCents(getDiscountedPriceInCents(offer))}.`,
              createdAt: new Date().toISOString(),
            },
            ...current,
          ].slice(0, 5),
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [alertSettings.flashOffers, alertSettings.priceChanges, token]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const visibleOffers = offers
      .filter(isOfferActive)
      .filter((offer) => !alertSettings.onlyAvailable || offer.stock > 0);

    if (!query) {
      return visibleOffers;
    }

    return visibleOffers.filter(
      (offer) =>
        offer.title.toLowerCase().includes(query) ||
        offer.description.toLowerCase().includes(query) ||
        offer.shopkeeper?.name.toLowerCase().includes(query),
    );
  }, [alertSettings.onlyAvailable, offers, search]);

  const activeInterests = useMemo(
    () =>
      interests.filter((interest) =>
        offers.some((offer) => offer.id === interest.offerId) ||
        isOfferActive(interest.offer),
      ),
    [interests, offers],
  );

  const estimatedSavingsInCents = useMemo(
    () =>
      activeInterests.reduce((total, interest) => {
        const offer =
          offers.find((currentOffer) => currentOffer.id === interest.offerId) ??
          interest.offer;

        return offer ? total + getDiscountValueInCents(offer) : total;
      }, 0),
    [activeInterests, offers],
  );

  const notificationCount = notifications.length;
  const activeOffersCount = offers.filter(isOfferActive).length;

  function updateAlertSetting(key: keyof AlertSettings, value: boolean) {
    setAlertSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateInterest(offer: Offer) {
    if (!token) {
      return;
    }

    setPendingOfferId(offer.id);
    setError(null);

    try {
      const interest = await createInterest(offer.id, token);
      setInterests((current) => [
        interest,
        ...current.filter(
          (currentInterest) => currentInterest.offerId !== offer.id,
        ),
      ]);
      setOffers((current) =>
        current.map((currentOffer) =>
          currentOffer.id === offer.id
            ? { ...currentOffer, stock: interest.offer.stock }
            : currentOffer,
        ),
      );
      setNotifications((current) =>
        [
          {
            id: interest.id,
            title: "Interesse registrado",
            description: `${offer.title} ficou salvo nos seus interesses ativos.`,
            createdAt: interest.createdAt,
          },
          ...current,
        ].slice(0, 5),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel registrar interesse.",
      );
    } finally {
      setPendingOfferId(null);
    }
  }

  async function handleDeleteInterest(offer: Offer) {
    if (!token) {
      return;
    }

    setPendingOfferId(offer.id);
    setError(null);

    try {
      await deleteInterest(offer.id, token);
      setInterests((current) =>
        current.filter((interest) => interest.offerId !== offer.id),
      );
      setOffers((current) =>
        current.map((currentOffer) =>
          currentOffer.id === offer.id
            ? { ...currentOffer, stock: currentOffer.stock + 1 }
            : currentOffer,
        ),
      );
      setNotifications((current) =>
        [
          {
            id: `${offer.id}-removed`,
            title: "Interesse removido",
            description: `Você desistiu da oferta ${offer.title}.`,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 5),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel desistir do interesse.",
      );
    } finally {
      setPendingOfferId(null);
    }
  }

  return (
    <main className="buyer-dashboard">
      <header className="buyer-topbar">
        <div className="buyer-brand">
          <span className="material-symbols-outlined">bolt</span>
          <strong>FLASH</strong>
        </div>

        <nav aria-label="Navegacao do comprador">
          <a href="#ofertas">Ofertas</a>
          <a href="#interesses">Interesses</a>
          <a href="#notificacoes">Notificacoes</a>
        </nav>

        <label className="buyer-search">
          <span className="material-symbols-outlined">search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ofertas..."
            type="search"
          />
        </label>

        <button className="buyer-icon-button" type="button" aria-label="Notificacoes">
          <span className="material-symbols-outlined">notifications</span>
          {notificationCount > 0 && <i>{notificationCount}</i>}
        </button>
        <button className="buyer-logout" onClick={logout} type="button">
          Sair
        </button>
      </header>

      <div className="buyer-layout">
        <aside className="buyer-sidebar">
          <div className="buyer-profile">
            <div className="buyer-avatar">{user?.name?.[0] ?? "C"}</div>
            <p>Bem-vindo de volta</p>
            <strong>{user?.name ?? "Comprador"}</strong>
          </div>

          <a className="active" href="#overview">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </a>
          <a href="#ofertas">
            <span className="material-symbols-outlined">local_fire_department</span>
            Ofertas Flash
          </a>
          <a href="#interesses">
            <span className="material-symbols-outlined">favorite</span>
            Meus Interesses
          </a>
          <a href="#notificacoes">
            <span className="material-symbols-outlined">settings</span>
            Alertas
          </a>
        </aside>

        <section className="buyer-content">
          <section className="buyer-welcome" id="overview">
            <div>
              <p className="eyebrow">Feed do comprador</p>
              <h1>Olá, {user?.name ?? "comprador"}</h1>
              <p>
                Você tem <strong>{activeOffersCount} ofertas</strong> ativas agora.
              </p>
            </div>

            <div className="buyer-live-status">
              <span />
              <p>Notificacoes em tempo real</p>
              <strong>{socketStatus}</strong>
            </div>
          </section>

          {error && <p className="dashboard-error">{error}</p>}

          <section className="buyer-metrics">
            <article>
              <span className="material-symbols-outlined">local_mall</span>
              <p>Ofertas ativas</p>
              <strong>{activeOffersCount}</strong>
            </article>
            <article className="buyer-metric-blue">
              <span className="material-symbols-outlined">savings</span>
              <p>Economia estimada</p>
              <strong>{formatCurrencyFromCents(estimatedSavingsInCents)}</strong>
            </article>
            <article className="buyer-level-card">
              <span className="material-symbols-outlined">workspace_premium</span>
              <p>Nivel de comprador</p>
              <strong>Power Buyer</strong>
            </article>
          </section>

          <section className="buyer-main-grid">
            <div className="buyer-offers-column" id="ofertas">
              <div className="buyer-section-heading">
                <h2>Ofertas relampago</h2>
                <span>LIVE</span>
              </div>

              {isLoading ? (
                <p className="empty-state">Carregando ofertas...</p>
              ) : filteredOffers.length === 0 ? (
                <p className="empty-state">Nenhuma oferta ativa encontrada.</p>
              ) : (
                <div className="buyer-offer-grid">
                  {filteredOffers.map((offer, index) => {
                    const hasInterest = interests.some(
                      (interest) => interest.offerId === offer.id,
                    );

                    return (
                      <article className="buyer-offer-card" key={offer.id}>
                        <img src={getOfferImage(index)} alt="" />
                        <div>
                          <span>{offer.discountPercentage}% OFF</span>
                          <h3>{offer.title}</h3>
                          <p>{offer.shopkeeper?.name ?? "Loja parceira"}</p>
                        </div>
                        <div className="buyer-price-row">
                          <strong>
                            {formatCurrencyFromCents(
                              getDiscountedPriceInCents(offer),
                            )}
                          </strong>
                          <small>{formatCurrencyFromCents(offer.priceInCents)}</small>
                        </div>
                        <p className="buyer-offer-description">
                          {offer.description}
                        </p>
                        <div className="buyer-stock-row">
                          <span>{offer.stock} unidades restantes</span>
                          <strong>{formatTimeLeft(offer.expiresAt)}</strong>
                        </div>
                        <div className="buyer-stock-bar">
                          <i style={{ width: `${getStockPercent(offer)}%` }} />
                        </div>
                        <button
                          disabled={
                            pendingOfferId === offer.id ||
                            (!hasInterest && offer.stock <= 0)
                          }
                          onClick={() =>
                            hasInterest
                              ? handleDeleteInterest(offer)
                              : handleCreateInterest(offer)
                          }
                          type="button"
                        >
                          {hasInterest
                            ? pendingOfferId === offer.id
                              ? "Removendo..."
                              : "Desistir do interesse"
                            : pendingOfferId === offer.id
                              ? "Registrando..."
                              : "Tenho interesse"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              <section className="buyer-history" id="interesses">
                <h2>Histórico de interesses</h2>
                {isLoadingInterests ? (
                  <p>Carregando interesses...</p>
                ) : interests.length === 0 ? (
                  <p>Nenhum interesse registrado.</p>
                ) : (
                  interests.map((interest) => (
                    <article key={interest.id}>
                      <span className="material-symbols-outlined">favorite</span>
                      <div>
                        <strong>{interest.offer.title}</strong>
                        <small>
                          Registrado em{" "}
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(interest.createdAt))}
                        </small>
                      </div>
                      <button
                        className="buyer-history-action"
                        disabled={pendingOfferId === interest.offerId}
                        onClick={() => handleDeleteInterest(interest.offer)}
                        type="button"
                      >
                        {pendingOfferId === interest.offerId
                          ? "Removendo..."
                          : "Desistir"}
                      </button>
                    </article>
                  ))
                )}
              </section>
            </div>

            <aside className="buyer-alerts" id="notificacoes">
              <section>
                <h2>Configurações de alerta</h2>
                <label>
                  <span>Ofertas relampago</span>
                  <input
                    checked={alertSettings.flashOffers}
                    onChange={(event) =>
                      updateAlertSetting("flashOffers", event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
                <label>
                  <span>Mudança de preço</span>
                  <input
                    checked={alertSettings.priceChanges}
                    onChange={(event) =>
                      updateAlertSetting("priceChanges", event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
                <label>
                  <span>Somente com estoque</span>
                  <input
                    checked={alertSettings.onlyAvailable}
                    onChange={(event) =>
                      updateAlertSetting("onlyAvailable", event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
              </section>

              <section className="buyer-notifications">
                <h2>Atividades recentes</h2>
                {notifications.length === 0 ? (
                  <p>Novas ofertas e interesses aparecem aqui em tempo real.</p>
                ) : (
                  notifications.map((notification) => (
                    <article key={`${notification.id}-${notification.createdAt}`}>
                      <span className="material-symbols-outlined">
                        notifications_active
                      </span>
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.description}</p>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </aside>
          </section>
        </section>
      </div>

      <nav className="buyer-bottom-nav" aria-label="Navegacao mobile">
        <a className="active" href="#overview">
          <span className="material-symbols-outlined">home</span>
          Inicio
        </a>
        <a href="#ofertas">
          <span className="material-symbols-outlined">confirmation_number</span>
          Ofertas
        </a>
        <a href="#interesses">
          <span className="material-symbols-outlined">favorite</span>
          Interesses
        </a>
        <button onClick={logout} type="button">
          <span className="material-symbols-outlined">person</span>
          Sair
        </button>
      </nav>
    </main>
  );
}
