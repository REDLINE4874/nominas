(async () => {
  const out = (e) => location.replace("login.html" + (e ? "?e=" + e : ""));
  if (!sb) return out("cfg");
  const { data } = await sb.auth.getSession();
  const session = data.session;
  if (!session) return out();
  S.authenticated = true;
  $("#logout").onclick = async () => {
    await sb.auth.signOut();
    out();
  };
  sb.auth.onAuthStateChange((e) => {
    if (e === "SIGNED_OUT") out();
  });
  let p = null;
  try {
    p = await q(
      sb
        .from("profiles")
        .select("rol")
        .eq("id", session.user.id)
        .maybeSingle(),
    );
  } catch {
    // Sin perfil o si no se puede consultar, la sesi?n de Auth basta para entrar.
  }
  try {
    // El perfil define permisos administrativos, pero no es requisito para entrar.
    S.rol = p?.rol || "operador";
    $("#app").hidden = false;
    go(S.view);
  } catch (e) {
    toast(e.message, true);
  }
})();
