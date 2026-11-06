const {calcEjecutivo:c,calcAdmin:a}=require('../js/calculations.js');const as=require('assert');
const B=(v,h='9-3')=>c({esquema:'BASE',horario:h,ventas:v});
// límites de rangos: [ventas, tarifa]
[[0,0],[1,50],[2,50],[3,100],[5,100],[6,150],[7,150],[8,200],[9,200],[10,350],[15,350]].forEach(([v,t])=>{as.strictEqual(B(v).tarifa,t,'tarifa '+v);as.strictEqual(B(v).comision,v*t)});
as.strictEqual(B(0).pago,1300);as.strictEqual(B(0,'9-4').pago,1600);as.strictEqual(B(10).pago,1300+3500);
as.strictEqual(c({esquema:'BASE',horario:'9-3',ventas:6,bonos:100,faltas:1,retardos:2}).pago,2000);
as.strictEqual(c({esquema:'COMISIONISTA',ventas:5,bonos:100,faltas:1,retardos:1}).pago,1850);
as.strictEqual(c({esquema:'COMISIONISTA',ventas:0,bonos:100}).pago,100);
as.strictEqual(c({esquema:'COMISIONISTA',ventas:0}).salario,0);
const x=c({esquema:'COMISIONISTA',ventas:0,bonos:0,faltas:2,retardos:1});as.strictEqual(x.pago,0);as.strictEqual(x.excedente,450);
as.strictEqual(a({ventas:5,salario_base:1500}).pago,3500);
console.log('calc OK');
