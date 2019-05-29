// 大方的说：就是抄egg  https://github.com/eggjs/egg-init/blob/master/lib/init_command.js
const fileSave = require('file-save')
const fs = require('fs')
const path = require('path')
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
        this.dev = options.dev || false
    }
    async run(cwd, args) {
        const argv = this.argv = this.getParser(args || [])
        if (!argv) return
        this.cwd = cwd
        // 能不能找到 src
        this.projectRoot = this.searchPath(4)
        if (!this.projectRoot) return
        //  检查文件合法
        if(!this.checkDir(this.projectRoot)) return
        // 撤销指令
        if (argv.componentName === '-re') {
            this.revoke()
            return
        }
        // 未被拦截的'-'开头不是内置命令
        //  检查命令的 合法性
        if (!this.checkCom(argv)) return
        
        const routerObject = this.generateRouter()
        //  路由文件能否生成
        if (!routerObject) return
        // 这里边好多直接退出的 --想想怎么弄 用变量 反正同步 直接return false  --- false的话就退出node
        const filesArray = this.generateVueCss()
        filesArray.push(routerObject)
        const promiseArr = this.createFilePromise(filesArray)
        try {
            await  Promise.all(promiseArr)
            // 保存文件信息  等待撤回
            await this.fileSavePromise(
                path.join(__dirname, this.jsonPath),
                JSON.stringify({
                    routerCode: this.originCode,
                    ComponentName: this.argv.ComponentName,
                    record: filesArray,
                    projectRoot: this.projectRoot
                }
                ))
        } catch (error) {
            this.log('文件生成失败\t ' + error)
        }
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
        const projectRoot = this.projectRoot

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
        const self = this
        const parentName = this.argv.parentName
        const projectRoot = this.projectRoot
        const checkRouterFile = this.hasFile(projectRoot, 'src/router/index.js')
        const originCode = this.originCode = (checkRouterFile ? this.readFile(projectRoot, 'src/router/index.js') : null) ||
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
        // 返回 false  外边判断直接退出

        let exitFlag = false
        traverse(ast, {
            VariableDeclarator(path) {
                if(path.node.id.name === self.argv.ComponentName) {
                    self.log(`${self.argv.componentName}\t 组件已存在，请更换组件名称`);
                    exitFlag = true
                    path.skip()
                }
                if( self.argv.parentName && path.node.id.name === self.argv.parentName) {
                    noParent = false
                }
            }
        })
        //  组件已经存在
        if (exitFlag)  return false
        if (self.argv.parentName) {
            // 命令行 有父级
            if (noParent) {
                this.log(`${parentName}\t 父级组件没找到，请检查后再试`);
                return false
            }
            // 二级路由遍历v  检查是否是第一个  children
            //  看 看 能不能找到 parent 上  children  属性
            let isChildren = false
            traverse(ast, {
                ObjectProperty(path) {
                    if (path.node.value.name === self.argv.parentName) {
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
                            if ( element.value && element.value.name === self.argv.parentName) {
                                path.node.elements.push(self.generateEl())
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
                            if ( element.value && element.value.name === self.argv.parentName) {
                                path.pushContainer('properties',  t.objectProperty(
                                    t.identifier('children'),
                                    t.arrayExpression([self.generateEl(true, true)])
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
                            path.node.elements.unshift(self.generateEl(false, true))
                        } else {
                            path.node.elements.splice(1, 0, self.generateEl(false, false))
                        }
                        path.skip()
                    }
                }
            })
        }
        const introduce = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(self.argv.ComponentName), 
            t.arrowFunctionExpression(
                [],
                t.callExpression(
                    t.import(),
                    [
                        t.stringLiteral(`${self.argv.isInsertParent ? 
                            '@/views/' + parentName + '/src/' + self.argv.ComponentName : 
                            '@/views/' + self.argv.ComponentName}`)
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
            .replace(/;(?=\n)/g, '')
       
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
        this.argv.metaParam && propertyArray.push(t.objectProperty(
            t.identifier('meta'),
            t.stringLiteral(this.argv.metaParam)
        ),t.objectProperty(
            t.identifier('name'),
            t.stringLiteral(this.argv.componentName)
        ))
        return t.objectExpression(propertyArray)
    }
    // 校验文件是否合
    checkDir(projectRoot) {
        if (!this.hasFile(projectRoot, 'src/views')) {
            this.log('views\t 缺少陈放组件的views文件夹')
            return false
            
        }
        if (!this.hasFile(projectRoot, 'src/router')) {
            this.log('router\t 缺少陈放路由配置的router文件夹')
            return false
        }
        return true
    }
    // 检查 命令是否合法
    checkCom(argv) {
        if (/^-.*/.test(argv.componentName)) {
            this.log(`${argv.componentName}\t 暂未提供 ${argv.componentName} API`)
            return false
        }
        if (/[^\w]/.test(argv.componentName)) {
            this.log(`${argv.componentName}\t 胡里花哨的组件命名是不允许的`)
            return false
        }
        return true
    }
    // 业务 还原上一次操作
    revoke() {
        const jsonPath = this.jsonPath
        if (!this.hasFile(__dirname, jsonPath) || !this.readFile(__dirname, jsonPath)) {
            this.log('revoke\t 暂无可撤销操作')
            return 
        }
    
        try {
            const files = JSON.parse(this.readFile(__dirname, jsonPath))
            if (files.projectRoot !== this.projectRoot) {
                this.log('revoke\t 当前项目暂无可撤销操作')
                return
            }
            // 把整个文件夹删除了
            if (files.record.length === 4) {
                // log(deleteFolderRecursive)
                this.deleteFolderRecursive(path.join(this.projectRoot, `./src/views/${files.ComponentName}`))
                this.log(`removeDir\t src/views/${files.ComponentName}`)
            } else {
                // 删除 文件
                for (const file of files.record) {
                    if (file.fileName !== 'router') {
                        fs.unlinkSync(path.join(this.projectRoot, file.fileDir))
                        this.log(`removeFile\t ${file.fileDir}`)
                    }
                }
            }
            fs.writeFileSync(path.join(this.projectRoot, `./src/router/index.js`), files.routerCode)
            this.log(`change\t src/router/index.js`)
            fs.writeFileSync(path.join(__dirname, jsonPath), '')
            // process.exit(0)
        } catch (err) {
            this.log('revoke\t 失败!文件解析错误\t ' + err)
            fs.writeFileSync(path.join(__dirname, jsonPath), '')
            return 
        }
    }

    fileSavePromise(path, content, logInfo){
        const self = this
        return new Promise((resolve,reject) => {
            try{
                fileSave(path)
                    .write(content, 'utf8')
                    .end()
                    .finish(()=>{
                        logInfo && self.log(logInfo)
                        resolve('data')
                    })
            } catch(err){
                reject(err)
            }
        })
    }

    createFilePromise(files) {
        const projectRoot = this.projectRoot
        // 优化代码
        // let promiseArr = []
        // for (const file of files) {
        //     const pathInfo = path.join(projectRoot, file.fileDir)
        //     const logInfo = `${file.action}\t ${file.fileDir}`
        //     const content = file.content
        //     promiseArr.push(
        //         this.fileSavePromise(pathInfo, content, logInfo)
        //     )
        // }   
        // return promiseArr

        return files.map(file => {
            const pathInfo = path.join(projectRoot, file.fileDir)
            const logInfo = `${file.action}\t ${file.fileDir}`
            const content = file.content
            return this.fileSavePromise(pathInfo, content, logInfo)
        })
    }

    /**
     *
     *
     * @param {Number} rank
     * @returns {String | false}
     */
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
            this.log('src\t 请移到项目内后再试')
            return false
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
    getMetaParam(arr) {
        //  会主动把  引号 去掉
        for (const iterator of arr) {
            if (iterator.startsWith('-m')) {
                return iterator.slice(2).toString()
            }
        }
        return false
    }
    getParser(argv) {
        // 历史遗留问题不能用库  入参就是如此奇葩
        if (argv.length === 0 ) {
            this.log('组件名称缺失\t ')
            return false
        }
        const componentName = argv[0] 
        const parentName = argv[1] && !argv[1].startsWith('-') ? uppercamelcase(argv[1]) : false
        const isInsertParent = argv[2] && argv[2] === '-t'
        const metaParam = this.getMetaParam(argv)
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
        var tokenReg = /(\\)?\{{([^\\{\\}\\]+)(\\)?\}}/g;
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
            fs.readdirSync(path).forEach(file => {
                const curPath = path + '/' + file
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    this.deleteFolderRecursive(curPath)
                } else { // delete file
                    fs.unlinkSync(curPath)
                }
            })
            fs.rmdirSync(path)
        }
    }

    allpath (source) {
        let all = []
        try {
            all = fs.readdirSync(path.join(this.cwd, source))
                .filter((v) => fs.lstatSync(path.join(this.cwd, source) + v).isDirectory()) 
        } catch (error) {
            console.log(error)
        }
        // 把错误吃掉返回文件夹
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
    /**
     *
     *
     * @returns
     * @description 报错
     */
    getException() {
        try {
            throw Error('')
        } catch (err) {
            return err
        }
    }

    log(info){
        info = info.replace(/^(.+)(?=\t+)/,'[$1]')
        if(!this.dev) {
            console.log('\x1B[32m%s\x1B[39m','☺ ' + info)
            return  
        }

        const err = this.getException()
        const stack = err.stack
        const regexp = /(\w+\.js):(\d+):\d+\)/g
        const callerFileNameAndLine = []
        let matches
        while ((matches = regexp.exec(stack)) !== null) {
            callerFileNameAndLine.push(matches)
        }
        console.log('\x1B[32m%s\x1B[39m', `[${callerFileNameAndLine[2][1]}]-[${callerFileNameAndLine[2][2]}][-][-][-]`  +'☺ ' + info)
    }
}