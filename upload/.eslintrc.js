module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: [
        'plugin:vue/essential',
        'eslint:recommended',
        '@vue/typescript/recommended',
        '@vue/prettier',
        '@vue/prettier/@typescript-eslint'
    ],
    parserOptions: {
        ecmaVersion: 2020
    },
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        indent: [
            'error',
            4,
            {
                SwitchCase: 1,
                ArrayExpression: 1
            }
        ],
        semi: ['error', 'never'], // 禁止分号
        'comma-dangle': ['error', 'never'], // 禁止逗号
        'newline-per-chained-call': 'off',
        'no-useless-escape': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
    }
}
