function uiSetVar(node,name,value) {
node.style?.setProperty(name,String(value));
return node;
}

export { uiSetVar };
