// dom.js — the small element builders the session views share. Text always
// goes in through textContent; nothing here takes HTML.

export function make(tag, className, text) {
  const elem = document.createElement(tag);
  if (className) elem.className = className;
  if (text !== undefined) elem.textContent = text;
  return elem;
}

export function makeButton(className, text) {
  const button = make('button', className, text);
  button.type = 'button';
  return button;
}

export function makeLink(href, className, text) {
  const link = make('a', className, text);
  link.href = href;
  return link;
}
