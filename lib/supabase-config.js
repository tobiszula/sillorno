/* =============================================================================
   SILLORNO — conexión con la base de datos
   -----------------------------------------------------------------------------
   Acá van los dos datos del proyecto de Supabase. Se sacan de:

     supabase.com  ->  tu proyecto  ->  Settings  ->  API

     url      = "Project URL"        (https://xxxxxxxx.supabase.co)
     anonKey  = "anon public" key    (un texto larguísimo que empieza con eyJ...)

   ⚠️ La clave "anon" es pública a propósito: va en el navegador y no da
   permiso para editar nada. Quien edita es el usuario que inicia sesión en
   el panel. NUNCA pongas acá la clave "service_role".

   Si estos dos campos quedan vacíos, la web funciona igual pero con los
   productos de lib/manifest.js, como antes.
   ========================================================================== */

window.__SUPABASE__ = {
  url: "",
  anonKey: "",
};
