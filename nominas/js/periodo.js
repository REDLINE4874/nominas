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
const table = (rows, extra) => {
  if (!rows.length) return '<p class="muted">Aún no hay empleados en esta nómina.</p>';
  const groups = [
    ["BASE", "SUELDO BASE"],
    ["COMISIONISTA", "COMISIONISTA"],
    ["ADMIN", "ADMINISTRATIVOS"],
  ];
  const body = groups.map(([key, label]) => {
    const list = rows.filter((r) => (r.tipo === "ADMIN" ? "ADMIN" : r.esquema) === key);
    if (!list.length) return "";
    return `<tr class="payroll-section"><th colspan="${extra ? 14 : 13}">${label}</th></tr>${list.map((r, i) => `<tr><td data-col="number">${i + 1}</td><td data-col="name"><b>${esc(r.nombre)}</b>${r.corregido ? ' <span class="tag">corregida</span>' : ""}</td><td data-col="shift">${r.tipo === "ADMIN" ? "Administrativo" : esc(r.horario || r.esquema)}</td><td data-col="base">${mxn(r.salario_base)}</td><td data-col="bonus">${mxn(r.bonos)}</td><td data-col="absence">${r.faltas}</td><td data-col="tardy">${r.retardos}</td><td data-col="sales">${r.ventas}</td><td data-col="rate">${mxn(r.tarifa)}</td><td data-col="commission">${mxn(r.comision)}</td><td data-col="discount">${mxn(r.descuentos)}</td><td data-col="excess">${+r.excedente_descuento > 0 ? mxn(r.excedente_descuento) : "—"}</td><td data-col="total"><b>${mxn(r.pago_final)}</b></td>${extra ? extra(r) : ""}</tr>`).join("")}`;
  }).join("");
  return `<div class="scroll payroll ${extra ? "has-actions" : ""}"><table><thead><tr><th data-col="number">#</th><th data-col="name">Empleado</th><th data-col="shift">Turno</th><th data-col="base">Sueldo base</th><th data-col="bonus">Bonos</th><th data-col="absence">Faltas</th><th data-col="tardy">Retardos</th><th data-col="sales">Ventas</th><th data-col="rate">Tarifa</th><th data-col="commission">Comisión</th><th data-col="discount">Descuento</th><th data-col="excess">Exceso</th><th data-col="total">Total</th>${extra ? "<th>Acciones</th>" : ""}</tr></thead><tbody>${body}</tbody></table></div>`;
};
const sum = (rows, t) =>
  rows
    .filter((r) => r.tipo === t)
    .reduce((a, r) => ({ v: a.v + r.ventas, p: a.p + +r.pago_final }), {
      v: 0,
      p: 0,
    });
const V = {};
