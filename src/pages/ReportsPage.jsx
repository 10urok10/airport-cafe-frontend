import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import Header from '../components/Header';
import { formatMoney } from '../utils/format';

// Backend tarihi YEREL saat dilimine gore yorumluyor (bkz. reportController.js
// parseDateParam) - burada da ayni yontemle (toISOString/UTC DEGIL) bugunun
// tarihini uretiyoruz, aksi halde gece yarisina yakin saatlerde bir onceki/
// sonraki gunu sorgulama riski olurdu.
function todayLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function StatCard({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-600' : 'text-slate-800';
  return (
    <div className="flex-1 rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function DailySummarySection() {
  const [date, setDate] = useState(todayLocalDateString);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'daily-summary', date],
    queryFn: () => apiFetch(`/reports/daily-summary?date=${date}`),
  });

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Gunluk Ozet</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-xl border border-slate-300 px-3 text-lg"
        />
      </div>

      {isLoading && <p className="text-slate-500">Yukleniyor...</p>}
      {isError && <p className="text-red-600">Rapor yuklenemedi.</p>}

      {data && (
        <>
          <div className="mb-6 flex gap-4">
            <StatCard label="Toplam Ciro" value={formatMoney(data.revenue.total)} tone="positive" />
            <StatCard label="Odenmis Siparis" value={data.paidOrders} />
            <StatCard label="Iptal Edilen" value={data.cancelledOrders} tone={data.cancelledOrders > 0 ? 'negative' : 'default'} />
            <StatCard label="Iade Tutari" value={formatMoney(data.refunds.total)} tone={Number(data.refunds.total) > 0 ? 'negative' : 'default'} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-slate-800">Odeme Yontemi Dagilimi</h3>
              {data.revenue.byPaymentMethod.length === 0 && <p className="text-slate-400">Kayit yok.</p>}
              <ul>
                {data.revenue.byPaymentMethod.map((pm) => (
                  <li key={pm.paymentMethod} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
                    <span className="text-slate-600">{pm.paymentMethod} ({pm.count} adet)</span>
                    <span className="font-semibold text-slate-800">{formatMoney(pm.total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-slate-800">En Cok Satan Urunler</h3>
              {data.topProducts.length === 0 && <p className="text-slate-400">Kayit yok.</p>}
              <ul>
                {data.topProducts.map((p, i) => (
                  <li key={p.productId} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
                    <span className="text-slate-600">{i + 1}. {p.name} ({p.quantitySold} adet)</span>
                    <span className="font-semibold text-slate-800">{formatMoney(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ProductMarginsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'product-margins'],
    queryFn: () => apiFetch('/reports/product-margins'),
  });

  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold text-slate-800">Urun Kar Marji</h2>

      {isLoading && <p className="text-slate-500">Yukleniyor...</p>}
      {isError && <p className="text-red-600">Rapor yuklenemedi.</p>}

      {data && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-3">Urun</th>
                <th className="px-5 py-3">Fiyat</th>
                <th className="px-5 py-3">Maliyet</th>
                <th className="px-5 py-3">Kar</th>
                <th className="px-5 py-3">Kar Marji</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.productId} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {p.name}
                    {!p.costDataComplete && (
                      <span
                        className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                        title="Recete tanimli degil veya bazi malzemelerin maliyeti hic girilmemis"
                      >
                        maliyet eksik
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{formatMoney(p.price)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatMoney(p.cost)}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-600">{formatMoney(p.margin)}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    {p.marginPercent === null ? '-' : `%${p.marginPercent}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ReportsPage() {
  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <DailySummarySection />
        <ProductMarginsSection />
      </main>
    </div>
  );
}
