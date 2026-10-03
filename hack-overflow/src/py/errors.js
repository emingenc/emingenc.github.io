const ERROR_CLASSES = Object.freeze([
'TypeError','KeyError','IndexError','ValueError','AttributeError','NameError',
'UnboundLocalError','ZeroDivisionError','RuntimeError',
]);
class PyError extends Error {
constructor(pyClass,message) {
super(message ?? pyClass);
this.pyClass = pyClass;
this.pyMessage = message ?? null;
}
}
class TimeLimitExceeded extends Error {}
class PyReturn {
constructor(value) {
this.value = value;
}
}

export { PyError, TimeLimitExceeded, PyReturn, ERROR_CLASSES };
