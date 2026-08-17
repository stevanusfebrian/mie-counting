# Software Requirements Specification — Bakmie Ameng Web App

## 1. Latar Belakang

Saat ini pencatatan penjualan, titipan, pengeluaran, dan stok Bakmie Ameng berjalan lewat Google Sheets + Google Form + Apps Script. Dokumen ini merumuskan requirement untuk memindahkan sistem itu ke aplikasi web (Next.js di Vercel + Supabase sebagai database/auth), supaya input lebih cepat dari HP, validasi lebih ketat, dan laporan real-time tanpa batas baris/formula seperti di spreadsheet.

Seluruh aturan bisnis di dokumen ini diambil langsung dari sistem spreadsheet yang sudah berjalan — bukan asumsi baru.

## 2. Asumsi

Beberapa hal saya asumsikan karena belum dibahas eksplisit — koreksi kalau meleset:
- 1 outlet (belum multi-cabang).
- 2 peran pengguna: **Owner** (akses penuh) dan **Staff** (input transaksi harian).
- Rekap tetap **per hari per item** (bukan per transaksi/struk), sesuai keputusan sebelumnya.
- Data historis di Excel yang sudah ada akan dimigrasi manual sekali di awal (lihat bagian 9).

## 3. Ruang Lingkup

**Termasuk (v1):**
- Manajemen Master Data (Menu, Titipan, Resep/BOM, Kategori Pengeluaran, Item Stok)
- Input & riwayat Log Penjualan, Log Titipan, Log Pengeluaran, Daily Stock
- Dashboard Laba Rugi dengan filter tanggal bebas
- Autentikasi & role (Owner/Staff)
- pembayaran digital

**Tidak termasuk (v1) — bisa jadi fase berikutnya:**
- Kasir/POS per struk real-time
- Multi-outlet/multi-cabang
- Pemesanan online
- Notifikasi otomatis (WhatsApp, email)
- Manajemen utang-piutang ke penitip (pembayaran titipan) — saat ini margin diakui saat *terjual*, bukan saat *dibayar ke penitip*; kalau nanti perlu lacak utang-piutangnya juga, ini perlu modul tambahan di luar cakupan v1 ini.

## 4. Peran & Hak Akses

| Aksi | Owner | Staff |
|---|---|---|
| Input Log Penjualan/Titipan/Pengeluaran/Daily Stock | Ya | Ya |
| Edit/hapus entri log (miliknya sendiri, hari yang sama) | Ya | Ya |
| Edit/hapus entri log (siapapun, kapanpun) | Ya | Tidak |
| Lihat Dashboard Laba Rugi | Ya | Tidak (opsional: boleh didiskusikan) |
| CRUD Master Menu/Titipan/Resep/Kategori | Ya | Tidak (read-only, untuk pilihan dropdown saja) |
| Kelola akun staff | Ya | Tidak |

## 5. Functional Requirements

### 5.1 Master Data
- **Master Menu**: CRUD kategori, nama item, unit, harga jual, status aktif/nonaktif. Item nonaktif tidak muncul di dropdown input tapi riwayat lama tetap utuh.
- **Master Titipan**: CRUD nama item, unit, harga beli (dari penitip), harga jual, status aktif. Margin dihitung otomatis (harga jual − harga beli).
- **Master Resep (BOM)**: mapping tiap item menu ke jumlah pcs Pangsit & Bakso yang terpakai per porsi (dipakai untuk hitung pemakaian stok teoritis).
- **Master Kategori Pengeluaran**: daftar tetap — Bahan Baku, Gas, Air, Sewa, Gaji Karyawan, Gaji Pribadi, Pribadi/Non-usaha, Operasional Lain, Complimentary.
- **Master Item Stok**: daftar item yang dipantau di Daily Stock (gabungan sebagian Master Menu + seluruh Master Titipan — tidak semua item menu perlu dipantau stoknya satu per satu, hanya bahan yang dianggap krusial).

### 5.2 Log Penjualan
- Input: Tanggal, Item (dropdown Master Menu aktif), Qty.
- Sistem otomatis hitung & simpan: Harga Jual (snapshot harga saat itu — **bukan** live-lookup, supaya riwayat lama tidak berubah kalau harga naik kemudian), Total, Pangsit Terpakai, Bakso Terpakai (dari Master Resep), Kategori.
- List riwayat dengan filter tanggal & item, bisa export ke CSV/Excel.

