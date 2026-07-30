import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../api/client';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

function ProductFormModal({ title, initial, onClose, onSubmit, isPending, error }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    price: initial?.price ?? '',
    category: initial?.category ?? '',
    isActive: initial?.isActive ?? true,
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { name: form.name, price: Number(form.price), category: form.category };
    if (initial) {
      payload.isActive = form.isActive;
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
          <span className="mb-1 block text-sm font-medium text-slate-600">Kategori</span>
          <input
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Fiyat (TL)</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          />
        </label>

        {initial && (
          <label className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-slate-700">Aktif (menude gorunsun)</span>
          </label>
        )}

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

function RecipeModal({ product, allIngredients, onClose, onAdd, onRemove, addPending, removePending, error }) {
  const [ingredientId, setIngredientId] = useState('');
  const [usageAmount, setUsageAmount] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    onAdd({ ingredientId: Number(ingredientId), usageAmount: Number(usageAmount) });
    setIngredientId('');
    setUsageAmount('');
  }

  return (
    <Modal title={`Recete: ${product.name}`} onClose={onClose}>
      <div className="mb-4 max-h-56 overflow-y-auto">
        {product.ingredients.length === 0 && <p className="text-slate-400">Recete tanimli degil.</p>}
        {product.ingredients.map((bom) => (
          <div
            key={bom.ingredientId}
            className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
          >
            <span className="text-slate-700">
              {bom.ingredient.name}: <span className="font-semibold">{bom.usageAmount} {bom.ingredient.unit}</span>
            </span>
            <button
              onClick={() => onRemove(bom.ingredientId)}
              disabled={removePending}
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Cikar
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="border-t border-slate-200 pt-4">
        <p className="mb-2 font-semibold text-slate-700">Malzeme Ekle / Guncelle</p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Malzeme</span>
          <select
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          >
            <option value="" disabled>Secin...</option>
            {allIngredients.map((ing) => (
              <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Miktar</span>
          <input
            type="number"
            step="any"
            min="0"
            value={usageAmount}
            onChange={(e) => setUsageAmount(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            required
          />
        </label>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={addPending}
          className="h-12 w-full rounded-xl bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {addPending ? 'Kaydediliyor...' : 'Ekle / Guncelle'}
        </button>
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // { type: 'create'|'edit'|'recipe', product? }
  const [formError, setFormError] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const productsQuery = useQuery({
    queryKey: ['products', 'admin', includeInactive],
    queryFn: () => apiFetch(`/products${includeInactive ? '?includeInactive=true' : ''}`),
  });

  // Malzeme secim listesi sadece recete modali acikken lazim, gereksiz yere
  // her sayfa yuklemesinde cekmeyelim diye 'enabled' ile sinirliyoruz.
  const ingredientsQuery = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch('/ingredients'),
    enabled: modal?.type === 'recipe',
  });

  function closeModal() {
    setModal(null);
    setFormError('');
  }

  function invalidateProducts() {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }

  const createMutation = useMutation({
    mutationFn: (body) => apiFetch('/products', { method: 'POST', body }),
    onSuccess: () => { invalidateProducts(); closeModal(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const editMutation = useMutation({
    mutationFn: (body) => apiFetch(`/products/${modal.product.id}`, { method: 'PATCH', body }),
    onSuccess: () => { invalidateProducts(); closeModal(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const addIngredientMutation = useMutation({
    mutationFn: (body) => apiFetch(`/products/${modal.product.id}/ingredients`, { method: 'POST', body }),
    // Recete modalini KAPATMIYORUZ - kullanici art arda birden fazla
    // malzeme ekleyebilsin. Sadece listeyi tazeliyoruz.
    onSuccess: () => { invalidateProducts(); setFormError(''); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const removeIngredientMutation = useMutation({
    mutationFn: (ingredientId) =>
      apiFetch(`/products/${modal.product.id}/ingredients/${ingredientId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateProducts(),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const products = productsQuery.data?.products ?? [];

  // Recete modali acikken urun listesi tazelenirse (yeni malzeme eklendiginde
  // oldugu gibi), modalin de guncel veriyi gostermesi icin taze listeden
  // ayni urunu tekrar buluyoruz.
  const activeModalProduct =
    modal?.type === 'recipe' ? products.find((p) => p.id === modal.product.id) ?? modal.product : modal?.product;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Urunler</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="h-5 w-5"
              />
              Pasifleri de goster
            </label>
            <button
              onClick={() => { setFormError(''); setModal({ type: 'create' }); }}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
            >
              + Yeni Urun
            </button>
          </div>
        </div>

        {productsQuery.isLoading && <p className="text-slate-500">Yukleniyor...</p>}
        {productsQuery.isError && <p className="text-red-600">Urunler yuklenemedi.</p>}

        {productsQuery.data && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-5 py-3">Urun</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Fiyat</th>
                  <th className="px-5 py-3">Recete</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {p.name}
                      {!p.isActive && (
                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          pasif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{p.category}</td>
                    <td className="px-5 py-3 text-slate-600">{formatMoney(p.price)}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {p.ingredients.length === 0 ? 'tanimli degil' : `${p.ingredients.length} malzeme`}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setFormError(''); setModal({ type: 'recipe', product: p }); }}
                          className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                        >
                          Recete
                        </button>
                        <button
                          onClick={() => { setFormError(''); setModal({ type: 'edit', product: p }); }}
                          className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                        >
                          Duzenle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal?.type === 'create' && (
        <ProductFormModal
          title="Yeni Urun"
          onClose={closeModal}
          onSubmit={(body) => createMutation.mutate(body)}
          isPending={createMutation.isPending}
          error={formError}
        />
      )}

      {modal?.type === 'edit' && (
        <ProductFormModal
          title={`Duzenle: ${modal.product.name}`}
          initial={modal.product}
          onClose={closeModal}
          onSubmit={(body) => editMutation.mutate(body)}
          isPending={editMutation.isPending}
          error={formError}
        />
      )}

      {modal?.type === 'recipe' && activeModalProduct && (
        <RecipeModal
          product={activeModalProduct}
          allIngredients={ingredientsQuery.data?.ingredients ?? []}
          onClose={closeModal}
          onAdd={(body) => addIngredientMutation.mutate(body)}
          onRemove={(ingredientId) => removeIngredientMutation.mutate(ingredientId)}
          addPending={addIngredientMutation.isPending}
          removePending={removeIngredientMutation.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
