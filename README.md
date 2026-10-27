# Family Ledger (PWA)

Next.js (App Router) + Tailwind v4 + Supabase. Mobile-first, real-time antar anggota household.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

Catatan: `npm install` gagal (EBADF) di dalam folder Google Drive. Jalankan dari salinan lokal
(mis. `C:\dev\ryania`) dan sinkronkan source ke Drive.

## Environment (`.env.local`)

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only**, hanya untuk `/api/v1/transactions/ingest` |

## Supabase

Skema, RLS, trigger saldo, RPC (`create_household`, `join_household`, dll.), Realtime, dan bucket
`receipts` sudah diterapkan lewat migration `init_family_ledger`.

- Auth → Email template "Magic Link": tambahkan `{{ .Token }}` agar kode 6 digit ikut terkirim
  (berguna saat PWA terinstal dan tautan terbuka di browser lain).
- Auth → URL Configuration: tambahkan URL produksi + `http://localhost:3000/auth/callback`.
- Google OAuth: aktifkan provider di Auth → Providers.

## Ingest API (bot)

```http
POST /api/v1/transactions/ingest
x-api-key: <API key household, lihat Pengaturan>
Content-Type: application/json

{ "source": "telegram", "amount": 45000, "type": "expense",
  "account_name": "GoPay", "category_name": "Makan & Minum",
  "notes": "Makan siang", "sender": "<telegram chat id | nomor WA>" }
```

`account_name` / `category_name` dicocokkan tanpa peka huruf besar/kecil. `sender` opsional;
bila diisi harus anggota household.

## Struktur

- `src/proxy.ts` — refresh sesi + redirect ke `/login`
- `src/components/app-provider.tsx` — state household + Realtime
- `src/components/ui.tsx` — Sheet (drag + spring), Segmented, Toast, dll.
- `public/sw.js` — cache aset statis + halaman offline
