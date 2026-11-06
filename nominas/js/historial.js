V.historial = async () => {
  const l = await q(
    sb
      .from("nominas")
      .select("id,created_at,periodos(inicio,fin)")
      .order("created_at", { ascending: false }),
  );
  $("#main").innerHTML =
    `<div class="card row">${dropdownMarkup("hs", [["", "Elige un periodo"], ...l.map((n) => [n.id, `${n.periodos.inicio} a ${n.periodos.fin}`])])}<input id="hq" type="search" placeholder="Buscar empleado"></div><div id="hd">${l.length ? "" : '<p class="muted">Aún no hay nóminas generadas.</p>'}</div>`;
  initDropdowns($("#main"));
  const show = run(async () => {
    const id = $("#hs").value;
    if (!id) {
      $("#hd").innerHTML = "";
      return;
    }
    let rows = await q(
      sb.from("nomina_detalle").select("*").eq("nomina_id", id).order("nombre"),
    );
    const s = $("#hq").value.toLowerCase();
    rows = rows.filter((r) => r.nombre.toLowerCase().includes(s));
    $("#hd").innerHTML =
      table(
        rows,
        (r) =>
          `<td><button class="btn" data-a="${r.id}">Cambios</button>${isAdmin() ? `<button class="btn" data-c="${r.id}">Corregir</button>` : ""}</td>`,
      ) +
      '<div class="btns"><button class="btn" id="csv">Exportar CSV</button></div><div id="aud"></div>';
    $("#csv").onclick = () => {
      const h = [
        "nombre",
        "tipo",
        "esquema",
        "horario",
        "ventas",
        "salario_base",
        "tarifa",
        "comision",
        "bonos",
        "faltas",
        "retardos",
        "descuentos",
        "pago_final",
      ];
      const c = [
        h.join(","),
        ...rows.map((r) =>
          h.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob(["\ufeff" + c], { type: "text/csv" }),
      );
      a.download = `nomina_${$("#hs").selectedOptions[0].text.slice(0, 10)}.csv`;
      a.click();
    };
    document.querySelectorAll("[data-a]").forEach(
      (b) =>
        (b.onclick = run(async () => {
          if (!isAdmin()) {
            toast("Solo administradores pueden ver la auditoría", true);
            return;
          }
          const a = await q(
            sb
              .from("nomina_auditoria")
              .select("*")
              .eq("detalle_id", b.dataset.a)
              .order("created_at"),
          );
          $("#aud").innerHTML = a.length
            ? a
                .map(
                  (x) =>
                    `<div class="card"><b>${new Date(x.created_at).toLocaleString("es-MX")}</b> · ${esc(x.motivo)}<br><span class="muted">Antes: pago ${mxn(x.anterior.pago_final)}, ventas ${x.anterior.ventas}, bonos ${x.anterior.bonos}, faltas ${x.anterior.faltas}, retardos ${x.anterior.retardos}<br>Ahora: pago ${mxn(x.nuevo.pago_final)}, ventas ${x.nuevo.ventas}, bonos ${x.nuevo.bonos}, faltas ${x.nuevo.faltas}, retardos ${x.nuevo.retardos}</span></div>`,
                )
                .join("")
            : '<p class="muted">Sin correcciones.</p>';
        })),
    );
    document.querySelectorAll("[data-c]").forEach(
      (b) =>
        (b.onclick = () => {
          const r = rows.find((x) => x.id === b.dataset.c),
            ad = r.tipo === "ADMIN";
          const f = (id, l, v, st = 1) =>
            `<label>${l}<input id="${id}" type="number" inputmode="decimal" min="0" step="${st}" value="${v}"></label>`;
          $("#dlg").innerHTML =
            `<form method="dialog" id="cf"><h3>Corregir: ${esc(r.nombre)}</h3>${f("cv", "Ventas", r.ventas)}${ad ? f("cs", "Salario base", r.salario_base, "0.01") : f("cb", "Bonos", r.bonos, "0.01") + f("cf2", "Faltas", r.faltas) + f("cr", "Retardos", r.retardos)}<label>Motivo (obligatorio)<input id="cm" required></label><div class="btns"><button type="button" class="btn" id="cc">Cancelar</button><button class="btn pri">Guardar</button></div></form>`;
          $("#cc").onclick = () => $("#dlg").close();
          $("#cf").onsubmit = run(async () => {
            const n = (id) => ($(id) ? Number($(id).value) : 0),
              mo = $("#cm").value.trim();
            if (!mo) throw new Error("El motivo es obligatorio");
            const v = n("#cv"),
              vals = [v, n("#cb"), n("#cf2"), n("#cr"), n("#cs")];
            if (
              !Number.isInteger(v) ||
              !Number.isInteger(vals[2]) ||
              !Number.isInteger(vals[3]) ||
              vals.some((x) => !(x >= 0))
            )
              throw new Error("Valores inválidos");
            await q(
              sb.rpc("corregir_detalle", {
                p_detalle: r.id,
                p_ventas: v,
                p_bonos: vals[1],
                p_faltas: vals[2],
                p_retardos: vals[3],
                p_salario: vals[4],
                p_motivo: mo,
              }),
            );
            $("#dlg").close();
            toast("Corrección guardada");
            show();
          });
          $("#dlg").showModal();
        }),
    );
  });
  $("#hs").onchange = show;
  $("#hq").oninput = show;
};
