// http://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parser: 'babel-eslint',
    parserOptions: {
        sourceType: 'module'
    },
    env: {
        browser: true,
    },
    // https://github.com/feross/standard/blob/master/RULES.md#javascript-standard-style
    extends: 'standard',
    // required to lint *.vue files
    plugins: [
        'html'
    ],
    // add your custom rules here
    'rules': {
        // allow paren-less arrow functions
        'arrow-parens': 0,
        // allow async-await
        'generator-star-spacing': 0,
        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
        //缩进设置
        // 'indent': [1, 4, {"SwitchCase": 1}],
		'indent': ["off", "tab"],
        //not undefined
        'no-undef': "warn",
        // 去掉关于函数funtion () {}中{}前面的加的空格限制
        'space-before-function-paren': 0,
        'no-tabs':'off',
        'no-mixed-spaces-and-tabs': 'off',
        'eol-last': 0
    }
}
