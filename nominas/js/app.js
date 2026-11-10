document
  .querySelectorAll("[data-v]")
  .forEach((b) => (b.onclick = () => go(b.dataset.v)));
const go = run(async (v) => {
  S.view = v;
  $("#main").classList.toggle("capture-page", v === "movimientos");
  $("#main").classList.toggle("payroll-page", v === "nomina");
  $("#main").classList.toggle("history-page", v === "historial");
  document
    .querySelectorAll("[data-v]")
    .forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  $("#main").innerHTML = '<p class="muted">Cargando…</p>';
  await V[v]();
});
const weekLabel = (weekStart) => {
  const start = new Date(weekStart + "T00:00:00"), end = new Date(start);
  end.setDate(end.getDate() + 6);
  const options = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("es-MX", options)} - ${end.toLocaleDateString("es-MX", { ...options, year: "numeric" })}`;
};
const weekBar = () =>
  `<div class="card week-picker ${S.view === "nomina" ? "payroll-week-sticky" : S.view === "movimientos" ? "capture-week-sticky" : ""}"><button type="button" class="week-arrow" id="wkprev" aria-label="Semana anterior"><span>&#x2039;</span></button><div class="week-current"><span>SEMANA DE PRODUCCI&Oacute;N</span><b>${weekLabel(S.week)}</b></div><button type="button" class="week-today" id="wktoday">Semana Actual</button><button type="button" class="week-arrow" id="wknext" aria-label="Semana siguiente" ${S.week >= lastClosedWeek() ? "disabled" : ""}><span>&#x203a;</span></button></div>`;
const bindWeek = () => {
  const shiftWeek = (amount) => {
    const d = new Date(S.week + "T00:00:00");
    d.setDate(d.getDate() + amount * 7);
    const target = fmt(d);
    if (target > lastClosedWeek()) return;
    S.week = target;
    go(S.view);
  };
  $("#wkprev").onclick = () => shiftWeek(-1);
  $("#wknext").onclick = () => shiftWeek(1);
  $("#wktoday").onclick = () => {
    S.week = lastClosedWeek();
    go(S.view);
  };
};
const setPid = async () => {
  S.pid = await q(sb.rpc("get_periodo", { p_fecha: S.week }));
};
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("service-worker.js");
