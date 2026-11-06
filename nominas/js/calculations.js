// Solo vista previa. El cálculo definitivo lo hace la función SQL calc_ejecutivo.
const tarifaBase = (v) =>
  v >= 10 ? 350 : v >= 8 ? 200 : v >= 6 ? 150 : v >= 3 ? 100 : v >= 1 ? 50 : 0;
function calcEjecutivo({
  esquema,
  horario,
  ventas = 0,
  bonos = 0,
  faltas = 0,
  retardos = 0,
}) {
  const salario = esquema === "BASE" ? (horario === "9-4" ? 1600 : 1300) : 0;
  const tarifa = esquema === "COMISIONISTA" ? 400 : tarifaBase(ventas);
  const comision = ventas * tarifa,
    descuentos = faltas * 200 + retardos * 50,
    pos = salario + comision + bonos;
  return {
    salario,
    tarifa,
    comision,
    descuentos,
    excedente: Math.max(0, descuentos - pos),
    pago: Math.max(0, pos - descuentos),
  };
}
const calcAdmin = ({ ventas = 0, salario_base = 0 }) => ({
  salario: salario_base,
  tarifa: 400,
  comision: ventas * 400,
  pago: salario_base + ventas * 400,
});
if (typeof module !== "undefined")
  module.exports = { calcEjecutivo, calcAdmin };
