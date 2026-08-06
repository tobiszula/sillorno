# Sillorno — contexto para retomar sesión

Léelo primero: **LEEME.md** (mismo directorio) — cómo está armado el proyecto,
panel de admin, base de datos, cómo probarlo y publicarlo.

## Qué es

Tienda de blanquería (toallas, sábanas, almohadas, frazadas, repasadores) para
un amigo del usuario. HTML/CSS/JS puro, sin build. Catálogo en Supabase
(editable desde `/admin/`), con `lib/manifest.js` como respaldo si la base no
contesta. Deploy automático: push a `main` en GitHub → Vercel.

## Cuentas y accesos

- **GitHub**: `tobiszula/sillorno` — cuenta del socio del usuario, comparten
  el laburo (uno hace pull/push, el otro también).
- **Vercel**: proyecto propio bajo esa misma identidad (`sillorno`, cuenta
  creada con "Continuar con GitHub" usando `tobiszula`). URL de producción
  definitiva: `sillorno-topaz.vercel.app` (el usuario eligió quedarse con
  este link largo, no liberar `sillorno.vercel.app`).
- **Supabase**: el usuario tiene usuario/contraseña, corre el SQL él mismo
  cuando hace falta (yo no tengo ese acceso).

## Reglas de trabajo en este repo

- **Siempre `git pull` antes de tocar nada.** El socio hace cambios en
  paralelo (agregó el panel `/admin`, Supabase, redondeo de precios). No
  asumas que tu copia local es la última.
- Los **productos y precios reales viven en Supabase en producción**, no en
  `manifest.js`. Si cambiás algo de catálogo (fotos, variantes, colores),
  puede hacer falta un SQL en `db/` además del cambio en el código — avisale
  al usuario que lo tiene que correr él.
- Bump de versión en `index.html` (`?v=YYYYMMDDx`) en cada cambio de CSS/JS.
- Fotos de producto: se extraen del PDF del proveedor con
  `tools/extract_photos.py`, o se piden por Mercado Libre vía el conector de
  Chrome (`mcp__claude-in-chrome__*`) cuando el usuario pasa un link — ML
  bloquea fetch/API directa, hace falta su sesión logueada.
- Preview local: `python3 -m http.server 8765` desde esta carpeta (el panel
  `/admin` no anda con doble clic al index.html, necesita HTTP).

## Preferencias del usuario (ver memoria para el detalle completo)

- No técnico: explicar en criollo, sin dar por sentado que entiende
  conceptos de deploy/git/DB. Chequear entendimiento antes de asumir.
- Cuida mucho los tokens/costo — sesiones deben ser cortas y enfocadas por
  tarea. No re-explicar de más ni releer archivos innecesariamente.
- Diseño: dark bordó/vino, minimalista, UX estándar (patrones que la gente
  ya conoce), mobile-first.
