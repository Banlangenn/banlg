#!/usr/bin/env node
'use strict';
// 重写console.log 带颜色
process.on('exit', () => {
    console.log('');
});
if (!process.argv[2]) {
    log('[组件名称缺失] \t ');
    process.exit(1);
}
const fileSave = require('file-save');
const parentName = process.argv[3]
const babelParser = require('@babel/parser')
const t = require('@babel/types')
const generate = require('@babel/generator').default
const traverse = require('@babel/traverse').default
const  uppercamelcase = require('uppercamelcase')
const componentName = process.argv[2] 
const ComponentName = uppercamelcase(componentName)
const fs = require('fs')
const path  = require('path')
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
    return fs.readdirSync(path.join(process.cwd(), source))
        .filter((v) => fs.lstatSync(path.join(process.cwd(), source) + v).isDirectory())
 }
function searchPath (rank) {
    rank = rank > 4 ? 4 : rank
    let dir  = ['/', '/../', '/../../','/../../../']
    dir = dir.slice(0,rank)
    let srcpath = null
    for (const v of dir) {
        if (allpath(v).includes('src')) {
            srcpath = path.join(process.cwd(), v)+'src'
            break
        }
    }
    if (!srcpath) {
        log('[src]\t 请移到项目src目录下后再试')
        process.exit(1)
    }
    const result =  {
        views: srcpath + '/views',
        router: srcpath + '/router/index.js'
    }
    if (!fs.existsSync(result.views)) {
        log('[views]\t 当前项目没找到views')
        process.exit(1)
    }
    if (!fs.existsSync(result.router)) {
        log('[router]\t 当前项目没找到router')
        process.exit(1)
    }
    return  result    
}
const currentpath = searchPath(3)
const code = fs.readFileSync(currentpath.router, 'utf8')
const ast = babelParser.parse(code, {
    sourceType: 'module',
    // allowImportExportEverywhere: true,
    plugins: [
        'flow',
        'dynamicImport'
    ]
})
const mo = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(ComponentName), 
    t.arrowFunctionExpression(
        [],
        t.callExpression(
            t.import(),
            [
                t.stringLiteral(`@/views/${ComponentName}`)
            ]
        )
    )
)])

// 一级 造路由基本结构  {}
const property = t.objectExpression(
    [t.objectProperty(
        t.identifier('path'),
        t.stringLiteral(toLowerLine(componentName))
      ),t.objectProperty(
        t.identifier('component'),
        t.identifier(ComponentName)
      )]
 )

// 节点有children  key ： value
const children = t.objectProperty(
    t.identifier('children'),
    t.arrayExpression([property])
)

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
    log(`[${parentName}]\t 父级路由下是否有Children\t ${isChildren}`)
    if (isChildren) {
        traverse(ast, {
            ArrayExpression(path) {
                const parent = path.findParent(p => p.isObjectProperty)
                const properties = parent.parent.properties
                properties.forEach(element => {
                    if ( element.value.name === parentName) {
                        path.node.elements.push(property)
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
                    if ( element.value.name === parentName) {
                        path.pushContainer('properties', children)
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
                path.node.elements.push(property)
                path.skip()
            }
        }
    })
}
// 这样子想的 先找到最后一个 path.node.source.value  然后在插入这个之后  ： 或者  bu -- const 算了
// traverse(ast, {
//     ImportDeclaration(path) {
//         if(path.node.source.value === 'vue-router') {
//             path.insertAfter(mo)
//             path.skip()
//         }
//     }
// })

  // vue 拆包 import
  ast.program.body.unshift(mo)
  // 正常 import
// const specifiers = t.ImportDefaultSpecifier(t.identifier('aaaaaaxxxaad'))
// const Declaration = t.importDeclaration([specifiers], t.stringLiteral('value'))
//   ast.program.body.unshift(Declaration)
const output = generate(ast, {
    quotes: 'single',
}, code)  


fs.writeFile(currentpath.router, output.code,function(error){
    if(error){
        console.log(error);
    }
})
log('[change] \t:'+ currentpath.router);

  
// 创建 文件
const Files = [
    {
        filename: '/index.js',
        content:
            `import ${ComponentName} from './src/main'
            export default ${ComponentName}`
    },
    {
        filename: '/src/main.vue',
        content: 
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
                };
            </script>
            <style lang='scss'>
                @import './css/${componentName}.scss'
            </style>
            `
    },
    {
        filename: `/src/css/${componentName}.scss`,
        content: 
        `@include b(${componentName}) {

        }`
    },
]
Files.forEach(file => {
  const filePath = path.join(currentpath.views, ComponentName + file.filename)
  fileSave(filePath)
    .write(file.content, 'utf8')
    .end('\n');
    log('[create] \t:'+ filePath)
})




