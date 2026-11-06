-- Permite a cualquier usuario con sesion de Supabase Auth gestionar empleados.
-- Ejecutar en Supabase SQL Editor en proyectos ya instalados.
create or replace function is_staff() returns boolean
language sql security definer stable set search_path=public
as $$ select auth.uid() is not null $$;
drop policy if exists p_eje_w on ejecutivos;
create policy p_eje_w on ejecutivos for all using (is_staff()) with check (is_staff());
drop policy if exists p_adm_w on administrativos;
create policy p_adm_w on administrativos for all using (is_staff()) with check (is_staff());
