-- Ejecutar completo en Supabase > SQL Editor
create table profiles(id uuid primary key references auth.users on delete cascade, nombre text, rol text not null default 'administrador' check(rol in('administrador','operador')), created_at timestamptz default now());
create table ejecutivos(id uuid primary key default gen_random_uuid(), nombre text not null check(length(trim(nombre))>0), esquema text not null check(esquema in('BASE','COMISIONISTA')), horario text check(horario in('9-3','9-4')), activo boolean not null default true, created_at timestamptz default now(), updated_at timestamptz default now(),
 check((esquema='BASE' and horario is not null) or (esquema='COMISIONISTA' and horario is null)));
create table administrativos(id uuid primary key default gen_random_uuid(), nombre text not null check(length(trim(nombre))>0), activo boolean not null default true, created_at timestamptz default now(), updated_at timestamptz default now());
create table periodos(id uuid primary key default gen_random_uuid(), inicio date not null unique check(extract(isodow from inicio)=1), fin date generated always as (inicio+6) stored);
create table mov_ejecutivos(id uuid primary key default gen_random_uuid(), periodo_id uuid not null references periodos, ejecutivo_id uuid not null references ejecutivos, ventas int not null default 0 check(ventas>=0), bonos numeric(12,2) not null default 0 check(bonos>=0), faltas int not null default 0 check(faltas>=0), retardos int not null default 0 check(retardos>=0), updated_at timestamptz default now(), unique(periodo_id,ejecutivo_id));
create table mov_administrativos(id uuid primary key default gen_random_uuid(), periodo_id uuid not null references periodos, admin_id uuid not null references administrativos, ventas int not null default 0 check(ventas>=0), salario_base numeric(12,2) not null default 0 check(salario_base>=0), updated_at timestamptz default now(), unique(periodo_id,admin_id));
create table nominas(id uuid primary key default gen_random_uuid(), periodo_id uuid not null unique references periodos, generado_por uuid not null references auth.users, created_at timestamptz default now());
create table nomina_detalle(id uuid primary key default gen_random_uuid(), nomina_id uuid not null references nominas on delete cascade, tipo text not null check(tipo in('EJECUTIVO','ADMIN')), empleado_id uuid not null, nombre text not null, esquema text, horario text, salario_base numeric(12,2) not null, ventas int not null, tarifa numeric(12,2) not null, comision numeric(12,2) not null, bonos numeric(12,2) not null default 0, faltas int not null default 0, retardos int not null default 0, descuentos numeric(12,2) not null default 0, excedente_descuento numeric(12,2) not null default 0, pago_final numeric(12,2) not null, corregido boolean not null default false, pagado boolean not null default false);
create table nomina_auditoria(id uuid primary key default gen_random_uuid(), detalle_id uuid not null references nomina_detalle, usuario uuid not null, motivo text not null check(length(trim(motivo))>0), anterior jsonb not null, nuevo jsonb not null, created_at timestamptz default now());
create index on nomina_detalle(nomina_id); create index on mov_ejecutivos(periodo_id); create index on mov_administrativos(periodo_id); create index on nomina_auditoria(detalle_id);

create function touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger t1 before update on ejecutivos for each row execute function touch();
create trigger t2 before update on administrativos for each row execute function touch();
create trigger t3 before update on mov_ejecutivos for each row execute function touch();
create trigger t4 before update on mov_administrativos for each row execute function touch();

create function is_staff() returns boolean language sql security definer stable set search_path=public as $$ select auth.uid() is not null $$;
create function is_admin() returns boolean language sql security definer stable set search_path=public as $$ select auth.uid() is not null $$;

create function lock_mov() returns trigger language plpgsql as $$ begin
 if exists(select 1 from nominas where periodo_id=coalesce(new.periodo_id,old.periodo_id)) then raise exception 'El periodo ya tiene nómina generada'; end if; return coalesce(new,old); end $$;
create trigger l1 before insert or update or delete on mov_ejecutivos for each row execute function lock_mov();
create trigger l2 before insert or update or delete on mov_administrativos for each row execute function lock_mov();

create function calc_ejecutivo(p_esq text,p_hor text,p_v int,p_b numeric,p_f int,p_r int)
returns table(salario numeric,tarifa numeric,comision numeric,descuentos numeric,excedente numeric,pago numeric) language sql immutable as $$
 with t as(select case when p_esq='BASE' then case when p_hor='9-4' then 1600 else 1300 end else 0 end as s,
  case when p_esq='COMISIONISTA' then 400 when p_v>=10 then 350 when p_v>=8 then 200 when p_v>=6 then 150 when p_v>=3 then 100 when p_v>=1 then 50 else 0 end as tf),
 u as(select s,tf,tf*p_v as c,p_f*200+p_r*50 as d, s+tf*p_v+p_b as pos from t)
 select s::numeric,tf::numeric,c::numeric,d::numeric,greatest(0,d-pos)::numeric,greatest(0,pos-d)::numeric from u $$;

create function get_periodo(p_fecha date) returns uuid language plpgsql security definer set search_path=public as $$
declare v date:=p_fecha-(extract(isodow from p_fecha)::int-1); r uuid; begin
 if not is_staff() then raise exception 'Sin permisos'; end if;
 insert into periodos(inicio) values(v) on conflict(inicio) do nothing; select id into r from periodos where inicio=v; return r; end $$;

