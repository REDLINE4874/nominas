V.nomina = async () => {
  const { nom, rows, pend } = await periodData();
  const tot = rows.reduce((a, r) => a + +r.pago_final, 0);
  $("#main").innerHTML =
    weekBar() +
    `<div class="payroll-title"><h2>Nómina semanal</h2></div>` +
    `<p>${nom ? '<span class="tag">Nómina generada</span>' : '<span class="tag warn">Vista previa (no guardada)</span>'}</p>` +
    (pend && (pend.ej || pend.ad)
      ? `<p class="tag warn">Faltan movimientos: ${pend.ej} ejecutivo(s), ${pend.ad} administrativo(s).</p>`
      : "") +
    table(rows) +
    `<div class="card payroll-total"><b>Total de nómina: ${mxn(tot)}</b><span>${rows.length} empleado(s)</span></div>` +
    (!nom && isAdmin()
      ? '<button class="btn pri" id="gen">Generar nómina</button>'
      : "");
  bindWeek();
  if ($("#gen"))
    $("#gen").onclick = run(async () => {
      if (!confirm("¿Generar la nómina de esta semana? No se puede duplicar."))
        return;
      await q(sb.rpc("generar_nomina", { p_periodo: S.pid }));
      toast("Nómina generada");
      go("nomina");
    });
};
