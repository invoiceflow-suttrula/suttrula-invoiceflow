-- ============================================================================
--  Per-user data isolation (multi-tenancy)
--  Run this ONCE in Supabase → SQL Editor.
--
--  After this, every account only sees its OWN company settings, data sources,
--  invoices, batches and PDF files — exactly like separate Instagram accounts.
--  Templates remain a SHARED, read-only design catalog (app content, not user data).
-- ============================================================================

-- 1) Owner columns -----------------------------------------------------------
alter table public.invoices        add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.invoice_batches add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.companies       add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- one company/settings row per user
create unique index if not exists companies_user_id_key on public.companies (user_id);

-- 2) (OPTIONAL) Keep your existing data by assigning it to your account.
--    Find your id in Supabase → Authentication → Users, paste it below, and
--    uncomment the three lines. Skip this block to let old/test data become
--    inaccessible (it will simply stop showing up).
--
-- update public.companies       set user_id = '<YOUR_USER_ID>' where user_id is null;
-- update public.invoices        set user_id = '<YOUR_USER_ID>' where user_id is null;
-- update public.invoice_batches set user_id = '<YOUR_USER_ID>' where user_id is null;

-- 3) Remove any pre-existing policies on these tables, so older
--    "any authenticated user can do anything" rules don't override the new
--    per-user ones (Postgres OR-combines permissive policies).
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('companies','invoices','invoice_batches','templates','data_sources','data_rows')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 4) Enable RLS --------------------------------------------------------------
alter table public.companies       enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_batches enable row level security;
alter table public.templates       enable row level security;
alter table public.data_sources    enable row level security;
alter table public.data_rows       enable row level security;

-- 5) Per-user policies -------------------------------------------------------
create policy companies_own on public.companies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy invoices_own on public.invoices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy invoice_batches_own on public.invoice_batches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy data_sources_own on public.data_sources
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- data_rows belong to whoever owns the parent data_source
create policy data_rows_own on public.data_rows
  for all using (
    exists (select 1 from public.data_sources s
            where s.id = data_rows.data_source_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.data_sources s
            where s.id = data_rows.data_source_id and s.user_id = auth.uid())
  );

-- templates: shared, read-only catalog for every signed-in user
create policy templates_read on public.templates
  for select using (auth.role() = 'authenticated');
--  (no insert/update/delete policies => nobody can modify the shared catalog)

-- 6) Storage isolation for the 'invoices' bucket -----------------------------
--    Files are stored as <userId>/<batchId>/<file>. These policies only let a
--    user touch objects inside their own <userId> folder.
drop policy if exists invoices_storage_select on storage.objects;
drop policy if exists invoices_storage_insert on storage.objects;
drop policy if exists invoices_storage_update on storage.objects;
drop policy if exists invoices_storage_delete on storage.objects;

create policy invoices_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoices_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoices_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoices_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

-- NOTE: If you created storage policies earlier under different names, open
-- Storage → Policies and delete any old 'invoices' bucket policies that grant
-- broad access, so they don't override the four above.
-- ============================================================================
