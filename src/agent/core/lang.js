// Detección del idioma de la conversación (español o inglés) a partir de lo que escribe el cliente.
// Devuelve 'es', 'en' o null cuando no hay evidencia suficiente (mensajes cortos, nombres, números):
// en ese caso la conversación conserva el idioma que ya tenía.
const ES = new Set(('el la los las un una unos unas de del que y en es por para con mi tu su yo te se lo al ' +
  'quiero necesito busco tengo puedo hola gracias auto carro coche camioneta precio cuanto cuesta como donde pero mas muy ' +
  'esta estoy soy tiene hay ya tambien buenas favor quisiera comprar credito financiamiento contado primer primera cambiar ' +
  'mirando solo ahora prefiero claro adelante agendar asesor cual cuales son sobre sin este esto ese').split(' '));
const EN = new Set(('the an and or of to in is are it its i im my you your we do does have has want need looking buy car truck ' +
  'how much what where when can could would please thanks thank hello hi hey yes not for with about price cost credit financing ' +
  'cash first change just now prefer sure book advisor payment down any this that am be get like which tell show').split(' '));

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function detectLang(text) {
  const raw = String(text).toLowerCase();
  let es = /[ñ¿¡]/.test(raw) ? 2 : 0;
  let en = 0;
  for (const w of strip(raw).split(/[^a-z']+/)) {
    if (!w) continue;
    if (ES.has(w)) es += 1;
    if (EN.has(w)) en += 1;
  }
  if (es === en) return null;
  return es > en ? 'es' : 'en';
}
