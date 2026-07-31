import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

const ADJUSTMENT_REASONS = [
  { value: 'RESTOCK', label: 'Tedarikci Teslimati (RESTOCK)', hint: 'Eklenecek miktar' },
  { value: 'WASTE', label: 'Fire / Israf (WASTE)', hint: 'Kaybolan miktar' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manuel Duzeltme', hint: 'Fark (+ eksi olabilir)' },
];

function StockAdjustModal({ ingredient, onClose, onSubmit, isPending, error }) {
  const [reason, setReason] = useState('RESTOCK');
  const [amount, setAmount] = useState('');
  const selectedReason = ADJUSTMENT_REASONS.find((r) => r.value === reason);

  function handleSubmit(e) {
    e.preventDefault();
    const raw = Number(amount);
    // RESTOCK ve WASTE icin kullaniciya hep POZITIF bir miktar giriliyor
    // ("5 litre sut geldi" / "2 litre sut doküldu"), isaretini biz ekliyoruz -
    // backend'in RESTOCK>0 / WASTE<0 kuralini kullanicinin bilmesine gerek yok.
    const signedAmount = reason === 'WASTE' ? -Math.abs(raw) : reason === 'RESTOCK' ? Math.abs(raw) : raw;
    onSubmit({ changeAmount: signedAmount, reason });
  }

  return (
    <Modal title={`Stok Duzelt: ${ingredient.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="mb-4 text-slate-500">Mevcut stok: {ingredient.stockQuantity} {ingredient.unit}</p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Neden</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
          >
            {ADJUSTMENT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            {selectedReason.hint} ({ingredient.unit})
          </span>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          />
        </label>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="h-12 w-full rounded-xl bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </Modal>
  );
}

function IngredientFormModal({ title, initial, onClose, onSubmit, isPending, error, showStockField }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    unit: initial?.unit ?? '',
    stockQuantity: initial?.stockQuantity ?? '',
    minStockThreshold: initial?.minStockThreshold ?? 0,
    costPerUnit: initial?.costPerUnit ?? 0,
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      unit: form.unit,
      minStockThreshold: Number(form.minStockThreshold),
      costPerUnit: Number(form.costPerUnit),
    };
    if (showStockField) {
      payload.stockQuantity = Number(form.stockQuantity);
    }
    onSubmit(payload);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Ad</span>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Birim (orn. g, ml)</span>
          <input
            value={form.unit}
            onChange={(e) => update('unit', e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          />
        </label>

        {showStockField && (
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Baslangic Stogu</span>
            <input
              type="number"
              step="any"
              min="0"
              value={form.stockQuantity}
              onChange={(e) => update('stockQuantity', e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
              required
            />
          </label>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Dusuk Stok Esigi</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.minStockThreshold}
            onChange={(e) => update('minStockThreshold', e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Birim Maliyet (TL)</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.costPerUnit}
            onChange={(e) => update('costPerUnit', e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
          />
        </label>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="h-12 w-full rounded-xl bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </Modal>
  );
}

// Stok/esik orani: 1'e ne kadar yakinsa (veya altindaysa) esige o kadar
// yakin demektir. Esik hic tanimlanmamissa (0) bir "aciliyet" olcusu
// olamaz, bu yuzden Infinity donup siralamada en sona (en az riskli yere)
// dusmesini sagliyoruz.
function thresholdRatio(ingredient) {
  const threshold = Number(ingredient.minStockThreshold);
  if (threshold <= 0) return Infinity;
  return Number(ingredient.stockQuantity) / threshold;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [modal, setModal] = useState(null); // { type: 'adjust'|'create'|'edit', ingredient? }
  const [formError, setFormError] = useState('');
  const [sortByThreshold, setSortByThreshold] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch('/ingredients'),
  });

  function closeModal() {
    setModal(null);
    setFormError('');
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
  }

  const adjustMutation = useMutation({
    mutationFn: (body) => apiFetch(`/ingredients/${modal.ingredient.id}/stock-adjustments`, { method: 'POST', body }),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const createMutation = useMutation({
    mutationFn: (body) => apiFetch('/ingredients', { method: 'POST', body }),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const editMutation = useMutation({
    mutationFn: (body) => apiFetch(`/ingredients/${modal.ingredient.id}`, { method: 'PATCH', body }),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const ingredients = data?.ingredients ?? [];

  const displayedIngredients = useMemo(() => {
    if (!sortByThreshold) return ingredients;
    return [...ingredients].sort((a, b) => thresholdRatio(a) - thresholdRatio(b));
  }, [ingredients, sortByThreshold]);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Envanter</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortByThreshold((prev) => !prev)}
              className={`rounded-xl px-5 py-3 text-lg font-semibold transition ${
                sortByThreshold ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              Esige Yakinliga Gore Sirala
            </button>
            {isAdmin && (
              <button
                onClick={() => { setFormError(''); setModal({ type: 'create' }); }}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
              >
                + Yeni Malzeme
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="text-slate-500">Yukleniyor...</p>}
        {isError && <p className="text-red-600">Envanter yuklenemedi.</p>}

        {data && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-5 py-3">Malzeme</th>
                  <th className="px-5 py-3">Stok</th>
                  <th className="px-5 py-3">Esik</th>
                  <th className="px-5 py-3">Birim Maliyet</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayedIngredients.map((ing) => (
                  <tr key={ing.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {ing.name}
                      {ing.isLowStock && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          dusuk stok
                        </span>
                      )}
                    </td>
                    <td className={`px-5 py-3 ${ing.isLowStock ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                      {ing.stockQuantity} {ing.unit}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{ing.minStockThreshold} {ing.unit}</td>
                    <td className="px-5 py-3 text-slate-500">{formatMoney(ing.costPerUnit)} / {ing.unit}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setFormError(''); setModal({ type: 'adjust', ingredient: ing }); }}
                          className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                        >
                          Stok Duzelt
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setFormError(''); setModal({ type: 'edit', ingredient: ing }); }}
                            className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                          >
                            Duzenle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal?.type === 'adjust' && (
        <StockAdjustModal
          ingredient={modal.ingredient}
          onClose={closeModal}
          onSubmit={(body) => adjustMutation.mutate(body)}
          isPending={adjustMutation.isPending}
          error={formError}
        />
      )}

      {modal?.type === 'create' && (
        <IngredientFormModal
          title="Yeni Malzeme"
          showStockField
          onClose={closeModal}
          onSubmit={(body) => createMutation.mutate(body)}
          isPending={createMutation.isPending}
          error={formError}
        />
      )}

      {modal?.type === 'edit' && (
        <IngredientFormModal
          title={`Duzenle: ${modal.ingredient.name}`}
          initial={modal.ingredient}
          onClose={closeModal}
          onSubmit={(body) => editMutation.mutate(body)}
          isPending={editMutation.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
