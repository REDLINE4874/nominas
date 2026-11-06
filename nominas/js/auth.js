(async () => {
  const out = (e) => location.replace("login.html" + (e ? "?e=" + e : ""));
  if (!sb) return out("cfg");
  const { data } = await sb.auth.getSession();
  const session = data.session;
  if (!session) return out();
  S.authenticated = true;
  S.rol = "administrador";
  $("#logout").onclick = async () => {
    await sb.auth.signOut();
    out();
  };
  sb.auth.onAuthStateChange((e) => {
    if (e === "SIGNED_OUT") out();
  });
  try {
    $("#app").hidden = false;
    go(S.view);
  } catch (e) {
    toast(e.message, true);
  }
})();
