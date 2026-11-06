-- Ejecutar en Supabase SQL Editor para proyectos ya instalados.
-- Toda sesión autenticada se considera administrativa en la aplicación.
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path=public
as $$ select auth.uid() is not null $$;

alter table profiles alter column rol set default 'administrador';
update profiles set rol='administrador' where rol<>'administrador';