### 5.3 Log Titipan
- Input: Tanggal, Item (dropdown Master Titipan aktif), Qty.
- Snapshot Harga Beli, Harga Jual, Margin (qty × (harga jual − harga beli)) — dihitung sistem, bukan input manual.

### 5.4 Log Pengeluaran
- Input: Tanggal, Kategori (dropdown tetap), Deskripsi, Jumlah.
- List riwayat dengan filter tanggal & kategori.

### 5.5 Daily Stock
- Input per item: Tanggal, Item, Opening, Sold, Closing, Waste, Loss.
- Sistem otomatis hitung:
  - **Cek Selisih** = Opening − Sold − Waste − Closing (harus 0; UI kasih highlight visual kalau tidak).
  - **Sold Teoritis**: untuk item menu (Mie/Mie Lebar/Kwetiau/Bihun/Pangsit/Bakso Bulat) ditarik dari akumulasi Log Penjualan lewat Master Resep; untuk item titipan ditarik dari akumulasi Log Titipan.
  - **Selisih vs Teoritis** = Sold (fisik) − Sold Teoritis — dipakai mendeteksi penjualan yang lupa dicatat atau kehilangan stok tak tercatat (termasuk risiko pelanggan dine-in mengambil titipan tanpa tercatat).
- 1 baris per item per tanggal — sistem cegah duplikat (constraint unik tanggal+item).

### 5.6 Dashboard Laba Rugi
- Filter rentang tanggal bebas (custom range, atau preset: Hari ini/Minggu ini/Bulan ini).
- Breakdown Pendapatan: Penjualan Menu & Add-On, Margin Titipan → Total Pendapatan.
- Breakdown Beban Usaha per kategori (7 kategori operasional) → Total Beban Usaha.
- **Laba Usaha** = Total Pendapatan − Total Beban Usaha.
- Breakdown Pengambilan Pribadi (Gaji Pribadi + Pribadi/Non-usaha) → Total Pengambilan Pribadi.
- **Sisa Kas/Laba Bersih** = Laba Usaha − Total Pengambilan Pribadi.
- Info tambahan: Total Loss dari Stok pada periode terpilih.

## 6. Skema Database (Supabase/Postgres)

Lihat diagram ER di atas untuk relasi antar tabel. Poin desain penting:
- **Snapshot harga** disimpan di tiap baris log (`harga_snapshot`, dst) — bukan foreign-key murni ke harga master — supaya laporan historis tetap akurat walau harga menu berubah belakangan.
- `created_by` di tiap tabel log mengacu ke `users` (via Supabase Auth), untuk jejak siapa yang input.
- `resep_bom.menu_item_id` unik per item (relasi 1:1 secara praktik, digambar 1:many di ER untuk fleksibilitas kalau nanti 1 item butuh >1 baris BOM).

```sql
create table users_profile (
  id uuid primary key references auth.users(id),
  email text not null,
  role text not null check (role in ('owner','staff')),
  created_at timestamptz default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  kategori text not null,
  nama text not null,
  unit text not null,
  harga_jual numeric not null check (harga_jual >= 0),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table titipan_items (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  unit text not null,
  harga_beli numeric not null default 0 check (harga_beli >= 0),
  harga_jual numeric not null check (harga_jual >= 0),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table resep_bom (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) unique,
  pangsit_pcs numeric not null default 0,
  bakso_pcs numeric not null default 0
);

create table log_penjualan (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  menu_item_id uuid not null references menu_items(id),
  qty numeric not null check (qty > 0),
  harga_snapshot numeric not null,
  total numeric generated always as (qty * harga_snapshot) stored,
  pangsit_terpakai numeric not null default 0,
  bakso_terpakai numeric not null default 0,
  created_by uuid references users_profile(id),
  created_at timestamptz default now()
);

create table log_titipan (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  titipan_item_id uuid not null references titipan_items(id),
  qty numeric not null check (qty > 0),
  harga_beli_snapshot numeric not null,
  harga_jual_snapshot numeric not null,
  margin numeric generated always as (qty * (harga_jual_snapshot - harga_beli_snapshot)) stored,
  created_by uuid references users_profile(id),
  created_at timestamptz default now()
);

create table log_pengeluaran (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  kategori text not null check (kategori in (
    'Bahan Baku','Gas','Air','Sewa','Gaji Karyawan',
    'Gaji Pribadi','Pribadi/Non-usaha','Operasional Lain','Complimentary'
  )),
  deskripsi text,
  jumlah numeric not null check (jumlah > 0),
  created_by uuid references users_profile(id),
  created_at timestamptz default now()
);

create table daily_stock (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  item_nama text not null,
  unit text not null,
  opening numeric not null default 0,
  sold numeric not null default 0,
  closing numeric not null default 0,
  waste numeric not null default 0,
  loss numeric not null default 0,
  created_by uuid references users_profile(id),
  created_at timestamptz default now(),
  unique (tanggal, item_nama)
);
```

