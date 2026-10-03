const EXAMPLE_KIND = 'example';

function testCounts(smallCases) {
const total = smallCases.length;
const examples = smallCases.filter((testCase) => testCase.kind === EXAMPLE_KIND).length;
return { examples,hidden:total - examples,total };
}

export { testCounts, EXAMPLE_KIND };
