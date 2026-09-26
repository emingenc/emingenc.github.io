const EXAMPLE_KIND = 'example';

/**
 * The one test-count set every view reads from, so an examples/hidden/total
 * string can never diverge between the RUN and SUBMIT panels.
 * @param {Array<{kind:string}>} smallCases - `context.cases.small`
 * @returns {{examples:number, hidden:number, total:number}}
 */
function testCounts(smallCases) {
const total = smallCases.length;
const examples = smallCases.filter((testCase) => testCase.kind === EXAMPLE_KIND).length;
return { examples,hidden:total - examples,total };
}

export { testCounts, EXAMPLE_KIND };
