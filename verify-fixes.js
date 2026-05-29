import { convertUnicodeToHarikrishnaTemplate } from './src/utils/harikrishnaTemplate.js';

const input = "ઉપરોક્ત જમીન વિકસાવવા માટે, ઉપરોક્ત જમીનના માલિકો () કિશોરભાઈ ભુરાભાઇ કોશિયા, () ગગજીભાઈ ભુરાભાઇ કોશિયા, () સ્વીનતુ અરવિંદભાઈ માવાણીનાએ શ્રી સિલ્વરસ્ટોન એન્ટરપ્રાઇસના નામે ભાગીદારી પેઢી બનાવી છે અને ઉપરોક્ત ભાગીદારી પેઢી શ્રી સાહેબશ્રી";
const expected = "upri[±t jm)n (vksivvi miT[, upri[±t jm)nni mi(lki[ {} (kSi[rBiE B&riBie ki[(Syi, {} ggJBiE B&riBie ki[(Syi, {} Av)nt& ar(v>dBiE miviN)nia[ ~) (sÃvrATi[n a[ºTrp\\iesni nim[ Big)dir) p[Q) bniv) C[ an[ upri[±t Big)dir) p[Q) ~) sih[b~)";

console.log("Current output:");
console.log(convertUnicodeToHarikrishnaTemplate(input));
console.log("Expected output:");
console.log(expected);
