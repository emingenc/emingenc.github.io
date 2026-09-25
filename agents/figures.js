// figures.js — the file lines a tool read, shown inside its turn: a caption
// (file, line range, tool, token count) over the numbered rows, cited rows
// highlighted. The rows come from the knowledge files in index.astro
// (#docWrap). Text only: nothing here takes HTML.
import { make } from './dom.js';

function lineItem(row) {
  const item = make('li', row.hit ? 'hit' : '');
  item.append(make('span', 'n', String(row.line)), make('span', 'x', row.text));
  return item;
}

function gapItem() {
  const item = make('li', 'gap');
  item.setAttribute('aria-hidden', 'true');
  item.append(make('span', 'n', '⋯'));
  return item;
}

// meta: {name, range, tool, tok}; rows: [{line, text, hit}] in line order.
// A marker stands in for the lines between two rows that are not adjacent.
export function readFigure(meta, rows) {
  const figure = make('figure', 'read');
  const caption = make('figcaption');
  caption.append(make('span', 'f', meta.name), make('span', '', meta.range), make('span', 'by', meta.tool), make('span', 't', '≈' + meta.tok + ' tok'));
  const list = make('ol', 'lines');
  rows.forEach((row, index) => {
    if (index && row.line > rows[index - 1].line + 1) list.append(gapItem());
    list.append(lineItem(row));
  });
  figure.append(caption, list);
  return figure;
}
