module.exports = {
    parserOptions: {
        ecmaVersion: 2019
    },
    env: {
        es6: true,
        node: true
    },
    extends: 'eslint:recommended',
    rules: {
        quotes: ['warn', 'single'],
        semi: ['warn', 'never'],
        indent: ['warn', 4],
        'no-unused-vars': 'warn'
    }
}
