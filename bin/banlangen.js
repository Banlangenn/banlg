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
const Utils =  require('./Utils')
const isInsertParent = process.argv[4] && process.argv[4] === '-t'
// util
// 重写console.log 带颜色
const log = Utils.log
// 大小驼峰转 中线
const toLowerLine = Utils.toLowerLine
// 查找 src文件
const searchPath = Utils.searchPath
// 是否有这个文件
const hasFile = Utils.hasFile
// 读取这个文件
const readFile = Utils.readFile
// 字符串模板
const render = Utils.render
// 删除文件
const deleteFolderRecursive = Utils.deleteFolderRecursive

// 添加help命令
if (componentName === '--help') {
    // Usage: yarn [command] [flags]
    console.log(`
    Usage: banlg [command] [flags]
    Commands:
    banlg comName ?parentComName ?-t
        comName <String>: 将要创建组件名称
        parentComName <String>: 父组件名称(可选)
        -t <flag>: 是否插入当前父组件文件夹(可选)
    banlg -re
        撤销上次操作😊删除文件,复原router( 只能撤销一次,并且无法回退)
    `)

    // banlg --version
    // 输出当前版本号
    process.exit(0)
}

if (/^-.*/.test(componentName)) {
    log(`${componentName}\t暂未提供 [${componentName}] API`)
    process.exit(0)
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




// 撤销上次修改
// 全部同步 

if (componentName === '-re') {
    if (!hasFile(__dirname, './temporary.json') || !readFile(__dirname, './temporary.json')) {
        log('[revoke]\t 暂无可撤销操作')
        process.exit(1)
    }

    try {
        const files = JSON.parse(readFile(__dirname, './temporary.json'))
        if (files.projectRoot !== projectRoot) {
            log('[revoke]\t 当前项目暂无可撤销操作')
            process.exit(1)
        }
        if (files.record.length === 4) {
            deleteFolderRecursive(path.join(projectRoot, `./src/views/${files.ComponentName}`))
            log(`☺ [removeDir]\t  src/views/${files.ComponentName}`)
        } else {
            for (const file of files.record) {
                if (file.fileName !== 'router') {
                    fs.unlinkSync(path.join(projectRoot, file.fileDir))
                    log(`☺ [removeFile]\t  ${file.fileDir}`)
                }
                
            }
        }
        fs.writeFileSync(path.join(projectRoot, `./src/router/index.js`), files.routerCode)
        log(`☺ [change]\t  src/router/index.js`)
        fs.writeFileSync(path.join(__dirname, './temporary.json'), '')
        process.exit(0)
    } catch (err) {
        log('[revoke]\t 失败!文件解析错误')
        fs.writeFileSync(path.join(__dirname, './temporary.json'), '')
        process.exit(1)
    }
}
// 撤销上次修改
// router下是否有index.js
const checkRouterFile = hasFile(projectRoot, 'src/router/index.js')
const originCode = (checkRouterFile ? readFile(projectRoot, 'src/router/index.js') : null) ||`/* eslint-disable */
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


// updataFile
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
                t.stringLiteral(`${isInsertParent ? '@/views/' + parentName + '/src/' + ComponentName : '@/views/' + ComponentName}`)
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



const renderObject = {
    componentName,
    ComponentName,
    toLowerLineCN: toLowerLine(componentName)
}
const vueContent = hasFile(projectRoot, './vue.bl') ? render(readFile(projectRoot, './vue.bl') , renderObject) : null ||
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
const cssContent = hasFile(projectRoot, './css.bl') ? render(readFile(projectRoot, './css.bl') , renderObject) : null ||
`.${toLowerLine(componentName)} {
            



            
}`


const files = [
    {
        fileDir: isInsertParent ? `src/views/${parentName}/src/${ComponentName}.vue` : `src/views/${ComponentName}/src/main.vue`,
        content: vueContent,
        fileName: 'main',
        action: 'create'
    },
    {
        fileDir: `src/router/index.js`,
        content: routerContent,
        fileName: 'router',
        action: checkRouterFile ? 'change' : 'create'
    },
    {
        fileDir: isInsertParent ? `src/views/${parentName}/src/css/${componentName}.scss` : `src/views/${ComponentName}/src/css/${componentName}.scss`,
        content: cssContent,
        fileName: 'scss',
        action: 'create'
    }
]
!isInsertParent && files.push({
    fileDir: `src/views/${ComponentName}/index.js`,
    content:
`import ${ComponentName} from './src/main'
export default ${ComponentName}`,
    fileName:'index',
    action: 'create'
})


// 可以把  三个content 分开
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
//    files[files.length - 2].fileDir = originCode
   fileSave(path.join(__dirname, './temporary.json'))
   .write( JSON.stringify({
       routerCode:originCode,
       ComponentName,
       record:files,
       projectRoot
    }))
 }


