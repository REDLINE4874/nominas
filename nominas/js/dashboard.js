V.dashboard = async () => {
  const { nom, rows, act } = await periodData();
  const e = sum(rows, "EJECUTIVO"),
    a = sum(rows, "ADMIN");
  const ne = act ? act.ej : rows.filter((r) => r.tipo === "EJECUTIVO").length,
    na = act ? act.ad : rows.filter((r) => r.tipo === "ADMIN").length;
  $("#main").innerHTML =
    weekBar() +
    `${nom ? '<p class="muted">Nómina generada</p>' : ""}<div class="grid">${[
      ["Ejecutivos" + (act ? " activos" : " en nómina"), ne],
      ["Administrativos" + (act ? " activos" : " en nómina"), na],
      ["Ventas ejecutivos", e.v],
      ["Ventas administrativos", a.v],
      ["Total ventas", e.v + a.v],
      ["Nómina ejecutivos", mxn(e.p)],
      ["Nómina administrativos", mxn(a.p)],
      ["Total nómina", mxn(e.p + a.p)],
    ]
      .map(
        ([k, v]) =>
          `<div class="card stat"><span class="muted">${k}</span><b>${v}</b></div>`,
      )
      .join("")}</div>`;
  bindWeek();
};
