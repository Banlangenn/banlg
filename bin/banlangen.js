#!/usr/bin/env node
'use strict';
process.on('exit', () => {
    console.log('');
});

if (!process.argv[2]) {
    console.log('[组件名称缺失] \t ');
    process.exit(1);
}
const fileSave = require('file-save');
const babelParser = require('@babel/parser')
const t = require('@babel/types')
const generate = require('@babel/generator').default
const traverse = require('@babel/traverse').default
const uppercamelcase = require('uppercamelcase')
const componentName = process.argv[2] 
const parentName = process.argv[3] ? uppercamelcase(process.argv[3]) : process.argv[3]
const ComponentName = uppercamelcase(componentName)
const fs = require('fs')
const path  = require('path')
const documentFlag =  process.argv[4] &&  process.argv[4] === '-t'

// util
// 重写console.log 带颜色
const log = info =>{console.log('\x1B[32m%s\x1B[39m',info)}
// 大小驼峰转 中线
function toLowerLine(str) {
	let temp = str.replace(/([A-Z])/g,"-$1").toLowerCase()
  	if (temp.slice(0,1) === '-') { //如果首字母是大写，执行replace时会多一个_，这里需要去掉
  		temp = temp.slice(1)
  	}
	return temp
}
function allpath (source) {
    let all = []
    try {
        all = fs.readdirSync(path.join(process.cwd(), source))
        .filter((v) => fs.lstatSync(path.join(process.cwd(), source) + v).isDirectory()) 
    } catch (error) {}
    return all
}
function searchPath (rank) {
    rank = rank > 4 ? 4 : rank
    let dir  = ['/', '/../', '/../../','/../../../']
    dir = dir.slice(0,rank)
    let srcpath = null
    for (const v of dir) {
        if (allpath(v).includes('src')) {
            srcpath = path.join(process.cwd(), v)
            break
        }
    }
    if (!srcpath) {
        log('[src]\t 请移到项目内后再试')
        process.exit(1)
    }
    return srcpath
}
function hasFile (projectRoot,filePath) {
    return fs.existsSync(path.join(projectRoot, filePath))
}
function readFile (projectRoot,filepath) {
    return fs.readFileSync(path.resolve(projectRoot, filepath), 'utf-8')
}

function render(template, context) {
    //被转义的的分隔符 { 和 } 不应该被渲染，分隔符与变量之间允许有空白字符
    var tokenReg = /(\\)?\{{([^\{\}\\]+)(\\)?\}}/g;
    return template.replace(tokenReg, function (word, slash1, token, slash2) {
        //如果有转义的\{或\}替换转义字符
        if (slash1 || slash2) {  
            return word.replace('\\', '');
        }
        // 切割 token ,实现级联的变量也可以展开
        const variables = token.replace(/\s/g, '').split('.'); 
        let currentObject = context;
        let i, length, variable;

        for (i = 0, length = variables.length; i < length; ++i) {
            variable = variables[i];
            currentObject = currentObject[variable];
            // 如果当前索引的对象不存在，则直接返回<没有提供此变量>。
            if (currentObject === undefined || currentObject === null) return '<没有提供此变量>';
        }
        return currentObject;
    })
}

// 开始
const projectRoot = searchPath(4)

if (!hasFile(projectRoot, 'src/views')) {
    log('[views]\t 缺少陈放组件的views文件夹')
    process.exit(1)
}
if (!hasFile(projectRoot, 'src/router')) {
    log('[router]\t 缺少陈放路由配置的router文件夹')
    process.exit(1)
}
// router下是否有index.js
const checkRouterConfig = hasFile(projectRoot, 'src/router/index.js')
const originCode = (checkRouterConfig ? readFile(projectRoot, 'src/router/index.js') : null) ||`/* eslint-disable */
import Vue from "vue";
import Router from "vue-router";
Vue.use(Router);
export default new Router({
  mode: 'history',
  routes: [
        {
            path: "*",
            redirect: "/"
        }
  ],
  scrollBehavior(to, from) {
    return {
      x: 0,
      y: 0
    };
  }
});
`
const ast = babelParser.parse(originCode, {
    sourceType: 'module',
    // allowImportExportEverywhere: true,
    plugins: [
        'flow',
        'dynamicImport'
    ]
})

// 强依赖 当前环境
function generateEl(isChildren = true, isFirst = false) {
    return t.objectExpression(
        [t.objectProperty(
            t.identifier('path'),
            t.stringLiteral(`${isChildren ? (isFirst ? '' : toLowerLine(componentName)) : ( isFirst ? '/' : '/' + toLowerLine(componentName))}`)
        ),t.objectProperty(
            t.identifier('component'),
            t.identifier(ComponentName)
        )]
    )
}

// hasFile()

// // 一级 造路由基本结构  {}  两个地方用到
// const routerProperty = generateEl()



// // 节点有children  key ： value
// const children  = t.objectProperty(
//     t.identifier('children'),
//     t.arrayExpression([routerProperty])
// )

//  父组件命令行 有 但是没找到
let  noParent = true
  // 判断该组件是否存在 
