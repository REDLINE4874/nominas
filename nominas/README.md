# Nóminas semanales (PWA)
Para proyectos Supabase existentes, ejecuta `database/migration_control_pagos.sql` en SQL Editor para habilitar el seguimiento individual de pagos.
1. Supabase: crea proyecto → SQL Editor → ejecuta `database/schema.sql`.
2. Pon URL y clave **anon** en `js/config.js` (nunca la service_role).
3. Crea usuarios en Authentication > Users. Todo usuario autenticado tiene permisos administrativos. Para registrar su perfil opcional:
   `insert into profiles(id,nombre,rol) values('<UUID_DEL_USUARIO>','Tu nombre','administrador');`
   Los usuarios no requieren perfil para iniciar sesión. El tipo de empleado se asigna al agregarlo a Ejecutivos o Administrativos.
4. Local: `npx serve .` (o `python3 -m http.server`) y abre http://localhost:3000. Para PWA en móvil se requiere HTTPS.
5. Android: Chrome > menú > Instalar app. iPhone/iPad: abrir en **Safari** > Compartir > Agregar a pantalla de inicio.
Limitaciones: sin conexión solo carga la interfaz; no se guardan ni generan datos offline. En iOS las notificaciones push no están implementadas.

## Pruebas
- Cálculos: `node tests/calc.test.cjs`
- Base de datos (schema, RLS, RPC) en Postgres local WASM: `npm i @electric-sql/pglite` y `node tests/db.test.mjs`
- UI (jsdom, Supabase simulado): `npm i jsdom` y `node tests/ui.test.mjs`

## Crear usuarios desde la app
`supabase functions deploy crear-usuario` (usa la service_role solo en el servidor). Cualquier usuario autenticado puede crear usuarios desde la app; también es posible crearlos en Authentication. El perfil en `profiles` es opcional.

## Proyectos ya instalados
Ejecuta `database/migration_usuarios_autenticados_administradores.sql` en Supabase SQL Editor para que los RPC y las políticas que consultan `is_admin()` apliquen la misma regla a todas las sesiones autenticadas.
