insert into public.ms_pengeluaran (nama, aktif)
values
  ('Bahan Baku', true),
  ('Gas', true),
  ('Air', true),
  ('Sewa', true),
  ('Gaji Karyawan', true),
  ('Gaji Pribadi', true),
  ('Pribadi/Non-usaha', true),
  ('Operasional Lain', true),
  ('Complimentary', true)
on conflict (nama) do update set aktif = true, updated_at = now();