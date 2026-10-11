// Poznámky pod ceníkem. Texty jsou v client/src/lsi/<lang>.json pod "pricing.notes".
//
// Částky tu nejsou: stránka Ceník si je bere ze serveru (`price/list`), který je počítá
// stejnou funkcí jako cenu rezervace. Pravidla a čísla jsou v server/config.js → pricing.

export const notes = ["included", "summerWeekOnly", "otherStays"];

export default { notes };