traverse(ast, {
    VariableDeclarator(path) {
        if(path.node.id.name === ComponentName) {
            log(`[${componentName}]\t 组件已存在，请更换组件名称`);
            process.exit(1);
        }
        if( parentName && path.node.id.name === parentName) {
            noParent = false
        }
    }
})
if (parentName) {
    // 命令行 有父级
    // 二级路由遍历
    let isChildren = false
    if (noParent) {
        log(`[${parentName}]\t 父级组件没找到，请检查后再试`);
        process.exit(1);
    }
    traverse(ast, {
        ObjectProperty(path) {
            if (path.node.value.name === parentName) {
                if (path.parent.properties.some(element => {
                    return element.key.name === 'children'
                })) {
                    isChildren = true
                }
                path.skip()
            }
        }
        
    })
    // log(`[${parentName}]\t 父级路由下是否有Children\t ${isChildren}`)
    if (isChildren) {
        traverse(ast, {
            ArrayExpression(path) {
                const parent = path.findParent(p => p.isObjectProperty)
                const properties = parent.parent.properties
                properties.forEach(element => {
                    if ( element.value && element.value.name === parentName) {
                        path.node.elements.push(generateEl())
                        path.skip()
                    }
                })
            }
        })
    } else {
        traverse(ast, {
            ObjectExpression(path) {
                const properties = path.node.properties
                properties.forEach(element => {
                    if ( element.value && element.value.name === parentName) {
                        path.pushContainer('properties',  t.objectProperty(
                            t.identifier('children'),
                            t.arrayExpression([generateEl(true, true)])
                        ))
                        path.skip()
                    }
                })
            }
        })
    }
} else {
    // 按在一级路由
    traverse(ast, {
        ArrayExpression(path) {
            if(path.parent.key.name === 'routes') {
                if (path.parent.value.elements.length === 1) {
                    path.node.elements.unshift(generateEl(false, true))
                } else {
                    path.node.elements.splice(1, 0, generateEl(false, false))
                }
                path.skip()
            }
        }
    })
}
const introduce = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(ComponentName), 
    t.arrowFunctionExpression(
        [],
        t.callExpression(
            t.import(),
            [
                t.stringLiteral(`${documentFlag ? '@/views/' + parentName + '/src/' + ComponentName : '@/views/' + ComponentName}`)
            ]
        )
    )
)])

let lastImport = null 
traverse(ast, {
    ImportDeclaration(path) {
        lastImport = path.node.source.value
    }
})

traverse(ast, {
    ImportDeclaration(path) {
        if(path.node.source.value === lastImport) {
            path.insertAfter(introduce)
            path.skip()
        }
    }
})

const routerContent = generate(ast, {
    quotes: 'single',
}).code

const vueContent = hasFile(projectRoot, './vue.bl') ? render(readFile(projectRoot, 'vue.bl') , {
    componentName,
    ComponentName,
    toLowerLineCN: toLowerLine(componentName)
}) : null ||
`<template>
    <div class="${toLowerLine(componentName)}">
        ${componentName}
    </div>
</template>
<script>
export default {
    name: '${ComponentName}',
    data () {
        return {

        }
    },
    created () {

    },
    methods: {

    }
}
</script>
<style lang='scss' >
    @import './css/${componentName}.scss';
</style>
`
const cssContent = hasFile(projectRoot, 'css.bl') ? render(fs.readFile(projectRoot, './css.bl') , {
    componentName,
    ComponentName
}) : null ||
`.${toLowerLine(componentName)} {
            



            
}`
// 创建 文件
const files = [
    {
        fileDir: `src/views/${ComponentName}/index.js`,
        content:
`import ${ComponentName} from './src/main'
export default ${ComponentName}`,
        action: 'create'
    },
    {
        fileDir: `src/views/${ComponentName}/src/main.vue`,
        content: vueContent,
        action: 'create'
    },
    {
        fileDir: `src/router/index.js`,
        content: routerContent,
        action: checkRouterConfig ? 'change' : 'create'
    },
    {
        fileDir: `src/views/${ComponentName}/src/css/${componentName}.scss`,
        content: cssContent,
        action: 'create'
    }
]
if (documentFlag) {
    files.shift()
    files[0].fileDir = `src/views/${parentName}/src/${ComponentName}.vue`
    files[files.length - 1].fileDir =  `src/views/${parentName}/src/css/${componentName}.scss`
}
createFile(files)
async function createFile(files) {
    let promiseArr = []
    for (const file of files) {
        promiseArr.push(
            new Promise(function (resolve, reject) {
                    fileSave(path.join(projectRoot, file.fileDir))
                    .write(file.content, 'utf8')
                    .end()
                    .finish(()=>{
                        log(`☺ ${file.action}\t${file.fileDir}`)
                        resolve('data')
                    })
                })
        )
    }
   await Promise.all(promiseArr)
   files[files.length - 2].fileDir = originCode
   fileSave(path.join(__dirname, './revoke.json'))
   .write( JSON.stringify({files}))
 }


