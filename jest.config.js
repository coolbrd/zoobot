// eslint-disable-next-line no-undef
module.exports = {
    testEnvironment: "node",
    roots: ['test', 'src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    },
    coverageReporters: ['json', 'lcov', 'text', 'clover']
}