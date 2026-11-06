// CSS Modules 在测试中返回类名本身，例如 styles.title === 'title'
module.exports = new Proxy({}, { get: (_target, key) => (key === '__esModule' ? false : key) });
