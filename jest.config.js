module.exports = {
    globals: {
      'ts-jest': {
        diagnostics: {
          ignoreCodes: [2532],
        },
      },
    },
  
    collectCoverage: true,
  
    coveragePathIgnorePatterns: ['/node_modules|build/'],
  
    collectCoverageFrom: ['src/**/*.ts'],
  
    transform: {
      '.(ts|tsx)': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|\\.(spec))\\.(ts|tsx|js)$',
    moduleFileExtensions: ['ts', 'tsx', 'js'],
  };