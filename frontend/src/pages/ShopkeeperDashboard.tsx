import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Socket } from "socket.io-client";
import { getCurrentUser } from "../api/auth";
import type { AuthUser } from "../api/types";
import {
  closeOffer,
  createOffer,
  deleteOffer,
  listMyOffers,
  updateOffer,
  type CreateOfferPayload,
  type OfferStatus,
  type ShopkeeperOffer,
} from "../api/offers";
import { connectOffersSocket } from "../api/socket";
import { useAuth } from "../auth/useAuth";

type InterestNotification = {
  id: string;
  buyer?: { name?: string };
  offer: {
    id: string;
    title: string;
    stock: number;
  };
  createdAt: string;
};

type OfferFormState = {
  title: string;
  description: string;
  price: string;
  discountPercentage: string;
  stock: string;
  expiresAt: string;
  status: OfferStatus;
};

const productImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=220&q=80",
  "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=220&q=80",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=220&q=80",
  "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=220&q=80",
];

const emptyForm: OfferFormState = {
  title: "",
  description: "",
  price: "",
  discountPercentage: "",
  stock: "",
  expiresAt: "",
  status: "ATIVA",
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function parseCurrencyToCents(value: string) {
  const normalizedValue = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;

  return Math.round(Number(normalizedValue) * 100);
}

function getOfferImage(index: number) {
  return productImages[index % productImages.length];
}

function getStockPercent(offer: ShopkeeperOffer) {
  const total = offer.stock + offer.interestedCount;

  if (total === 0) {
    return 0;
  }

  return Math.max(6, Math.round((offer.stock / total) * 100));
}

export function ShopkeeperDashboard() {
  const { logout, token, user } = useAuth();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(user);
  const [offers, setOffers] = useState<ShopkeeperOffer[]>([]);
  const [notifications, setNotifications] = useState<InterestNotification[]>(
    [],
  );
  const [socketStatus, setSocketStatus] = useState("conectando...");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerPendingDelete, setOfferPendingDelete] =
    useState<ShopkeeperOffer | null>(null);
  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    if (!token) {
      return;
    }

    getCurrentUser(token)
      .then(setCurrentUser)
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    listMyOffers(token)
      .then(setOffers)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket: Socket = connectOffersSocket(token);

    socket.on("connect", () => setSocketStatus("conectado"));
    socket.on("connect_error", () => setSocketStatus("falha na conexao"));
    socket.on("disconnect", () => setSocketStatus("desconectado"));
    socket.on("interest.created", (interest: InterestNotification) => {
      setNotifications((current) => [interest, ...current].slice(0, 5));
      setOffers((current) =>
        current.map((offer) =>
          offer.id === interest.offer.id
            ? {
                ...offer,
                stock: interest.offer.stock,
                interestedCount: offer.interestedCount + 1,
              }
            : offer,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const activeOffers = useMemo(
    () => offers.filter((offer) => offer.status === "ATIVA"),
    [offers],
  );

  const totalInterested = useMemo(
    () => offers.reduce((total, offer) => total + offer.interestedCount, 0),
    [offers],
  );

  const conversion = useMemo(() => {
    const totalStock = offers.reduce(
      (total, offer) => total + offer.stock + offer.interestedCount,
      0,
    );

    if (totalStock === 0) {
      return 0;
    }

    return Math.round((totalInterested / totalStock) * 1000) / 10;
  }, [offers, totalInterested]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return offers;
    }

    return offers.filter(
      (offer) =>
        offer.title.toLowerCase().includes(query) ||
        offer.description.toLowerCase().includes(query) ||
        offer.id.toLowerCase().includes(query),
    );
  }, [offers, search]);

  function openCreateForm() {
    setEditingOfferId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEditForm(offer: ShopkeeperOffer) {
    setEditingOfferId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description,
      price: String(offer.priceInCents / 100).replace(".", ","),
      discountPercentage: String(offer.discountPercentage),
      stock: String(offer.stock),
      expiresAt: toDateTimeLocal(offer.expiresAt),
      status: offer.status,
    });
    setIsFormOpen(true);
  }

  async function handleSaveOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setError(null);
    setIsCreating(true);

    const payload: CreateOfferPayload = {
      title: form.title,
      description: form.description,
      priceInCents: parseCurrencyToCents(form.price),
      discountPercentage: Number(form.discountPercentage),
      stock: Number(form.stock),
      expiresAt: new Date(form.expiresAt).toISOString(),
    };

    try {
      if (editingOfferId) {
        const offer = await updateOffer(editingOfferId, { ...payload, status: form.status }, token);
        setOffers((current) =>
          current.map((currentOffer) =>
            currentOffer.id === editingOfferId
              ? { ...currentOffer, ...offer }
              : currentOffer,
          ),
        );
      } else {
        const offer = await createOffer(payload, token);
        setOffers((current) => [{ ...offer, interestedCount: 0 }, ...current]);
      }

      setForm(emptyForm);
      setEditingOfferId(null);
      setIsFormOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel salvar a oferta.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleReactivateOffer(offer: ShopkeeperOffer) {
    if (!token) {
      return;
    }

    setError(null);

    const currentExpiration = new Date(offer.expiresAt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const updatedOffer = await updateOffer(
        offer.id,
        {
          status: "ATIVA",
          expiresAt:
            currentExpiration > new Date()
              ? offer.expiresAt
              : tomorrow.toISOString(),
        },
        token,
      );
      setOffers((current) =>
        current.map((currentOffer) =>
          currentOffer.id === offer.id
            ? { ...currentOffer, ...updatedOffer }
            : currentOffer,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel reativar a oferta.",
      );
    }
  }

  async function handleDeleteOffer() {
    if (!token || !offerPendingDelete) {
      return;
    }

    setError(null);

    try {
      await deleteOffer(offerPendingDelete.id, token);
      setOffers((current) =>
        current.filter((offer) => offer.id !== offerPendingDelete.id),
      );
      if (editingOfferId === offerPendingDelete.id) {
        setIsFormOpen(false);
        setEditingOfferId(null);
        setForm(emptyForm);
      }
      setOfferPendingDelete(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel excluir a oferta.",
      );
    }
  }

  async function handleCloseOffer(offerId: string) {
    if (!token) {
      return;
    }

    setError(null);

    try {
      const closedOffer = await closeOffer(offerId, token);
      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId ? { ...offer, ...closedOffer } : offer,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel encerrar a oferta.",
      );
    }
  }

  return (
    <main className="merchant-dashboard">
      <aside className="merchant-sidebar">
        <div className="merchant-brand">
          <span className="material-symbols-outlined">bolt</span>
          <div>
            <strong>FLASH</strong>
            <small>Portal do lojista</small>
          </div>
        </div>

        <nav className="merchant-nav" aria-label="Navegacao do lojista">
          <a className="active" href="#overview">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </a>
          <a href="#ofertas">
            <span className="material-symbols-outlined">bolt</span>
            Ofertas
          </a>
          <a href="#notificacoes">
            <span className="material-symbols-outlined">favorite</span>
            Interesses
          </a>
        </nav>

        <div className="merchant-status-card">
          <p>WebSocket</p>
          <strong>{socketStatus}</strong>
          <span>Notificacoes em tempo real para novos interessados.</span>
        </div>
      </aside>

      <section className="merchant-content">
        <header className="merchant-topbar">
          <div>
            <p className="eyebrow">Dashboard do lojista</p>
            <h1>Olá, {currentUser?.name ?? user?.name ?? "lojista"}</h1>
          </div>

          <div className="merchant-actions">
            <button
              className="notification-button"
              type="button"
              aria-label="Notificacoes"
            >
              <span className="material-symbols-outlined">notifications</span>
              {notifications.length > 0 && <i>{notifications.length}</i>}
            </button>
            <button className="logout-button" onClick={logout} type="button">
              Sair
            </button>
          </div>
        </header>

        {error && <p className="dashboard-error">{error}</p>}

        <section className="merchant-metrics" id="overview">
          <article className="metric-card metric-card-large">
            <span className="material-symbols-outlined">bolt</span>
            <p>Ofertas Ativas</p>
            <strong>{activeOffers.length}</strong>
          </article>
          <article className="metric-card">
            <span className="material-symbols-outlined">trending_up</span>
            <p>Interessados</p>
            <strong>{totalInterested}</strong>
          </article>
          <article className="metric-card metric-card-blue">
            <span className="material-symbols-outlined">payments</span>
            <p>Conversao Media</p>
            <strong>{conversion}%</strong>
          </article>
        </section>

        {notifications[0] && (
          <section className="merchant-alert" id="notificacoes">
            <span className="material-symbols-outlined">
              notifications_active
            </span>
            <p>
              Novo interessado em{" "}
              <strong>{notifications[0].offer.title}</strong>
              {notifications[0].buyer?.name
                ? `: ${notifications[0].buyer.name}`
                : ""}
              .
            </p>
          </section>
        )}

        <section className="merchant-toolbar" id="ofertas">
          <label className="merchant-search">
            <span className="material-symbols-outlined">search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ofertas pelo nome ou ID..."
              type="search"
            />
          </label>
          <button
            className="primary-dashboard-button"
            onClick={() => {
              if (isFormOpen && !editingOfferId) {
                setIsFormOpen(false);
                return;
              }

              openCreateForm();
            }}
            type="button"
          >
            <span className="material-symbols-outlined">add</span>
            Nova Oferta
          </button>
        </section>

        {isFormOpen && (
          <form className="offer-form" onSubmit={handleSaveOffer}>
            <div className="offer-form-header">
              <strong>{editingOfferId ? "Editar oferta" : "Nova oferta"}</strong>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingOfferId(null);
                  setForm(emptyForm);
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
            <label>
              <span>Nome da oferta:</span>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Ex: Sneaker Speed Runner v3"
              />
            </label>
            <label>
              <span>Descricao:</span>
              <input
                required
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Descricao curta da promocao"
              />
            </label>
            <label>
              <span>Valor:</span>
              <input
                required
                inputMode="decimal"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="Ex: 129,90"
              />
            </label>
            <label>
              <span>Desconto:</span>
              <input
                required
                min="1"
                max="100"
                value={form.discountPercentage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discountPercentage: event.target.value,
                  }))
                }
                placeholder="%"
                type="number"
              />
            </label>
            <label>
              <span>Estoque:</span>
              <input
                required
                min="0"
                value={form.stock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stock: event.target.value,
                  }))
                }
                placeholder="Quantidade"
                type="number"
              />
            </label>
            <label>
              <span>Expira em:</span>
              <input
                required
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
                type="datetime-local"
              />
            </label>
            {editingOfferId && (
              <label>
                <span>Status:</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as OfferStatus,
                    }))
                  }
                >
                  <option value="ATIVA">Ativa</option>
                  <option value="ENCERRADA">Encerrada</option>
                </select>
              </label>
            )}
            <button disabled={isCreating} type="submit">
              {isCreating
                ? "Salvando..."
                : editingOfferId
                  ? "Salvar"
                  : "Publicar"}
            </button>
          </form>
        )}

        <section className="offers-panel">
          {isLoading ? (
            <p className="empty-state">Carregando ofertas...</p>
          ) : filteredOffers.length === 0 ? (
            <p className="empty-state">Nenhuma oferta encontrada.</p>
          ) : (
            <>
              <div className="offers-table">
                <table>
                  <thead>
                    <tr>
                      <th>Oferta</th>
                      <th>Valor</th>
                      <th>Desconto</th>
                      <th>Estoque</th>
                      <th>Validade</th>
                      <th>Interessados</th>
                      <th>Status</th>
                      <th aria-label="Acoes" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffers.map((offer, index) => (
                      <tr key={offer.id}>
                        <td>
                          <div className="offer-title-cell">
                            <img src={getOfferImage(index)} alt="" />
                            <div>
                              <strong>{offer.title}</strong>
                              <small>ID: {offer.id.slice(0, 8)}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {formatCurrencyFromCents(offer.priceInCents)}
                        </td>
                        <td>
                          <span className="discount-pill">
                            {offer.discountPercentage}%
                          </span>
                        </td>
                        <td>
                          <div className="stock-meter">
                            <span>{offer.stock} restantes</span>
                            <div>
                              <i
                                style={{ width: `${getStockPercent(offer)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>{formatDate(offer.expiresAt)}</td>
                        <td className="interested-count">
                          {offer.interestedCount}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${offer.status.toLowerCase()}`}
                          >
                            {offer.status === "ATIVA" ? "Ativa" : "Encerrada"}
                          </span>
                        </td>
                        <td>
                          <div className="offer-row-actions">
                            <button
                              className="text-action"
                              aria-label={`Editar ${offer.title}`}
                              onClick={() => openEditForm(offer)}
                              type="button"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            {offer.status === "ATIVA" ? (
                              <button
                                className="text-action"
                                aria-label={`Encerrar ${offer.title}`}
                                onClick={() => handleCloseOffer(offer.id)}
                                type="button"
                              >
                                <span className="material-symbols-outlined">
                                  block
                                </span>
                              </button>
                            ) : (
                              <button
                                className="text-action"
                                aria-label={`Reativar ${offer.title}`}
                                onClick={() => handleReactivateOffer(offer)}
                                type="button"
                              >
                                <span className="material-symbols-outlined">
                                  replay
                                </span>
                              </button>
                            )}
                            <button
                              className="text-action danger"
                              aria-label={`Excluir ${offer.title}`}
                              onClick={() => setOfferPendingDelete(offer)}
                              type="button"
                            >
                              <span className="material-symbols-outlined">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-offer-list">
                {filteredOffers.map((offer, index) => (
                  <article className="mobile-offer-card" key={offer.id}>
                    <img src={getOfferImage(index)} alt="" />
                    <div>
                      <span>ID: {offer.id.slice(0, 8)}</span>
                      <h2>{offer.title}</h2>
                      <p>
                        {offer.stock} restantes · {offer.interestedCount}{" "}
                        interessados
                      </p>
                      <div className="mobile-card-footer">
                        <span className="mobile-card-price">
                          {formatCurrencyFromCents(offer.priceInCents)}
                        </span>
                        <strong>{offer.discountPercentage}% OFF</strong>
                        <small>
                          {offer.status === "ATIVA" ? "Ativa" : "Encerrada"}
                        </small>
                      </div>
                      <div className="mobile-card-actions">
                        <button
                          aria-label={`Editar ${offer.title}`}
                          onClick={() => openEditForm(offer)}
                          type="button"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        {offer.status === "ATIVA" ? (
                          <button
                            aria-label={`Encerrar ${offer.title}`}
                            onClick={() => handleCloseOffer(offer.id)}
                            type="button"
                          >
                            <span className="material-symbols-outlined">
                              block
                            </span>
                          </button>
                        ) : (
                          <button
                            aria-label={`Reativar ${offer.title}`}
                            onClick={() => handleReactivateOffer(offer)}
                            type="button"
                          >
                            <span className="material-symbols-outlined">
                              replay
                            </span>
                          </button>
                        )}
                        <button
                          className="danger"
                          aria-label={`Excluir ${offer.title}`}
                          onClick={() => setOfferPendingDelete(offer)}
                          type="button"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </section>

      <button
        className="mobile-fab"
        onClick={openCreateForm}
        type="button"
        aria-label="Nova oferta"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      <nav className="mobile-bottom-nav" aria-label="Navegacao mobile">
        <a className="active" href="#overview">
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </a>
        <a href="#ofertas">
          <span className="material-symbols-outlined">bolt</span>
          Ofertas
        </a>
        <a href="#notificacoes">
          <span className="material-symbols-outlined">favorite</span>
          Interesses
        </a>
      </nav>

      {offerPendingDelete && (
        <div
          className="confirmation-backdrop"
          onClick={() => setOfferPendingDelete(null)}
          role="presentation"
        >
          <dialog
            className="confirmation-dialog"
            onClick={(event) => event.stopPropagation()}
            open
          >
            <span className="material-symbols-outlined">delete</span>
            <h2>Excluir oferta?</h2>
            <p>
              A oferta <strong>{offerPendingDelete.title}</strong> sera removida
              do painel e nao aparecera mais para compradores.
            </p>
            <div>
              <button
                className="secondary-dialog-button"
                onClick={() => setOfferPendingDelete(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="danger-dialog-button"
                onClick={handleDeleteOffer}
                type="button"
              >
                Excluir oferta
              </button>
            </div>
          </dialog>
        </div>
      )}
    </main>
  );
}
