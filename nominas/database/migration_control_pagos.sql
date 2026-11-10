-- Ejecutar en Supabase SQL Editor para habilitar el seguimiento individual de pagos.
alter table nomina_detalle add column if not exists pagado boolean not null default false;

create or replace function marcar_detalle_pagado(p_detalle uuid,p_pagado boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_staff() then raise exception 'Sin permisos'; end if;
 update nomina_detalle set pagado=p_pagado where id=p_detalle;
 if not found then raise exception 'Detalle inexistente'; end if;
end $$;

revoke all on function marcar_detalle_pagado(uuid,boolean) from public;
grant execute on function marcar_detalle_pagado(uuid,boolean) to authenticated;
