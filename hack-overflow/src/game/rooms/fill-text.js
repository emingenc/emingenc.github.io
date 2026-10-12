
function fillText(template,values) {
return template.replace(/\{(\w+)\}/g,function (_,name) {
return name in values ? String(values[name]) :'';
});
}

export { fillText };
