async function periodData() {
  await setPid();
  const nom = await q(
    sb
      .from("nominas")
      .select("id,created_at")
      .eq("periodo_id", S.pid)
      .maybeSingle(),
  );
  if (nom) {
    const rows = await q(
      sb
        .from("nomina_detalle")
        .select("*")
        .eq("nomina_id", nom.id)
        .order("nombre"),
    );
    return { nom, rows };
  }
  const [ej, ad, me, ma] = await Promise.all([
    q(sb.from("ejecutivos").select("*").eq("activo", true).order("nombre")),
    q(
      sb.from("administrativos").select("*").eq("activo", true).order("nombre"),
    ),
    q(sb.from("mov_ejecutivos").select("*").eq("periodo_id", S.pid)),
    q(sb.from("mov_administrativos").select("*").eq("periodo_id", S.pid)),
  ]);
  const rows = [];
  ej.forEach((e) => {
    const m = me.find((x) => x.ejecutivo_id === e.id);
    const mov = m || { ventas: 0, bonos: 0, faltas: 0, retardos: 0 };
    const c = calcEjecutivo({ ...e, ...mov, bonos: +mov.bonos });
    rows.push({
      tipo: "EJECUTIVO",
      nombre: e.nombre,
      esquema: e.esquema,
      horario: e.horario,
      ventas: mov.ventas,
      salario_base: c.salario,
      tarifa: c.tarifa,
      comision: c.comision,
      bonos: +mov.bonos,
      faltas: mov.faltas,
      retardos: mov.retardos,
      descuentos: c.descuentos,
      excedente_descuento: c.excedente,
      pago_final: c.pago,
    });
  });
  ad.forEach((a) => {
    const m = ma.find((x) => x.admin_id === a.id);
    const mov = m || { ventas: 0, salario_base: 0 };
    const c = calcAdmin({ ventas: mov.ventas, salario_base: +mov.salario_base });
    rows.push({
      tipo: "ADMIN",
      nombre: a.nombre,
      ventas: mov.ventas,
      salario_base: c.salario,
      tarifa: 400,
      comision: c.comision,
      bonos: 0,
      faltas: 0,
      retardos: 0,
      descuentos: 0,
      excedente_descuento: 0,
      pago_final: c.pago,
    });
  });
  return {
    nom: null,
    rows,
    pend: {
      ej: ej.filter((e) => !me.some((x) => x.ejecutivo_id === e.id)).length,
      ad: ad.filter((a) => !ma.some((x) => x.admin_id === a.id)).length,
    },
    act: { ej: ej.length, ad: ad.length },
  };
}
const table = (rows, extra, mobileExtra) => {
  if (!rows.length) return '<p class="muted">Aún no hay empleados en esta nómina.</p>';
  const groups = [
    ["BASE", "SUELDO BASE"],
    ["COMISIONISTA", "COMISIONISTA"],
    ["ADMIN", "ADMINISTRATIVOS"],
  ];
  const body = groups.map(([key, label]) => {
    const list = rows.filter((r) => (r.tipo === "ADMIN" ? "ADMIN" : r.esquema) === key);
    if (!list.length) return "";
    return `<tr class="payroll-section"><th colspan="${extra ? 15 : 14}">${label}</th></tr>${list.map((r, i) => `<tr class="${r.pagado ? "payroll-paid" : ""}"><td data-col="number">${i + 1}</td><td data-col="name"><b>${esc(r.nombre)}</b>${r.pagado ? ' <span class="tag paid-tag">Pagado</span>' : ""}${r.corregido ? ' <span class="tag">corregida</span>' : ""}</td><td data-col="shift">${r.tipo === "ADMIN" ? "Administrativo" : esc(r.horario || r.esquema)}</td><td data-col="base">${mxnWhole(r.salario_base)}</td><td data-col="bonus">${mxn(r.bonos)}</td><td data-col="absence">${r.faltas}</td><td data-col="tardy">${r.retardos}</td><td data-col="sales">${r.ventas}</td><td data-col="rate">${mxn(r.tarifa)}</td><td data-col="commission">${mxn(r.comision)}</td><td data-col="discount">${mxn(r.descuentos)}</td><td data-col="excess">${+r.excedente_descuento > 0 ? mxn(r.excedente_descuento) : "—"}</td><td data-col="total"><b>${mxnWhole(r.pago_final)}</b></td><td data-col="details"><span class="payroll-row-actions"><button type="button" class="payroll-detail-btn" data-payroll-detail data-name="${esc(r.nombre)}" data-type="${esc(r.tipo)}" data-scheme="${esc(r.esquema || "")}" data-shift="${esc(r.horario || "")}" data-base="${mxnWhole(r.salario_base)}" data-bonus="${mxn(r.bonos)}" data-absence="${esc(r.faltas)}" data-tardy="${esc(r.retardos)}" data-sales="${esc(r.ventas)}" data-rate="${mxn(r.tarifa)}" data-commission="${mxn(r.comision)}" data-discount="${mxn(r.descuentos)}" data-excess="${+r.excedente_descuento > 0 ? mxn(r.excedente_descuento) : "—"}" aria-label="Ver detalle de ${esc(r.nombre)}">Detalle</button>${mobileExtra ? mobileExtra(r) : ""}</span></td>${extra ? `<td data-col="actions">${extra(r)}</td>` : ""}</tr>${extra && !mobileExtra ? `<tr class="payroll-mobile-actions"><td colspan="15">${extra(r)}</td></tr>` : ""}`).join("")}`;
  }).join("");
  return `<div class="scroll payroll ${extra ? "has-actions" : ""}"><table><thead><tr><th data-col="number">#</th><th data-col="name">Empleado</th><th data-col="shift">Turno</th><th data-col="base">Sueldo base</th><th data-col="bonus">Bonos</th><th data-col="absence">Faltas</th><th data-col="tardy">Retardos</th><th data-col="sales">Ventas</th><th data-col="rate">Bracket</th><th data-col="commission">Comisión</th><th data-col="discount">Descuento</th><th data-col="excess">Exceso</th><th data-col="total">Total</th><th data-col="details"></th>${extra ? "<th data-col=\"actions\">Acciones</th>" : ""}</tr></thead><tbody>${body}</tbody></table></div>`;
};
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-payroll-detail]");
  if (!button) return;
  const fields = [
    ["Tipo", button.dataset.type === "ADMIN" ? "Administrativo" : "Ejecutivo"],
    ...(button.dataset.scheme ? [["Esquema", button.dataset.scheme]] : []),
    ...(button.dataset.shift ? [["Turno", button.dataset.shift]] : []),
    ["Sueldo base", button.dataset.base], ["Bonos", button.dataset.bonus],
    ["Faltas", button.dataset.absence], ["Retardos", button.dataset.tardy],
    ["Ventas", button.dataset.sales], ["Bracket", button.dataset.rate],
    ["Comisión", button.dataset.commission], ["Descuento", button.dataset.discount],
    ["Exceso de descuento", button.dataset.excess],
  ];
  $("#dlg").innerHTML = `<section class="payroll-detail"><h2>Detalle de ${esc(button.dataset.name)}</h2><div class="payroll-detail-grid">${fields.map(([label, value]) => `<div><span>${label}</span><b>${esc(value)}</b></div>`).join("")}</div><button type="button" class="btn pri" id="closePayrollDetail">Cerrar</button></section>`;
  $("#closePayrollDetail").onclick = () => $("#dlg").close();
  $("#dlg").showModal();
});
const sum = (rows, t) =>
  rows
    .filter((r) => r.tipo === t)
    .reduce((a, r) => ({ v: a.v + r.ventas, p: a.p + +r.pago_final }), {
      v: 0,
      p: 0,
    });
const V = {};