## 7. Aturan Bisnis / Kalkulasi Otomatis

Ini semua kalkulasi yang harus konsisten antara input dan laporan — sudah teruji di versi spreadsheet:

1. `Total Penjualan = qty × harga_snapshot`
2. `Margin Titipan = qty × (harga_jual_snapshot − harga_beli_snapshot)`
3. `Pangsit/Bakso Terpakai = qty × nilai di Master Resep (BOM) untuk item terkait`
4. `Cek Selisih Stok = Opening − Sold − Waste − Closing` (target 0, flag di UI kalau tidak)
5. `Sold Teoritis` = akumulasi Pangsit/Bakso Terpakai dari Log Penjualan (item menu) **atau** akumulasi Qty dari Log Titipan (item titipan), sesuai jenis item
6. `Selisih vs Teoritis = Sold (fisik) − Sold Teoritis`
7. `Total Pendapatan = Σ Total Penjualan + Σ Margin Titipan`
8. `Total Beban Usaha = Σ Jumlah Log Pengeluaran, kategori ≠ (Gaji Pribadi, Pribadi/Non-usaha)`
9. `Laba Usaha = Total Pendapatan − Total Beban Usaha`
10. `Total Pengambilan Pribadi = Σ Jumlah Log Pengeluaran, kategori = (Gaji Pribadi, Pribadi/Non-usaha)`
11. `Sisa Kas/Laba Bersih = Laba Usaha − Total Pengambilan Pribadi`

## 8. Halaman yang Dibutuhkan

| Halaman | Peran | Catatan |
|---|---|---|
| Login | Semua | Supabase Auth (email/password) |
| Dashboard Laba Rugi | Owner | Filter tanggal, breakdown lengkap |
| Input Penjualan | Semua | Form ringkas, bisa submit berkali-kali berturut-turut |
| Input Titipan | Semua | Sama pola dengan Penjualan |
| Input Pengeluaran | Semua | — |
| Input Daily Stock | Semua | Idealnya 1 halaman list semua item + input Opening/Sold/Closing/Waste/Loss sekaligus, bukan 1-1 |
| Riwayat/Log Viewer | Semua (staff hanya lihat) | Filter tanggal, item, kategori; ekspor |
| Kelola Master Menu | Owner | Tabel CRUD |
| Kelola Master Titipan | Owner | Tabel CRUD |
| Kelola Master Resep (BOM) | Owner | Tabel CRUD, terhubung ke Master Menu |
| Kelola Staff | Owner | Undang/nonaktifkan akun staff |

## 9. Migrasi Data Awal
- Data historis dari spreadsheet (Master Menu, Master Titipan, Master Resep, dan log yang sudah ada) perlu di-import sekali ke Supabase — bisa lewat script sekali-jalan (CSV import atau seed script) sebelum go-live.

## 10. Non-Functional Requirements
- **Mobile-first**: form input harus nyaman dipakai satu tangan dari HP staff.
- **Validasi**: qty/jumlah harus angka positif; tanggal wajib diisi; kombinasi tanggal+item di Daily Stock harus unik (dicegah di level database, bukan cuma UI).
- **Autentikasi & otorisasi**: Supabase Row Level Security (RLS) — staff hanya bisa insert/update baris miliknya sendiri; owner bebas akses semua baris.
- **Auditability**: setiap baris log menyimpan `created_by` dan `created_at`.
- **Availability**: hosting di Vercel (auto-scaling), database Supabase (managed Postgres) — tidak butuh server sendiri.

## 11. Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, komponen form/table (mis. shadcn/ui).
- **Backend/DB**: Supabase — Postgres, Auth, Row Level Security, realtime subscription (opsional untuk dashboard live-update).
- **Deployment**: Vercel, terhubung ke repo GitHub, auto-deploy tiap push.