create function generar_nomina(p_periodo uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare n uuid; faltan int; begin
 if not is_admin() then raise exception 'Sin permisos'; end if;
 perform 1 from periodos where id=p_periodo for update; if not found then raise exception 'Periodo inexistente'; end if;
 if exists(select 1 from nominas where periodo_id=p_periodo) then raise exception 'Ya existe nómina para este periodo'; end if;
 select (select count(*) from ejecutivos e where activo and not exists(select 1 from mov_ejecutivos m where m.ejecutivo_id=e.id and m.periodo_id=p_periodo))
      + (select count(*) from administrativos a where activo and not exists(select 1 from mov_administrativos m where m.admin_id=a.id and m.periodo_id=p_periodo)) into faltan;
 if faltan>0 then raise exception 'Faltan movimientos de % empleado(s) activo(s)',faltan; end if;
 if not exists(select 1 from mov_ejecutivos where periodo_id=p_periodo) and not exists(select 1 from mov_administrativos where periodo_id=p_periodo) then raise exception 'No hay movimientos'; end if;
 insert into nominas(periodo_id,generado_por) values(p_periodo,auth.uid()) returning id into n;
 insert into nomina_detalle(nomina_id,tipo,empleado_id,nombre,esquema,horario,salario_base,ventas,tarifa,comision,bonos,faltas,retardos,descuentos,excedente_descuento,pago_final)
 select n,'EJECUTIVO',e.id,e.nombre,e.esquema,e.horario,c.salario,m.ventas,c.tarifa,c.comision,m.bonos,m.faltas,m.retardos,c.descuentos,c.excedente,c.pago
 from mov_ejecutivos m join ejecutivos e on e.id=m.ejecutivo_id and e.activo, lateral calc_ejecutivo(e.esquema,e.horario,m.ventas,m.bonos,m.faltas,m.retardos) c where m.periodo_id=p_periodo;
 insert into nomina_detalle(nomina_id,tipo,empleado_id,nombre,salario_base,ventas,tarifa,comision,pago_final)
 select n,'ADMIN',a.id,a.nombre,m.salario_base,m.ventas,400,m.ventas*400,m.salario_base+m.ventas*400
 from mov_administrativos m join administrativos a on a.id=m.admin_id and a.activo where m.periodo_id=p_periodo;
 return n; end $$;

create function corregir_detalle(p_detalle uuid,p_ventas int,p_bonos numeric,p_faltas int,p_retardos int,p_salario numeric,p_motivo text) returns void language plpgsql security definer set search_path=public as $$
declare d nomina_detalle; c record; old jsonb; begin
 if not is_admin() then raise exception 'Sin permisos'; end if;
 if p_motivo is null or length(trim(p_motivo))=0 then raise exception 'El motivo es obligatorio'; end if;
 if least(p_ventas,p_faltas,p_retardos)<0 or least(p_bonos,p_salario)<0 then raise exception 'Valores inválidos'; end if;
 select * into d from nomina_detalle where id=p_detalle for update; if not found then raise exception 'Detalle inexistente'; end if;
 old:=to_jsonb(d);
 if d.tipo='EJECUTIVO' then
  select * into c from calc_ejecutivo(d.esquema,d.horario,p_ventas,p_bonos,p_faltas,p_retardos);
  update nomina_detalle set ventas=p_ventas,bonos=p_bonos,faltas=p_faltas,retardos=p_retardos,salario_base=c.salario,tarifa=c.tarifa,comision=c.comision,descuentos=c.descuentos,excedente_descuento=c.excedente,pago_final=c.pago,corregido=true where id=p_detalle;
 else
  update nomina_detalle set ventas=p_ventas,salario_base=p_salario,comision=p_ventas*400,pago_final=p_salario+p_ventas*400,corregido=true where id=p_detalle;
 end if;
 insert into nomina_auditoria(detalle_id,usuario,motivo,anterior,nuevo) select p_detalle,auth.uid(),p_motivo,old,to_jsonb(x) from nomina_detalle x where id=p_detalle; end $$;
create function marcar_detalle_pagado(p_detalle uuid,p_pagado boolean) returns void language plpgsql security definer set search_path=public as $$ begin
 if not is_staff() then raise exception 'Sin permisos'; end if;
 update nomina_detalle set pagado=p_pagado where id=p_detalle;
 if not found then raise exception 'Detalle inexistente'; end if;
end $$;
revoke all on function generar_nomina(uuid),corregir_detalle(uuid,int,numeric,int,int,numeric,text),get_periodo(date),marcar_detalle_pagado(uuid,boolean) from public;
grant execute on function generar_nomina(uuid),corregir_detalle(uuid,int,numeric,int,int,numeric,text),get_periodo(date),marcar_detalle_pagado(uuid,boolean) to authenticated;

alter table profiles enable row level security; alter table ejecutivos enable row level security; alter table administrativos enable row level security; alter table periodos enable row level security;
alter table mov_ejecutivos enable row level security; alter table mov_administrativos enable row level security; alter table nominas enable row level security; alter table nomina_detalle enable row level security; alter table nomina_auditoria enable row level security;
create policy p_prof_sel on profiles for select using(id=auth.uid() or is_admin());
create policy p_prof_w on profiles for all using(is_admin()) with check(is_admin());
create policy p_eje_sel on ejecutivos for select using(is_staff()); create policy p_eje_w on ejecutivos for all using(is_staff()) with check(is_staff());
create policy p_adm_sel on administrativos for select using(is_staff()); create policy p_adm_w on administrativos for all using(is_staff()) with check(is_staff());
create policy p_per_sel on periodos for select using(is_staff());
create policy p_me_all on mov_ejecutivos for all using(is_staff()) with check(is_staff());
create policy p_ma_all on mov_administrativos for all using(is_staff()) with check(is_staff());
create policy p_nom_sel on nominas for select using(is_staff()); create policy p_det_sel on nomina_detalle for select using(is_staff());
create policy p_aud_sel on nomina_auditoria for select using(is_admin());
