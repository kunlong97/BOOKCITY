module.exports = {
  '*.+(js|jsx|mjs|cjs|json|yml|yaml|css|less|scss|ts|tsx|md)': 'prettier --write',
  '*.{ts,tsx,js,jsx,mjs,cjs}': 'eslint --fix',
};
