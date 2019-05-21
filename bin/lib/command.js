// 大方的说：就是抄egg  https://github.com/eggjs/egg-init/blob/master/lib/init_command.js
const fileSave = require('file-save');
const babelParser = require('@babel/parser')
const t = require('@babel/types')
const generate = require('@babel/generator').default
const traverse = require('@babel/traverse').default
const uppercamelcase = require('uppercamelcase')
module.exports = class Command {
    constructor(options) {
        options = options || {}
        this.name = options.name || 'banlg'
        this.jsonPath = options.jsonPath || './temporary.json'
        this.cssTemplate = options.cssTemplate || './css.bl'
        this.vueTemplate = options.vueTemplate || './vue.bl'
    }
    run(cwd, args) {
        const argv = this.argv = this.getParser(args || [])
        this.cwd = cwd
        this.projectRoot = this.searchPath()
        //  检查文件合法
        if(!checkDir(this.projectRoot)){
            process.exit(1)
        }
        // 撤销指令
        if (argv.componentName === '-re') {
            this.revoke()
        }
        // 未被拦截的'-'开头不是内置命令
        //  检查命令的 合法性
        if (!this.checkCom(argv)) {
            process.exit(0)
        }
        const routerObject = this.generateRouter()
        const filesArray = this.generateVueCss()
        this.filesArray.push(routerObject)
        this.createFile(filesArray)
    }
    /**
     * @returns {Array}
     * @description  vue和css的文件描述文件
     */
    generateVueCss() {
        const componentName = this.argv.componentName
        const ComponentName = this.argv.ComponentName
        const lowerLineComName = this.argv.lowerLineComName
        const parentName  = this.argv.parentName
        const isInsertParent = this.argv.isInsertParent

        const renderObject = {
            componentName,
            ComponentName,
            lowerLineComName
        }
        const vueContent = this.hasFile(projectRoot, this.vueTemplate) ?
        this.render(this.readFile(projectRoot, this.vueTemplate) , renderObject) : null ||
        `<template>
            <div class="${lowerLineComName}">
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
        const cssContent = this.hasFile(projectRoot,this.cssTemplate) ?
        this.render(this.readFile(projectRoot, this.cssTemplate) , renderObject) : null ||
        `.${lowerLineComName} {
                    
        
        
        
                    
        }`
        
        const files = [
            {
                fileDir: isInsertParent ? `src/views/${parentName}/src/${ComponentName}.vue` : `src/views/${ComponentName}/src/main.vue`,
                content: vueContent,
                fileName: 'main',
                action: 'create'
            },
            {
                fileDir: isInsertParent ? `src/views/${parentName}/src/css/${componentName}.scss` : `src/views/${ComponentName}/src/css/${componentName}.scss`,
                content: cssContent,
                fileName: 'scss',
                action: 'create'
            }
        ]
        // 组件的 index.js：插入到父组件内 是不用index.js的
        !isInsertParent && files.push({
            fileDir: `src/views/${ComponentName}/index.js`,
            content:
        `import ${ComponentName} from './src/main'
        export default ${ComponentName}`,
            fileName:'index',
            action: 'create'
        })
        return files
    }
    generateRouter() {
        const parentName = this.argv.parentName
        const projectRoot = this.projectRoot
        const checkRouterFile = hasFile(projectRoot, 'src/router/index.js')
        const originCode = (checkRouterFile ? readFile(projectRoot, 'src/router/index.js') : null) ||
        `
        /* eslint-disable */
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

        //  父组件命令行 有 但是没找到
        let  noParent = true
        // 判断该组件是否存在
        // 1. 检查组件是否存在--- 有没有父组件都要遍历
        // 2. 是否 父组件 是否存在
        //  traverse   是深度遍历  所以 必须 每个遍历完 在来一遍-- 不然 上面判断结果 还没有走出来 -- 下边就走了
        traverse(ast, {
        VariableDeclarator(path) {
            if(path.node.id.name === this.argv.ComponentName) {
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
        // 二级路由遍历v  检查是否是第一个  children
        let isChildren = false
        if (noParent) {
            log(`[${parentName}]\t 父级组件没找到，请检查后再试`);
            process.exit(1);
        }
        //  看 看 能不能找到 parent 上  children  属性
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
        // 这连个可以合成以一个
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
        const introduce = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(this.argv.ComponentName), 
        t.arrowFunctionExpression(
            [],
            t.callExpression(
                t.import(),
                [
                    t.stringLiteral(`${this.argv.isInsertParent ? 
                        '@/views/' + parentName + '/src/' + this.argv.ComponentName : 
                        '@/views/' + this.argv.ComponentName}`)
                ]
            )
        )
        )])
        // 找到最后一个 import
        let lastImport = null 
        traverse(ast, {
        ImportDeclaration(path) {
            lastImport = path.node.source.value
        }
        })
        // 把   引入组件 插入最后一个 import  后边
        traverse(ast, {
        ImportDeclaration(path) {
            if(path.node.source.value === lastImport) {
                path.insertAfter(introduce)
                path.skip()
            }
        }
        })
        // //  为了符合 我们的 eslint  把 双引号变成单引号
        // traverse(ast, {
        //     StringLiteral(path) {
        //         path.node.value =  path.node.value.replace(/^"(.*)"$/, (d,$1,)=>`'${$1}'`)
        //     }
        // })

        const routerContent = generate(ast,{ 
        /* 选项 */
        //  看不懂  直接自己用正则去掉
        }).code
        // 去空行
        .replace(/\n(\n)*()*(\n)*\n/g, '\n')
        // 去行尾分号
        .replace(/\;(?=\n)/g, '')
       
        return  {
            fileDir: `src/router/index.js`,
            content: routerContent,
            fileName: 'router',
            action: checkRouterFile ? 'change' : 'create'
        }
    }
    // 生成的 {}  是不是 子路由    是不是第一个 路由 
    generateEl(isChildren = true, isFirst = false) {
        const propertyArray =  [t.objectProperty(
            t.identifier('path'),
            t.stringLiteral(`${isChildren ? 
                (isFirst ? '' : this.toLowerLine(this.argv.componentName))
                 : ( isFirst ? '/' : '/' + this.toLowerLine(this.argv.componentName))}`)
        ),t.objectProperty(
            t.identifier('component'),
            t.identifier(this.argv.ComponentName)
        )]
        // 中文变utf-8编码-能照常使用： '\u4E2D\u6587' === '中文'
        this.metaParam && propertyArray.push(t.objectProperty(
            t.identifier('meta'),
            t.stringLiteral(this.metaParam)
        ),t.objectProperty(
            t.identifier('name'),
            t.stringLiteral(this.argv.componentName)
        ))
        return t.objectExpression(propertyArray)
    }
    // 校验文件是否合
    checkDir(projectRoot) {
        if (!this.hasFile(projectRoot, 'src/views')) {
            this.log('[views]\t 缺少陈放组件的views文件夹')
            return false
            
        }
        if (!this.hasFile(projectRoot, 'src/router')) {
            this.log('[router]\t 缺少陈放路由配置的router文件夹')
            return false
        }
        return true
    }
    // 检查 命令是否合法
    checkCom(argv) {
        if (/^-.*/.test(argv.componentName)) {
            log(`${argv.componentName}\t暂未提供 [${argv.componentName}] API`)
            return false
        }
        if (/[^\w]/.test(argv.componentName)) {
            log(`${argv.componentName}\t胡里花哨的组件命名是不允许的`)
            return false
        }
        return true
    }
    // 业务 还原上一次操作
    revoke() {
        const jsonPath = this.jsonPath
        if (!this.hasFile(__dirname, jsonPath) || !this.readFile(__dirname, jsonPath)) {
            this.log('[revoke]\t 暂无可撤销操作')
            process.exit(1)
        }
    
        try {
            const files = JSON.parse(this.readFile(__dirname, jsonPath))
            if (files.projectRoot !== this.projectRoot) {
                log('[revoke]\t 当前项目暂无可撤销操作')
                process.exit(1)
            }
            // 把整个文件夹删除了
            if (files.record.length === 4) {
                // log(deleteFolderRecursive)
                this.deleteFolderRecursive(path.join(projectRoot, `./src/views/${files.ComponentName}`))
                log(`☺ [removeDir]\t  src/views/${files.ComponentName}`)
            } else {
                // 删除 文件
                for (const file of files.record) {
                    if (file.fileName !== 'router') {
                        fs.unlinkSync(path.join(projectRoot, file.fileDir))
                        log(`☺ [removeFile]\t  ${file.fileDir}`+)
                    }
                    
                }
            }
            fs.writeFileSync(path.join(projectRoot, `./src/router/index.js`), files.routerCode)
            log(`☺ [change]\t  src/router/index.js`)
            fs.writeFileSync(path.join(__dirname, jsonPath), '')
            process.exit(0)
        } catch (err) {
            this.log('[revoke]\t 失败!文件解析错误\t' + err)
            fs.writeFileSync(path.join(__dirname, jsonPath), '')
            process.exit(1)
        }
    }
    createFile(files) {
        const projectRoot = this.projectRoot
        const ComponentName = this.argv.ComponentName
        let promiseArr = []
        for (const file of files) {
            promiseArr.push(
                new Promise(function (resolve, reject) {
                        try {
                            fileSave(path.join(projectRoot, file.fileDir))
                            .write(file.content, 'utf8')
                            .end()
                            .finish(()=>{
                                log(`☺ ${file.action}\t${file.fileDir}`)
                                resolve('data')
                            })
                        } catch (error) {
                            reject(error)
                        }
                    })
            )
        }
        Promise.all(promiseArr).then(()=>{
            fileSave(path.join(__dirname, this.jsonPath))
            .write( JSON.stringify({
                routerCode:originCode,
                ComponentName,
                record:files,
                projectRoot
            }))
        }).catch(error => {
            this.log('☺ [文件生成失败] \t ' + error);
        })
    //    files[files.length - 2].fileDir = originCode
     }
    searchPath (rank) {
        rank = rank > 4 ? 4 : rank
        let dir  = ['/', '/../', '/../../','/../../../']
        dir = dir.slice(0, rank)
        let srcpath = null
        for (const v of dir) {
            if (this.allpath(v).includes('src')) {
                srcpath = path.join(this.cwd, v)
                break
            }
        }
        if (!srcpath) {
            this.log('☺ [src]\t 请移到项目内后再试')
            process.exit(1)
        }
        return srcpath
    }

    toLowerLine(str) {
        let temp = str.replace(/([A-Z])/g,"-$1").toLowerCase()
          if (temp.slice(0,1) === '-') { //如果首字母是大写，执行replace时会多一个_，这里需要去掉
              temp = temp.slice(1)
          }
        return temp
    }

    getParser(argv) {
        // 历史遗留问题不能用库  入参就是如此奇葩
        if (argv.length === 0 ) {
            this.log('☺ [组件名称缺失] \t ')
            process.exit(1);
        }
        const componentName = argv[0] 
        const parentName = argv[1] && !argv[1].startsWith('-') ? uppercamelcase(argv[1]) : false
        const isInsertParent = argv[2] && process.argv[2] === '-t'
        const metaParam = (() => {
            const arr = argv.slice(1)
            //  会主动把  引号 去掉
            for (const iterator of arr) {
                if (iterator.startsWith('-m')) {
                    return iterator.slice(2).toString()
                }
            }
           return false
        })()
        const ComponentName = uppercamelcase(componentName)
        const lowerLineComName = this.toLowerLine(componentName)
        return {
            componentName,
            ComponentName,
            lowerLineComName,
            parentName,
            isInsertParent,
            metaParam,
        }
    }

    render(template, context) {
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

    deleteFolderRecursive(path) {
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file) {
                const curPath = path + "/" + file
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath)
                }
            })
            fs.rmdirSync(path);
        }
    }

    allpath (source) {
        let all = []
        try {
            all = fs.readdirSync(path.join(this.cwd, source))
            .filter((v) => fs.lstatSync(path.join(this.cwd, source) + v).isDirectory()) 
        } catch (error) {}
        return all
    }
    /**
     *
     *
     * @param {String} projectRoot
     * @param {String} filePath
     * @returns  {Boolean} 是否存在
     * @description 判断文件是否存在
     */
    hasFile (projectRoot,filePath) {
        return fs.existsSync(path.join(projectRoot, filePath))
    }

    readFile (projectRoot, filePath) {
        return fs.readFileSync(path.resolve(projectRoot, filePath), 'utf-8')
    }

    log(info){
        console.log('\x1B[32m%s\x1B[39m', info)
    }
}