V.personal = async () => {
  const [ej, ad] = await Promise.all([
    q(sb.from("ejecutivos").select("*").order("nombre")),
    q(sb.from("administrativos").select("*").order("nombre")),
  ]);
  const rows = [
    ...ej.map((r) => ({ ...r, _table: "ejecutivos", _role: "EJECUTIVO" })),
    ...ad.map((r) => ({ ...r, _table: "administrativos", _role: "ADMIN" })),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const draw = () => {
    const term = $("#qs").value.trim().toLocaleLowerCase("es"),
      filter = $("#qf").value;
    const list = rows.filter((r) => {
      if (!r.nombre.toLocaleLowerCase("es").includes(term)) return false;
      if (filter === "inactivo") return !r.activo;
      if (filter === "activo") return r.activo;
      if (filter === "ADMIN" || filter === "EJECUTIVO") return r._role === filter;
      if (filter === "BASE" || filter === "COMISIONISTA") return r.esquema === filter;
      return true;
    });
    $("#lst").innerHTML = list.length
      ? list.map((r) => {
          const category = r._role === "ADMIN"
            ? "Administrativo"
            : `${r.esquema}${r.horario ? ` · ${r.horario === "9-3" ? "9:00–3:00" : "9:00–4:00"}` : ""}`;
          return `<div class="card item"><div><b>${esc(r.nombre)}</b> ${r.activo ? "" : '<span class="tag warn">inactivo</span>'}<br><span class="muted">${category}</span></div>${canManageStaff() ? `<div class="btns"><button class="btn" data-edit="${r.id}" data-table="${r._table}">Editar</button><button class="btn" data-toggle="${r.id}" data-table="${r._table}">${r.activo ? "Dar de baja" : "Reactivar"}</button></div>` : ""}</div>`;
        }).join("")
      : '<p class="muted">No se encontraron empleados.</p>';

    document.querySelectorAll("[data-edit]").forEach((button) => {
      button.onclick = () => form(rows.find((r) => r.id === button.dataset.edit && r._table === button.dataset.table));
    });
    document.querySelectorAll("[data-toggle]").forEach((button) => {
      button.onclick = run(async () => {
        const r = rows.find((x) => x.id === button.dataset.toggle && x._table === button.dataset.table);
        await q(sb.from(r._table).update({ activo: !r.activo }).eq("id", r.id));
        toast(r.activo ? "Empleado dado de baja" : "Empleado reactivado");
        go("personal");
      });
    });
  };

  const form = (r = null) => {
    const role = r?._role || "EJECUTIVO";
    $("#dlg").innerHTML = `<form method="dialog" id="df"><h3>${r ? "Editar empleado" : "Dar de alta empleado"}</h3><label>Nombre completo<input id="fn" required maxlength="120" value="${esc(r?.nombre || "")}"></label><div class="field"><span class="field-label">Rol del empleado</span>${dropdownMarkup("fr", [["EJECUTIVO", "Ejecutivo"], ["ADMIN", "Administrativo"]], role, Boolean(r))}</div><div id="efields"><div class="field"><span class="field-label">Esquema de pago</span>${dropdownMarkup("fe", [["BASE", "Sueldo base"], ["COMISIONISTA", "Comisionista"]], r?.esquema || "BASE")}</div><div class="field" id="fhl"><span class="field-label">Turno</span>${dropdownMarkup("fh", [["9-3", "9:00 a 3:00"], ["9-4", "9:00 a 4:00"]], r?.horario || "9-3")}</div></div>${r ? '<p class="muted">El rol se conserva para mantener el historial de nómina.</p>' : ""}<div class="btns"><button type="button" class="btn" id="dc">Cancelar</button><button class="btn pri">Guardar empleado</button></div></form>`;
    initDropdowns($("#dlg"));
    const showRoleFields = () => {
      const isExecutive = $("#fr").value === "EJECUTIVO";
      $("#efields").hidden = !isExecutive;
      $("#fhl").hidden = !isExecutive || $("#fe").value !== "BASE";
    };
    $("#fr").onchange = showRoleFields;
    $("#fe").onchange = showRoleFields;
    showRoleFields();
    $("#dc").onclick = () => $("#dlg").close();
    $("#df").onsubmit = run(async (event) => {
      event.preventDefault();
      const target = r?._table || ($("#fr").value === "ADMIN" ? "administrativos" : "ejecutivos");
      const payload = { nombre: $("#fn").value.trim() };
      if (target === "ejecutivos") {
        payload.esquema = $("#fe").value;
        payload.horario = payload.esquema === "BASE" ? $("#fh").value : null;
      }
      const request = r
        ? sb.from(target).update(payload).eq("id", r.id)
        : sb.from(target).insert(payload);
      await q(request);
      $("#dlg").close();
      toast(r ? "Empleado actualizado" : "Empleado dado de alta");
      go("personal");
    });
    $("#dlg").showModal();
  };

  $("#main").innerHTML = `<div class="card row"><input id="qs" placeholder="Buscar por nombre" type="search">${dropdownMarkup("qf", [["", "Todos los roles"], ["EJECUTIVO", "Ejecutivos"], ["BASE", "Sueldo base"], ["COMISIONISTA", "Comisionistas"], ["ADMIN", "Administrativos"], ["activo", "Activos"], ["inactivo", "Inactivos"]])}${canManageStaff() ? '<button class="btn pri" id="nw">Dar de alta empleado</button>' : ""}</div><div id="lst"></div>`;
  initDropdowns($("#main"));
  $("#qs").oninput = draw;
  $("#qf").onchange = draw;
  if ($("#nw")) $("#nw").onclick = () => form();
  draw();
};
V.ejecutivos = V.personal;
V.administrativos = V.personal;
