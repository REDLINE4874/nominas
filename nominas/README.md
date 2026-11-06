# Nóminas semanales (PWA)
1. Supabase: crea proyecto → SQL Editor → ejecuta `database/schema.sql`.
2. Pon URL y clave **anon** en `js/config.js` (nunca la service_role).
3. Primer administrador: crea el usuario en Authentication > Users y ejecuta:
   `insert into profiles(id,nombre,rol) values('<UUID_DEL_USUARIO>','Tu nombre','administrador');`
   Los dem?s usuarios solo necesitan existir en Authentication > Users; no requieren perfil para iniciar sesi?n. El tipo de empleado se asigna al agregarlo a Ejecutivos o Administrativos.
4. Local: `npx serve .` (o `python3 -m http.server`) y abre http://localhost:3000. Para PWA en móvil se requiere HTTPS.
5. Android: Chrome > menú > Instalar app. iPhone/iPad: abrir en **Safari** > Compartir > Agregar a pantalla de inicio.
Limitaciones: sin conexión solo carga la interfaz; no se guardan ni generan datos offline. En iOS las notificaciones push no están implementadas.

## Pruebas
- Cálculos: `node tests/calc.test.cjs`
- Base de datos (schema, RLS, RPC) en Postgres local WASM: `npm i @electric-sql/pglite` y `node tests/db.test.mjs`
- UI (jsdom, Supabase simulado): `npm i jsdom` y `node tests/ui.test.mjs`

## Crear usuarios desde la app
`supabase functions deploy crear-usuario` (usa la service_role solo en el servidor). Sin desplegarla, crea usuarios en Authentication; solo los administradores necesitan perfil en `profiles`.
