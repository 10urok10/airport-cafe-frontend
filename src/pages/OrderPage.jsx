import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../api/client';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Nakit' },
  { value: 'CARD', label: 'Kart' },
];

// Sepette bir kalemi tekil olarak tanimlayan anahtar: ayni urunun "Orta"su
// ile "Buyuk"u ayri satirlar olmali, sadece productId'ye gore eslestirmek
// bunlari yanlislikla birlestirirdi.
function cartLineKey(productId, variantId) {
  return `${productId}-${variantId ?? 'base'}`;
}

export default function OrderPage() {
  const queryClient = useQueryClient();

  const [cart, setCart] = useState([]); // [{ productId, variantId, name, price, quantity }]
  const [selectedCategory, setSelectedCategory] = useState('Tumu');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isStaffOrder, setIsStaffOrder] = useState(false);
  const [sizeModalProduct, setSizeModalProduct] = useState(null); // boy secimi bekleyen urun
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }
  // Ayni siparisin yanlislikla iki kez gonderilmesine karsi (orn. cift
  // tiklama), backend'in idempotencyKey mekanizmasini kullaniyoruz. Basarili
  // her siparisten sonra yeni bir anahtar uretiyoruz (bkz. resetOrderSession).
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const {
    data: productsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products'),
  });

  const products = productsData?.products ?? [];

  const categories = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.category))];
    return ['Tumu', ...unique];
  }, [products]);

  const visibleProducts =
    selectedCategory === 'Tumu' ? products : products.filter((p) => p.category === selectedCategory);

  // Urunun boy varyanti varsa direkt sepete eklemek yerine once boy sormak
  // gerekir - "once Americano sec, sonra Orta mi Buyuk mu" akisi bunu saglar.
  function addToCart(product) {
    setFeedback(null);
    if (product.variants && product.variants.length > 0) {
      setSizeModalProduct(product);
      return;
    }
    addLineToCart(product.id, null, product.name, product.price);
  }

  function addVariantToCart(product, variant) {
    addLineToCart(product.id, variant.id, `${product.name} (${variant.name})`, variant.price);
    setSizeModalProduct(null);
  }

  function addLineToCart(productId, variantId, name, price) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId && item.variantId === variantId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, variantId, name, price, quantity: 1 }];
    });
  }

  function changeQuantity(productId, variantId, delta) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId, variantId) {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)));
  }

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  function resetOrderSession() {
    setCart([]);
    setIsStaffOrder(false);
    setIdempotencyKey(crypto.randomUUID());
  }

  const createOrderMutation = useMutation({
    mutationFn: () =>
      apiFetch('/orders', {
        method: 'POST',
        body: {
          paymentMethod,
          idempotencyKey,
          isStaffOrder,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      }),
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: `Siparis olusturuldu (#${data.order.id}).` });
      resetOrderSession();
      // Stok miktarlari degisti, urun listesini tazeliyoruz (isLowStock vs.
      // baska bir ekranda gorunecekse guncel kalsin diye).
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err instanceof ApiError ? err.message : 'Siparis olusturulamadi.' });
    },
  });

  function handleSubmitOrder() {
    setFeedback(null);
    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Sepet bos.' });
      return;
    }
    createOrderMutation.mutate();
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sol/orta: kategori sekmeleri + urun izgarasi */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && <p className="text-slate-500">Urunler yukleniyor...</p>}
          {isError && <p className="text-red-600">Urunler yuklenemedi.</p>}

          {!isLoading && !isError && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-5 py-3 text-lg font-semibold transition ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'Tumu' ? 'Tumu' : cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleProducts.map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 text-center shadow-sm transition hover:shadow-md hover:ring-2 hover:ring-indigo-400 active:scale-95"
                    >
                      <span className="text-lg font-semibold text-slate-800">{product.name}</span>
                      {hasVariants ? (
                        <span className="text-sm font-semibold text-indigo-600">
                          {product.variants.length === 1
                            ? formatMoney(product.variants[0].price)
                            : `${formatMoney(product.variants[0].price)} - ${formatMoney(product.variants[product.variants.length - 1].price)}`}
                        </span>
                      ) : (
                        <span className="text-xl font-bold text-indigo-600">{formatMoney(product.price)}</span>
                      )}
                    </button>
                  );
                })}
                {visibleProducts.length === 0 && (
                  <p className="col-span-full text-slate-500">Bu kategoride urun yok.</p>
                )}
              </div>
            </>
          )}
        </main>

        {/* Sag: sepet paneli */}
        <aside className="flex w-96 flex-col border-l border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Siparis</h2>

          <div className="mb-4 flex-1 overflow-y-auto">
            {cart.length === 0 && <p className="text-slate-400">Sepet bos. Urune tiklayin.</p>}
            {cart.map((item) => (
              <div key={cartLineKey(item.productId, item.variantId)} className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">{formatMoney(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeQuantity(item.productId, item.variantId, -1)}
                    className="h-8 w-8 rounded-lg bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => changeQuantity(item.productId, item.variantId, 1)}
                    className="h-8 w-8 rounded-lg bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    className="ml-1 text-red-500 hover:text-red-700"
                    aria-label="Sil"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsStaffOrder((prev) => !prev)}
            className={`mb-4 flex items-center justify-between rounded-xl px-4 py-3 text-lg font-semibold transition ${
              isStaffOrder ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Personel Siparisi</span>
            <span className="text-sm font-normal">{isStaffOrder ? 'Acik - Ucretsiz' : 'Kapali'}</span>
          </button>

          <div className="mb-4">
            <span className="mb-1 block text-sm font-medium text-slate-600">Odeme Yontemi</span>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex-1 rounded-xl py-3 text-lg font-semibold transition ${
                    paymentMethod === pm.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between text-2xl font-bold text-slate-800">
            <span>Toplam</span>
            <span>{isStaffOrder ? formatMoney(0) : formatMoney(total)}</span>
          </div>

          {feedback && (
            <p
              className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-medium ${
                feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {feedback.message}
            </p>
          )}

          <button
            onClick={handleSubmitOrder}
            disabled={createOrderMutation.isPending}
            className="h-16 w-full rounded-xl bg-emerald-600 text-xl font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {createOrderMutation.isPending ? 'Gonderiliyor...' : 'Siparisi Tamamla'}
          </button>
        </aside>
      </div>

      {sizeModalProduct && (
        <Modal title={`${sizeModalProduct.name} - Boy Secin`} onClose={() => setSizeModalProduct(null)}>
          <div className="flex flex-col gap-3">
            {sizeModalProduct.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => addVariantToCart(sizeModalProduct, variant)}
                className="flex items-center justify-between rounded-xl bg-slate-100 px-5 py-4 text-lg font-semibold text-slate-700 transition hover:bg-indigo-600 hover:text-white active:scale-95"
              >
                <span>{variant.name}</span>
                <span>{formatMoney(variant.price)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
