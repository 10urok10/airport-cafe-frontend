# Airport Cafe — Frontend

Fare + klavye ile kullanılan, kafe içi bir POS (sipariş/mutfak/envanter/rapor) arayüzü. React + Vite + Tailwind ile yazıldı; [airport-cafe-backend](https://github.com/10urok10/airport-cafe-backend) adlı headless REST API'ye bağlanır — bu repo hiçbir veriyi kendi başına saklamaz, her şey backend üzerinden gelir.

## Kurulum

Önce backend'in ayrı bir yerde çalışıyor olması gerekir (bkz. backend repo'sunun kendi kurulum adımları).

```bash
npm install
cp .env.example .env      # yoksa VITE_API_URL=http://localhost:3000 icerigiyle olustur
npm run dev                # http://localhost:5173
```

`.env` içindeki `VITE_API_URL`, backend'in adresini gösterir. Backend farklı bir makinede/portta çalışıyorsa (LAN veya tünel üzerinden paylaşım gibi) bu değeri güncelleyip dev server'ı yeniden başlatmak gerekir — Vite, `.env` değişikliklerini yalnızca başlangıçta okur.

## Komutlar

```bash
npm run dev       # gelistirme sunucusu (HMR)
npm run build     # production build (dist/)
npm run preview   # build'i yerelde onizle
npm run lint      # oxlint
```

## Sayfalar

| Rota | Açıklama | Erişim |
|---|---|---|
| `/login` | PIN tuş takımıyla giriş | herkese açık |
| `/orders` | Sipariş alma — ürüne tıkla (boy ve/veya ekstra seçeneği olan ürünlerde önce bir seçim penceresi açılır), sepete eklenir, ödeme yöntemi seç, tamamla | tüm personel |
| `/kitchen` | Mutfak ekranı: Bekleyen / Hazırlanıyor / Son Tamamlananlar, 5sn'de bir otomatik yenilenir | tüm personel |
| `/inventory` | Stok listesi, stok düzeltme; malzeme ekleme/düzenleme sadece ADMIN | tüm personel (düzenleme ADMIN) |
| `/products` | Ürün, reçete (BOM), boy varyantı (Orta/Büyük gibi) ve ekstra (Ekstra Shot, Yulaf Sütü gibi) yönetimi — her boy/ekstranın kendi fiyatı ve kendi reçetesi olur | sadece ADMIN |
| `/reports` | Günlük özet ciro/ödeme kırılımı, ürün kâr marjı raporu | sadece ADMIN |

Personel yönetimi ekranı bilinçli olarak yok — kullanıcılar şu an sadece backend/DB tarafında yönetiliyor.

## Notlar

- Oturum (JWT + kullanıcı bilgisi) `localStorage`'da tutulur, sayfa yenilense de oturum düşmez.
- `vite.config.js`'de `server.allowedHosts: true` var — bu, dev server'ı bir tünel (cloudflared/localtunnel) arkasından paylaşırken Vite'ın host-header kontrolüne takılmamak için eklendi.
