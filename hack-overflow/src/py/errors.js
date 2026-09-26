const ERROR_CLASSES = Object.freeze([
'TypeError','KeyError','IndexError','ValueError','AttributeError','NameError',
'UnboundLocalError','ZeroDivisionError','RuntimeError',
]);
/**
 * A Python-shaped runtime error. `pyClass` is a CPython exception class name
 * (from ERROR_CLASSES) or the judge-only class `'InternalError'`. `message`
 * is optional CPython-matching text (`str(exc)`); later slices plumb it
 * through to the verdict.
 */
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
