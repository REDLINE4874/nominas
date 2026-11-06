V.movimientos = async () => {
  await setPid();
  const nom = await q(
    sb.from("nominas").select("id").eq("periodo_id", S.pid).maybeSingle(),
  );
  const [ej, ad, me, ma] = await Promise.all([
    q(sb.from("ejecutivos").select("*").eq("activo", true).order("nombre")),
    q(sb.from("administrativos").select("*").eq("activo", true).order("nombre")),
    q(sb.from("mov_ejecutivos").select("*").eq("periodo_id", S.pid)),
    q(sb.from("mov_administrativos").select("*").eq("periodo_id", S.pid)),
  ]);
  const input = (key, value, step = "1") =>
    `<label>${key}<input type="number" inputmode="decimal" min="0" step="${step}" data-k="${key}" value="${value}" ${nom ? "disabled" : ""}></label>`;
  const executiveCards = ej.map((employee) => {
    const movement = me.find((row) => row.ejecutivo_id === employee.id) || {};
    return `<article class="card mov" data-t="e" data-id="${employee.id}"><div class="mov-heading"><b>${esc(employee.nombre)}</b><span class="mov-role">${esc(employee.esquema)}${employee.horario ? ` · ${employee.horario}` : ""}</span></div><div class="f4">${input("Ventas", movement.ventas ?? 0)}${input("Bonos", movement.bonos ?? 0, "0.01")}${input("Faltas", movement.faltas ?? 0)}${input("Retardos", movement.retardos ?? 0)}</div></article>`;
  }).join("");
  const administrativeCards = ad.map((employee) => {
    const movement = ma.find((row) => row.admin_id === employee.id) || {};
    return `<article class="card mov" data-t="a" data-id="${employee.id}"><div class="mov-heading"><b>${esc(employee.nombre)}</b><span class="mov-role">Administrativo</span></div><div class="f4">${input("Ventas", movement.ventas ?? 0)}${input("Salario base", movement.salario_base ?? 0, "0.01")}</div></article>`;
  }).join("");
  const count = ej.length + ad.length;
  $("#main").innerHTML =
    weekBar() +
    (nom ? '<p class="tag warn">Esta nómina ya fue generada; la captura está bloqueada.</p>' : '<p class="muted">Captura los datos de todos los empleados activos y guarda la semana una sola vez.</p>') +
    `<section class="capture-group"><h3>Ejecutivos</h3>${executiveCards || '<p class="muted">Sin ejecutivos activos.</p>'}</section>` +
    `<section class="capture-group"><h3>Administrativos</h3>${administrativeCards || '<p class="muted">Sin administrativos activos.</p>'}</section>` +
    (!nom && count ? `<button class="btn pri save-all" id="save-all">Guardar captura de la semana <span>${count}</span></button>` : "");
  bindWeek();
  const save = $("#save-all");
  if (!save) return;
  save.onclick = run(async () => {
    const executiveRows = [], administrativeRows = [];
    document.querySelectorAll(".mov").forEach((card) => {
      const read = (key) => Number(card.querySelector(`[data-k="${key}"]`).value),
        integer = (key) => {
          const value = read(key);
          if (!Number.isInteger(value) || value < 0) throw new Error(`${key} debe ser entero no negativo`);
          return value;
        },
        amount = (key) => {
          const value = read(key);
          if (!Number.isFinite(value) || value < 0) throw new Error(`${key} debe ser un importe no negativo`);
          return value;
        };
      if (card.dataset.t === "e") {
        executiveRows.push({ periodo_id: S.pid, ejecutivo_id: card.dataset.id, ventas: integer("Ventas"), bonos: amount("Bonos"), faltas: integer("Faltas"), retardos: integer("Retardos") });
      } else {
        administrativeRows.push({ periodo_id: S.pid, admin_id: card.dataset.id, ventas: integer("Ventas"), salario_base: amount("Salario base") });
      }
    });
    save.disabled = true;
    const writes = [];
    if (executiveRows.length) writes.push(q(sb.from("mov_ejecutivos").upsert(executiveRows, { onConflict: "periodo_id,ejecutivo_id" })));
    if (administrativeRows.length) writes.push(q(sb.from("mov_administrativos").upsert(administrativeRows, { onConflict: "periodo_id,admin_id" })));
    try {
      await Promise.all(writes);
    } catch (error) {
      save.disabled = false;
      throw error;
    }
    toast("Captura semanal guardada");
    go("movimientos");
  });
};
