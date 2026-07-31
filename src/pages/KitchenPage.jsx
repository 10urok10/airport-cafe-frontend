import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../api/client';
import Header from '../components/Header';

// Kasada biri siparis girdiginde mutfagin bunu otomatik gormesi lazim.
// WebSocket gibi bir altyapi kurmak yerine, birkac saniyede bir arka planda
// otomatik yenileme yapiyoruz - kucuk bir kafe icin fazlasiyla yeterli ve
// kurulumu cok daha basit.
const REFRESH_INTERVAL_MS = 5000;

// Bu sureden uzun bekleyen bir siparis, karti kirmizimsi bir cerceveyle
// isaretliyoruz - mutfagin gozden kacirmamasi icin.
const LONG_WAIT_MINUTES = 10;

function minutesAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function OrderCard({ order, actionLabel, onAction, onCancel, actionPending }) {
  const waitMinutes = minutesAgo(order.createdAt);
  const isLongWait = waitMinutes >= LONG_WAIT_MINUTES;

  return (
    <div
      className={`mb-3 rounded-2xl bg-white p-4 shadow-sm ${
        isLongWait ? 'ring-2 ring-red-400' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-bold text-slate-800">#{order.id}</span>
        <span className={`text-sm font-medium ${isLongWait ? 'text-red-600' : 'text-slate-400'}`}>
          {waitMinutes === 0 ? 'az once' : `${waitMinutes} dk once`}
        </span>
      </div>

      <ul className="mb-3 text-slate-600">
        {order.items.map((item) => (
          <li key={item.id} className="mb-1">
            {item.quantity}x {item.product.name}
            {item.variant && ` (${item.variant.name})`}
            {item.modifiers.length > 0 && (
              <div className="pl-4 text-sm font-medium text-amber-600">
                + {item.modifiers.map((m) => m.modifier.name).join(', ')}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        {onAction && (
          <button
            onClick={() => onAction(order.id)}
            disabled={actionPending}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {actionLabel}
          </button>
        )}
        {onCancel && (
          <button
            onClick={() => onCancel(order.id)}
            disabled={actionPending}
            className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Iptal Et
          </button>
        )}
      </div>
    </div>
  );
}

function Column({ title, count, children }) {
  return (
    <div className="flex h-full w-1/3 flex-col px-3">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-800">
        {title}
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm text-slate-600">{count}</span>
      </h2>
      <div className="flex-1 overflow-y-auto pb-6">{children}</div>
    </div>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  // Backend /orders'i varsayilan olarak en yeniden eskiye siralar (siparis
  // gecmisi ekrani icin dogru olan bu). Ama bir mutfak kuyrugunda en UZUN
  // bekleyen siparis en gorunur yerde olmali - aksi halde eski bir siparis
  // sayfanin altinda kaybolup gozden kacabilir. Bu yuzden PENDING/PREPARING
  // icin sirayi istemci tarafinda ters ceviriyoruz (en eski en ustte).
  function useOrdersByStatus(status, { extraParams = '', oldestFirst = false } = {}) {
    return useQuery({
      queryKey: ['orders', status, extraParams],
      queryFn: () => apiFetch(`/orders?status=${status}${extraParams}`),
      refetchInterval: REFRESH_INTERVAL_MS,
      select: (data) => (oldestFirst ? { ...data, orders: [...data.orders].reverse() } : data),
    });
  }

  const pendingQuery = useOrdersByStatus('PENDING', { oldestFirst: true });
  const preparingQuery = useOrdersByStatus('PREPARING', { oldestFirst: true });
  const completedQuery = useOrdersByStatus('COMPLETED', { extraParams: '&take=5' });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }) =>
      apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      setError('');
      invalidateAll();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.');
    },
  });

  function startPreparing(orderId) {
    statusMutation.mutate({ orderId, status: 'PREPARING' });
  }

  function markCompleted(orderId) {
    statusMutation.mutate({ orderId, status: 'COMPLETED' });
  }

  function cancelOrder(orderId) {
    if (window.confirm(`#${orderId} numarali siparisi iptal etmek istediginize emin misiniz?`)) {
      statusMutation.mutate({ orderId, status: 'CANCELLED' });
    }
  }

  const isLoading = pendingQuery.isLoading || preparingQuery.isLoading || completedQuery.isLoading;
  const isError = pendingQuery.isError || preparingQuery.isError || completedQuery.isError;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header />

      <main className="flex flex-1 overflow-hidden p-6 pb-0">
        {isLoading && <p className="text-slate-500">Siparisler yukleniyor...</p>}
        {isError && <p className="text-red-600">Siparisler yuklenemedi.</p>}

        {!isLoading && !isError && (
          <>
            <Column title="Bekleyen" count={pendingQuery.data.orders.length}>
              {pendingQuery.data.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  actionLabel="Hazirlamaya Basla"
                  onAction={startPreparing}
                  onCancel={cancelOrder}
                  actionPending={statusMutation.isPending}
                />
              ))}
              {pendingQuery.data.orders.length === 0 && <p className="text-slate-400">Bekleyen siparis yok.</p>}
            </Column>

            <Column title="Hazirlaniyor" count={preparingQuery.data.orders.length}>
              {preparingQuery.data.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  actionLabel="Tamamlandi"
                  onAction={markCompleted}
                  onCancel={cancelOrder}
                  actionPending={statusMutation.isPending}
                />
              ))}
              {preparingQuery.data.orders.length === 0 && (
                <p className="text-slate-400">Hazirlanan siparis yok.</p>
              )}
            </Column>

            <Column title="Son Tamamlananlar" count={completedQuery.data.orders.length}>
              {completedQuery.data.orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {completedQuery.data.orders.length === 0 && (
                <p className="text-slate-400">Henuz tamamlanan siparis yok.</p>
              )}
            </Column>
          </>
        )}
      </main>

      {error && (
        <p className="mx-6 mb-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
