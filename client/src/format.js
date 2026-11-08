export const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const DIAS_LONGOS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const p2 = (n) => String(n).padStart(2, '0');

/* Datas como texto "YYYY-MM-DD", sem fusos horários. */
export const parseData = (s) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
};
export const isoData = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const hoje = () => isoData(new Date());

export function addDias(s, n) {
  const d = parseData(s);
  d.setDate(d.getDate() + n);
  return isoData(d);
}

/* 1 = segunda ... 7 = domingo */
export function diaISO(s) {
  const w = parseData(s).getDay();
  return w === 0 ? 7 : w;
}

export const segundaDe = (s) => addDias(s, 1 - diaISO(s));

export function dataCurta(s) {
  const d = parseData(s);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

export function dataLonga(s) {
  const d = parseData(s);
  return `${DIAS_LONGOS[diaISO(s) - 1]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function tituloSemana(s) {
  const seg = segundaDe(s);
  const dom = addDias(seg, 6);
  const a = parseData(seg);
  const b = parseData(dom);
  const mesA = MESES[a.getMonth()];
  const mesB = MESES[b.getMonth()];
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} de ${mesB}`
    : `${a.getDate()} de ${mesA} – ${b.getDate()} de ${mesB}`;
}

/* Horas */
export const horaDe = (inicio) => inicio.slice(11, 16);
export const dataDe = (inicio) => inicio.slice(0, 10);
export const minutos = (hhmm) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
export const emHHMM = (min) => `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;

export function moeda(valor) {
  const n = Number(valor) || 0;
  const [inteiro, decimal] = Math.abs(n).toFixed(2).split('.');
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const centimos = decimal === '00' ? '' : `,${decimal}`;
  return `${n < 0 ? '-' : ''}${agrupado}${centimos} €`;
}

export function duracao(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${p2(r)}` : `${h}h`;
}

export function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}
