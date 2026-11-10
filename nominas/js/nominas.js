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
    table(
      rows,
      nom
        ? (r) =>
            `<button class="btn" data-paid="${r.id}" data-value="${!r.pagado}">${r.pagado ? "Pagado" : "Pagar"}</button>`
        : null,
      nom
        ? (r) =>
            `<button class="btn payroll-pay-inline" data-paid="${r.id}" data-value="${!r.pagado}">${r.pagado ? "Pagado" : "Pagar"}</button>`
        : null,
    ) +
    `<div class="card payroll-total"><b>Total de nómina: ${mxn(tot)}</b><span>${rows.length} empleado(s)</span></div>` +
    (!nom && isAdmin()
      ? '<button class="btn pri" id="gen">Generar nómina</button>'
      : "");
  bindWeek();
  document.querySelectorAll("[data-paid]").forEach(
    (b) =>
      (b.onclick = run(async () => {
        await q(
          sb.rpc("marcar_detalle_pagado", {
            p_detalle: b.dataset.paid,
            p_pagado: b.dataset.value === "true",
          }),
        );
        const paid = b.dataset.value === "true";
        const row = b.closest("tr");
        if (row) {
          row.classList.toggle("payroll-paid", paid);
          const name = row.querySelector('[data-col="name"]');
          let tag = name?.querySelector(".paid-tag");
          if (paid && name && !tag) {
            tag = document.createElement("span");
            tag.className = "tag paid-tag";
            tag.textContent = "Pagado";
            name.append(" ", tag);
          } else if (!paid) {
            tag?.remove();
          }
        }
        document.querySelectorAll(`[data-paid="${CSS.escape(b.dataset.paid)}"]`).forEach((button) => {
          button.dataset.value = String(!paid);
          button.textContent = paid ? "Pagado" : "Pagar";
          button.setAttribute("aria-pressed", String(paid));
        });
        toast(paid ? "Pago registrado" : "Pago desmarcado");
      })),
  );
  if ($("#gen"))
    $("#gen").onclick = run(async () => {
      if (!confirm("¿Generar la nómina de esta semana? No se puede duplicar."))
        return;
      await q(sb.rpc("generar_nomina", { p_periodo: S.pid }));
      toast("Nómina generada");
      go("nomina");
    });
};
