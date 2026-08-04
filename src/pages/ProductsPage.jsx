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

// Bir urunun boy varyantlarini (Orta/Buyuk gibi) yonetir: ekleme, silme, ve
// her varyantin kendi recetesini (BOM) duzenleme - hepsi tek modalda, bir
// varyanta tiklamak o varyantin recete editorunu asagida acip kapatir.
// Her boy adi ("Orta", "Buyuk" vb.) urunler arasinda tekrar tekrar ayni
// sekilde yaziliyor - serbest metin yerine bir secim listesi hem yazim
// tutarliligini saglar hem de hizlandirir. "Orta"/"Buyuk" her zaman
// listede hazir durur, ustune diger urunlerde daha once kullanilmis
// boy adlari da (bu urunde henuz olmayanlar) otomatik eklenir.
const DEFAULT_VARIANT_NAMES = ['Orta', 'Buyuk'];

function VariantsModal({
  product,
  allProducts,
  allIngredients,
  onClose,
  onCreateVariant,
  onDeleteVariant,
  onAddVariantIngredient,
  onRemoveVariantIngredient,
  createPending,
  error,
}) {
  const [expandedVariantId, setExpandedVariantId] = useState(null);
  const [nameOption, setNameOption] = useState('');
  const [customName, setCustomName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [ingredientId, setIngredientId] = useState('');
  const [usageAmount, setUsageAmount] = useState('');

  const usedNames = new Set(product.variants.map((v) => v.name));
  const knownNames = [
    ...new Set([...DEFAULT_VARIANT_NAMES, ...allProducts.flatMap((p) => p.variants.map((v) => v.name))]),
  ]
    .filter((name) => !usedNames.has(name))
    .sort((a, b) => a.localeCompare(b, 'tr'));

  function handleCreate(e) {
    e.preventDefault();
    const name = nameOption === '__custom__' ? customName : nameOption;
    onCreateVariant({ name, price: Number(newPrice) });
    setNameOption('');
    setCustomName('');
    setNewPrice('');
  }

  function handleAddIngredient(e, variantId) {
    e.preventDefault();
    onAddVariantIngredient(variantId, { ingredientId: Number(ingredientId), usageAmount: Number(usageAmount) });
    setIngredientId('');
    setUsageAmount('');
  }

  return (
    <Modal title={`Boylar: ${product.name}`} onClose={onClose}>
      <div className="mb-4 max-h-72 overflow-y-auto">
        {product.variants.length === 0 && <p className="text-slate-400">Boy tanimli degil.</p>}
        {product.variants.map((variant) => (
          <div key={variant.id} className="border-b border-slate-100 py-2 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setExpandedVariantId((id) => (id === variant.id ? null : variant.id))}
                className="flex-1 text-left text-slate-700"
              >
                <span className="font-semibold">{variant.name}</span>: {formatMoney(variant.price)}{' '}
                <span className="text-sm text-slate-400">({variant.ingredients.length} malzeme)</span>
              </button>
              <button
                onClick={() => onDeleteVariant(variant.id)}
                className="text-red-500 hover:text-red-700"
              >
                Sil
              </button>
            </div>

            {expandedVariantId === variant.id && (
              <div className="mt-2 rounded-lg bg-slate-50 p-3">
                {variant.ingredients.length === 0 && (
                  <p className="mb-2 text-sm text-slate-400">Bu boy icin recete tanimli degil.</p>
                )}
                {variant.ingredients.map((bom) => (
                  <div key={bom.ingredientId} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-600">
                      {bom.ingredient.name}: {bom.usageAmount} {bom.ingredient.unit}
                    </span>
                    <button
                      onClick={() => onRemoveVariantIngredient(variant.id, bom.ingredientId)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Cikar
                    </button>
                  </div>
                ))}

                <form onSubmit={(e) => handleAddIngredient(e, variant.id)} className="mt-2 flex items-end gap-2">
                  <select
                    value={ingredientId}
                    onChange={(e) => setIngredientId(e.target.value)}
                    className="h-10 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
                    required
                  >
                    <option value="" disabled>Malzeme secin...</option>
                    {allIngredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={usageAmount}
                    onChange={(e) => setUsageAmount(e.target.value)}
                    placeholder="Miktar"
                    className="h-10 w-24 rounded-lg border border-slate-300 px-2 text-sm"
                    required
                  />
                  <button type="submit" className="h-10 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700">
                    Ekle
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="border-t border-slate-200 pt-4">
        <p className="mb-2 font-semibold text-slate-700">Yeni Boy Ekle</p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={nameOption}
              onChange={(e) => setNameOption(e.target.value)}
              className="h-12 flex-1 rounded-xl border border-slate-300 px-3 text-lg"
              required
            >
              <option value="" disabled>Boy secin...</option>
              {knownNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="__custom__">Ozel (elle giris)</option>
            </select>
            <input
              type="number"
              step="any"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Fiyat"
              className="h-12 w-28 rounded-xl border border-slate-300 px-3 text-lg"
              required
            />
          </div>
          {nameOption === '__custom__' && (
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Boy adi (orn. Kucuk)"
              className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
              required
            />
          )}
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={createPending}
          className="mt-3 h-12 w-full rounded-xl bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {createPending ? 'Ekleniyor...' : 'Boy Ekle'}
        </button>
      </form>
    </Modal>
  );
}

// Bir urune ("Americano") hangi ekstralarin ("Ekstra Shot" gibi) siparis
// ekraninda birlikte sunulacagini isaretler - stok/receteye dokunmaz,
// sadece mevcut "Ekstralar" kategorisindeki urunlerden secim yaptirir. Bu
// eslesme hicbir siparisi referans almadigi icin (bkz. backend CLAUDE.md),
// gecmiste kac kez siparis edilmis olursa olsun her zaman kisitlamasiz
// kaldirilabilir.
function ExtrasModal({ product, allExtraProducts, onClose, onLink, onUnlink, linkPending, error }) {
  const [selectedExtraId, setSelectedExtraId] = useState('');

  const linkedIds = new Set(product.extraOptions.map((eo) => eo.extraId));
  const availableExtras = allExtraProducts.filter((p) => !linkedIds.has(p.id));

  function handleLink(e) {
    e.preventDefault();
    onLink({ extraId: Number(selectedExtraId) });
    setSelectedExtraId('');
  }

  return (
    <Modal title={`Ekstralar: ${product.name}`} onClose={onClose}>
      <div className="mb-4 max-h-72 overflow-y-auto">
        {product.extraOptions.length === 0 && <p className="text-slate-400">Baglanmis ekstra yok.</p>}
        {product.extraOptions.map((eo) => (
          <div
            key={eo.extraId}
            className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
          >
            <span className="text-slate-700">
              {eo.extra.name} <span className="text-sm text-slate-400">({formatMoney(eo.extra.price)})</span>
            </span>
            <button onClick={() => onUnlink(eo.extraId)} className="text-red-500 hover:text-red-700">
              Kaldir
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleLink} className="border-t border-slate-200 pt-4">
        <p className="mb-2 font-semibold text-slate-700">Ekstra Bagla</p>
        {availableExtras.length === 0 ? (
          <p className="text-sm text-slate-400">
            Baglanacak ekstra yok - once "Ekstralar" kategorisinde bir urun olusturun.
          </p>
        ) : (
          <div className="flex gap-2">
            <select
              value={selectedExtraId}
              onChange={(e) => setSelectedExtraId(e.target.value)}
              className="h-12 flex-1 rounded-xl border border-slate-300 px-3 text-lg"
              required
            >
              <option value="" disabled>Ekstra secin...</option>
              {availableExtras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatMoney(p.price)})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={linkPending}
              className="h-12 rounded-xl bg-indigo-600 px-5 text-lg font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              Ekle
            </button>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // { type: 'create'|'edit'|'recipe'|'variants'|'extras', product? }
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
    enabled: modal?.type === 'recipe' || modal?.type === 'variants',
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

  const createVariantMutation = useMutation({
    mutationFn: (body) => apiFetch(`/products/${modal.product.id}/variants`, { method: 'POST', body }),
    // Recete modalindeki gibi modali KAPATMIYORUZ - art arda birden fazla boy eklenebilsin.
    onSuccess: () => { invalidateProducts(); setFormError(''); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId) => apiFetch(`/products/${modal.product.id}/variants/${variantId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateProducts(),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const addVariantIngredientMutation = useMutation({
    mutationFn: ({ variantId, body }) =>
      apiFetch(`/products/${modal.product.id}/variants/${variantId}/ingredients`, { method: 'POST', body }),
    onSuccess: () => { invalidateProducts(); setFormError(''); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const removeVariantIngredientMutation = useMutation({
    mutationFn: ({ variantId, ingredientId }) =>
      apiFetch(`/products/${modal.product.id}/variants/${variantId}/ingredients/${ingredientId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateProducts(),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const addExtraMutation = useMutation({
    mutationFn: (body) => apiFetch(`/products/${modal.product.id}/extras`, { method: 'POST', body }),
    onSuccess: () => { invalidateProducts(); setFormError(''); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const removeExtraMutation = useMutation({
    mutationFn: (extraId) => apiFetch(`/products/${modal.product.id}/extras/${extraId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateProducts(),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Islem basarisiz oldu.'),
  });

  const products = productsQuery.data?.products ?? [];
  const extraProducts = products.filter((p) => p.category === 'Ekstralar' && p.isActive);

  // Recete/Boylar/Ekstralar modali acikken urun listesi tazelenirse (yeni
  // malzeme/boy/ekstra eklendiginde oldugu gibi), modalin de guncel veriyi
  // gostermesi icin taze listeden ayni urunu tekrar buluyoruz.
  const activeModalProduct =
    modal?.type === 'recipe' || modal?.type === 'variants' || modal?.type === 'extras'
      ? products.find((p) => p.id === modal.product.id) ?? modal.product
      : modal?.product;

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
                  <th className="px-5 py-3">Boylar</th>
                  <th className="px-5 py-3">Ekstralar</th>
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
                    <td className="px-5 py-3 text-slate-600">
                      {p.variants.length === 0 ? formatMoney(p.price) : 'Boylara gore degisir'}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {p.variants.length > 0
                        ? 'Boylar uzerinden yonetiliyor'
                        : p.ingredients.length === 0
                          ? 'tanimli degil'
                          : `${p.ingredients.length} malzeme`}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {p.variants.length === 0 ? 'yok' : `${p.variants.length} boy`}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {p.category === 'Ekstralar'
                        ? '-'
                        : p.extraOptions.length === 0
                          ? 'yok'
                          : `${p.extraOptions.length} ekstra`}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {p.variants.length === 0 && (
                          <button
                            onClick={() => { setFormError(''); setModal({ type: 'recipe', product: p }); }}
                            className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                          >
                            Recete
                          </button>
                        )}
                        <button
                          onClick={() => { setFormError(''); setModal({ type: 'variants', product: p }); }}
                          className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                        >
                          Boylar
                        </button>
                        {p.category !== 'Ekstralar' && (
                          <button
                            onClick={() => { setFormError(''); setModal({ type: 'extras', product: p }); }}
                            className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200"
                          >
                            Ekstralar
                          </button>
                        )}
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

      {modal?.type === 'variants' && activeModalProduct && (
        <VariantsModal
          product={activeModalProduct}
          allProducts={products}
          allIngredients={ingredientsQuery.data?.ingredients ?? []}
          onClose={closeModal}
          onCreateVariant={(body) => createVariantMutation.mutate(body)}
          onDeleteVariant={(variantId) => deleteVariantMutation.mutate(variantId)}
          onAddVariantIngredient={(variantId, body) => addVariantIngredientMutation.mutate({ variantId, body })}
          onRemoveVariantIngredient={(variantId, ingredientId) =>
            removeVariantIngredientMutation.mutate({ variantId, ingredientId })
          }
          createPending={createVariantMutation.isPending}
          error={formError}
        />
      )}

      {modal?.type === 'extras' && activeModalProduct && (
        <ExtrasModal
          product={activeModalProduct}
          allExtraProducts={extraProducts}
          onClose={closeModal}
          onLink={(body) => addExtraMutation.mutate(body)}
          onUnlink={(extraId) => removeExtraMutation.mutate(extraId)}
          linkPending={addExtraMutation.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
