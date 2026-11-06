V.config = async () => {
  const p = isAdmin()
    ? await q(sb.from("profiles").select("*").order("created_at"))
    : [];
  $("#main").innerHTML =
    `<div class="card"><b>Conexión</b><p id="cs" class="muted">Verificando…</p></div>` +
    (isAdmin()
      ? `<div class="card"><b>Perfiles administrativos</b>${p.map((u) => `<div class="row"><span>${esc(u.nombre || u.id.slice(0, 8))}</span><span>Administrador</span></div>`).join("")}<p class="muted">Todos los usuarios autenticados en Supabase tienen permisos administrativos.</p></div>`
      : "");
  sb.from("profiles")
    .select("id", { head: true })
    .then((r) => {
      $("#cs").textContent = r.error
        ? "Error: " + r.error.message
        : "Conectado a Supabase";
    });
};
{
  const base = V.config;
  V.config = async () => {
    await base();
    if (!isAdmin()) return;
    $("#main").insertAdjacentHTML(
      "beforeend",
      `<form class="card" id="nu"><b>Nuevo acceso</b><label>Correo<input id="ue" type="email" required></label><label>Contraseña (mín. 8)<input id="up" type="password" minlength="8" required autocomplete="new-password"></label><p class="muted">El tipo de empleado se define al agregarlo a Ejecutivos o Administrativos.</p><button class="btn pri">Crear acceso</button></form>`,
    );
    $("#nu").onsubmit = run(async (e) => {
      e.preventDefault();
      const { data, error } = await sb.functions.invoke("crear-usuario", {
        body: {
          email: $("#ue").value.trim(),
          password: $("#up").value,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error.message);
      toast("Usuario creado");
      go("config");
    });
  };
}
