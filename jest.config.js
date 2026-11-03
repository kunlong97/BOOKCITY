/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // 静态资源规则要放在 @/ 别名前面，否则 @/assets/xxx.png 会被当成 JS 解析
    '\\.(css|scss)$': '<rootDir>/test/styleStub.js',
    '\\.(png|jpe?g|gif|svg|eot|ttf|woff2?)$': '<rootDir>/test/fileStub.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
