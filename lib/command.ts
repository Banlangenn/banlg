// 大方的说：就是抄egg  https://github.com/eggjs/egg-init/blob/master/lib/init_command.js
// tslint:disable-next-line:no-var-requires
const fileSave = require('file-save');
// tslint:disable-next-line:no-var-requires
const fs = require('fs');
// tslint:disable-next-line:no-var-requires
const path = require('path');
// tslint:disable-next-line:no-var-requires
const babelParser = require('@babel/parser');
// tslint:disable-next-line:no-var-requires
const t = require('@babel/types')
// tslint:disable-next-line:no-var-requires
const generate = require('@babel/generator').default
// tslint:disable-next-line:no-var-requires
const traverse = require('@babel/traverse').default
// tslint:disable-next-line:no-var-requires
const uppercamelcase = require('uppercamelcase');
module.exports = class Command {
    private name: string
    private revokeJsonPath: string
    private cssTemplate: string
    private vueTemplate: string
    private dev: boolean
    private argv: any
    private cwd: string
    private projectRoot: string
    private originCode: string
    constructor(options) {
        options = options || {}
        this.name = options.name || 'banlg'
        this.revokeJsonPath = options.revokeJsonPath || './temporary.json'
        this.cssTemplate = options.cssTemplate || './css.bl'
        this.vueTemplate = options.vueTemplate || './vue.bl'
        this.dev = options.dev || false // 打错误 log
    }
   
    public async run(cwd:string, args: string[]): Promise<void> {
        const argv = this.argv = this.parserArgv(args || [])
        if (!argv) { return }
        this.cwd = cwd
        // 能不能找到 src
        this.projectRoot = this.searchPath(4)
        if (!this.projectRoot) { return }
        //  检查文件合法
        if(!this.checkDir(this.projectRoot)) { return }
        // 撤销指令
        if (argv.componentName === '-re') {
            this.revoke()
            return
        }
        // 未被拦截的'-'开头不是内置命令
        //  检查命令的 合法性
        if (!this.checkCom(argv)) { return }
        
        const routerObject = this.generateRouter()
        //  路由文件能否生成
        if (!routerObject) { return }
        const filesArray = this.generateVueCss()
        filesArray.push(routerObject)
        const promiseArr = this.createFilePromise(filesArray)
        try {
            await  Promise.all(promiseArr)
            // 保存文件信息  等待撤回
            await this.fileSavePromise(
                path.join(__dirname, this.revokeJsonPath),
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
    private generateVueCss():Array<{
        fileDir: string;
        content: string;
        fileName: string;
        action: string;
    }> {
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
        // console.log('--------------------vueTemplate------------------------------------')
        // console.log(this.readFile(projectRoot, this.vueTemplate))
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
        // console.log('================cssTemplate======================')
        // console.log(this.readFile(projectRoot, this.cssTemplate))
        
        const cssContent = this.hasFile(projectRoot,this.cssTemplate) ?
            this.render(this.readFile(projectRoot, this.cssTemplate) , renderObject) : null ||
`.${lowerLineComName} {
                    
        
        
        
                    
}`

    // 路径 问题  1.  普通组件  直接拼接就行了 2 父组件内
        
        const files = [
            {
                fileDir: isInsertParent ? `src/views/${parentName}/src/${ComponentName}.vue` : `src/views/${this.generatePath(ComponentName)}/src/main.vue`,
                content: vueContent,
                fileName: 'main',
                action: 'create'
            },
            {
                fileDir: isInsertParent ? `src/views/${parentName}/src/css/${componentName}.scss` : `src/views/${this.generatePath(ComponentName)}/src/css/${componentName}.scss`,
                content: cssContent,
                fileName: 'scss',
                action: 'create'
            }
        ]
        // 组件的 index.js：插入到父组件内 是不用index.js的
        if (!isInsertParent) {
            files.push({
                fileDir: `src/views/${this.generatePath(ComponentName)}/index.js`,
                content:
                `import ${ComponentName} from './src/main'\nexport default ${ComponentName}`,
                fileName:'index',
                action: 'create'
            })
        }
        return files
    }
    private generateRouter() {
        // tslint:disable-next-line:no-this-assignment
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
            VariableDeclarator(astPath) {
                if(astPath.node.id.name === self.argv.ComponentName) {
                    self.log(`${self.argv.componentName}\t 组件已存在，请更换组件名称`);
                    exitFlag = true
                    astPath.skip()
                }
                if( self.argv.parentName && astPath.node.id.name === self.argv.parentName) {
                    noParent = false
                }
            }
        })
        //  组件已经存在
        if (exitFlag) {  return false }
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
                ObjectProperty(astPath) {
                    if (astPath.node.value.name === self.argv.parentName) {
                        if (astPath.parent.properties.some(element => {
                            return element.key.name === 'children'
                        })) {
                            isChildren = true
                        }
                        astPath.skip()
                    }
                }
                
            })
            // log(`[${parentName}]\t 父级路由下是否有Children\t ${isChildren}`)
            // 这连个可以合成以一个
            if (isChildren) {
                traverse(ast, {
                    ArrayExpression(astPath) {
                        const parent = astPath.findParent(p => p.isObjectProperty)
                        const properties = parent.parent.properties
                        properties.forEach(element => {
                            if ( element.value && element.value.name === self.argv.parentName) {
                                astPath.node.elements.push(self.generateEl())
                                astPath.skip()
                            }
                        })
                    }
                })
            } else {
                traverse(ast, {
                    ObjectExpression(astPath) {
                        const properties = astPath.node.properties
                        properties.forEach(element => {
                            if ( element.value && element.value.name === self.argv.parentName) {
                                astPath.pushContainer('properties',  t.objectProperty(
                                    t.identifier('children'),
                                    t.arrayExpression([self.generateEl(true, true)])
                                ))
                                astPath.skip()
                            }
                        })
                    }
                })
            }
        } else {
        // 按在一级路由
            traverse(ast, {
                ArrayExpression(astPath) {
                    if(astPath.parent.key.name === 'routes') {
                        if (astPath.parent.value.elements.length === 1) {
                            astPath.node.elements.unshift(self.generateEl(false, true))
                        } else {
                            astPath.node.elements.splice(1, 0, self.generateEl(false, false))
                        }
                        astPath.skip()
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
                            '@/views/' + self.generatePath(self.argv.ComponentName)}`)
                    ]
                )
            )
        )])
        // 找到最后一个 import
        let lastImport = null 
        traverse(ast, {
            ImportDeclaration(astPath) {
                lastImport = astPath.node.source.value
            }
        })
        // 把   引入组件 插入最后一个 import  后边
        traverse(ast, {
            ImportDeclaration(astPath) {
                if(astPath.node.source.value === lastImport) {
                    astPath.insertAfter(introduce)
                    astPath.skip()
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
    private generatePath(com: string):string {
        return this.argv.comPath ? this.argv.comPath + '/'+ com : com
    }
    // 生成的 {}  是不是 子路由    是不是第一个 路由 
    private generateEl(isChildren = true, isFirst = false) {
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
        if (this.argv.metaParam) {
            propertyArray.push(t.objectProperty(
                t.identifier('meta'),
                t.stringLiteral(this.argv.metaParam)
            ),t.objectProperty(
                t.identifier('name'),
                t.stringLiteral(this.argv.componentName)
            ))
        }
        return t.objectExpression(propertyArray)
    }
    // 校验文件是否合
    private checkDir(projectRoot:string):boolean {
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
    private checkCom(argv:{
        componentName: string;
        ComponentName: string;
        lowerLineComName: string;
        parentName: string;
        isInsertParent: boolean;
        metaParam: string | boolean;
        comPath: string | boolean;
    }) {
        if (/^-.*/.test(argv.componentName)) {
            this.log(`${argv.componentName}\t 暂未提供 ${argv.componentName} API`)
            return false
        }
        if (/[!@#$%^&*]+/.test(argv.componentName)) {
            // console.log(argv.componentName + '=-------======----------==有特殊字符')
            this.log(`${argv.componentName}\t 胡里花哨的组件命名是不允许的`)
            return false
        }
        return true
    }
    // 业务 还原上一次操作
    private revoke() {
        const revokeJsonPath = this.revokeJsonPath
        if (!this.hasFile(__dirname, revokeJsonPath) || !this.readFile(__dirname, revokeJsonPath)) {
            this.log('revoke\t 暂无可撤销操作')
            return 
        }
    
        try {
            const files = JSON.parse(this.readFile(__dirname, revokeJsonPath))
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
            fs.writeFileSync(path.join(__dirname, revokeJsonPath), '')
            // process.exit(0)
        } catch (err) {
            this.log('revoke\t 失败!文件解析错误\t ' + err)
            fs.writeFileSync(path.join(__dirname, revokeJsonPath), '')
        }
    }

    private fileSavePromise(pathname:string, content:string, logInfo?:string){
        // tslint:disable-next-line:no-this-assignment
        const self = this
        return new Promise((resolve, reject) => {
            try{
                console.log(pathname)
                fileSave(pathname)
                    .write(content, 'utf8')
                    .end()
                    .finish(()=>{
                        // tslint:disable-next-line:no-unused-expression
                        if (logInfo) {
                            self.log(logInfo)
                        }
                        resolve('data')
                    })
            } catch(err){
                reject(err)
            }
        })
    }

    private createFilePromise(files) {
        const projectRoot = this.projectRoot
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
    private searchPath (rank:number): string {
        rank = rank > 4 ? 4 : rank
        let dir  = ['/', '/../', '/../../','/../../../']
        dir = dir.slice(0, rank)
        let srcpath:string = ''
        for (const v of dir) {
            if (this.allpath(v).includes('src')) {
                srcpath = path.join(this.cwd, v)
                break
            }
        }
        if (!srcpath) {
            this.log('src\t 请移到项目内后再试')
            return srcpath
        }
        return srcpath
    }

    private toLowerLine(str:string):string {
        let temp = str.replace(/([A-Z])/g, '-$1').toLowerCase()
        if (temp.slice(0,1) === '-') { // 如果首字母是大写，执行replace时会多一个_，这里需要去掉
            temp = temp.slice(1)
        }
        return temp
    }
    private getMetaParam(arr:string[]):boolean|string{
        //  会主动把  引号 去掉
        for (const iterator of arr) {
            if (iterator.startsWith('-m')) {
                return iterator.slice(2).toString()
            }
        }
        return false
    }
    private parserArgv(argv:string[]):false | {
        componentName: string;
        ComponentName: string;
        lowerLineComName: string;
        parentName: string;
        isInsertParent: boolean;
        metaParam: string | boolean;
        comPath: string | boolean;
    }{
        // 历史遗留问题不能用库  入参就是如此奇葩
        if (argv.length === 0 ) {
            this.log('组件名称缺失\t ')
            return false
        }
        // 是不是插入父组件
        const isInsertParent = argv[2] && argv[2] === '-t'

        // 可能会传入路径  例如  seer/dsdsd 目录路径
        if (isInsertParent) {
            if (/\//.test(argv[0])) {
                // console.log('========================================================')
                this.log(`${argv[0]}\t 插入父组件的不允许有路径`)
                return false
            }
        }

        // banlg comName ?parentComName ?-t
        let componentName =  argv[0].replace(/^\//, '').replace(/\/$/, '')
        let comPath: string | boolean = false
        if (/\//.test(componentName)) {
            // console.log('==========================================================');
            // console.log('组件名称有斜杠路径');
            // return false
            const index = componentName.lastIndexOf('/')
            comPath = componentName.substr(0, index)
            componentName = componentName.substr(index + 1)
        }
        // const componentName = argv[0]
        const parentName = argv[1] && !argv[1].startsWith('-') ? uppercamelcase(argv[1]) : false
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
            comPath,
        }
    }

    private render(template:string, context: any):string {
        // 被转义的的分隔符 { 和 } 不应该被渲染，分隔符与变量之间允许有空白字符
        const tokenReg = /(\\)?\{{([^\\{\\}\\]+)(\\)?\}}/g;
        return template.replace(tokenReg,  (word, slash1, token, slash2) => {
            // 如果有转义的\{或\}替换转义字符
            if (slash1 || slash2) {  
                return word.replace('\\', '');
            }
            // 切割 token ,实现级联的变量也可以展开
            const variables = token.replace(/\s/g, '').split('.'); 
            let currentObject = context;
            // tslint:disable-next-line:one-variable-per-declaration
            for (const item of variables) {
                currentObject = currentObject[item];
                // 如果当前索引的对象不存在，则直接返回<没有提供此变量>。
                if (currentObject === undefined || currentObject === null) { return '<没有提供此变量>'; }
            }
            return currentObject;
        })
    }

    public deleteFolderRecursive(pathname:string):void {
        if( fs.existsSync(pathname) ) {
            fs.readdirSync(pathname).forEach(file => {
                const curPath = pathname + '/' + file
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    this.deleteFolderRecursive(curPath)
                } else { // delete file
                    fs.unlinkSync(curPath)
                }
            })
            fs.rmdirSync(pathname)
        }
    }

    private allpath (source: string):string[] {
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
    private hasFile (projectRoot: string, filePath: string): boolean {
        return fs.existsSync(path.join(projectRoot, filePath))
    }

    private readFile (projectRoot: string, filePath: string): string {
        return fs.readFileSync(path.join(projectRoot, filePath), 'utf-8')
    }
    /**
     *
     *
     * @returns
     * @description 报错
     */
    private getException(): any {
        try {
            throw Error('')
        } catch (err) {
            return err
        }
    }

    private log(info: string):void{
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
        // tslint:disable-next-line:no-conditional-assignment
        while ((matches = regexp.exec(stack)) !== null) {
            callerFileNameAndLine.push(matches)
        }
        console.log('\x1B[32m%s\x1B[39m', `[${callerFileNameAndLine[2][1]}]-[${callerFileNameAndLine[2][2]}][-][-][-]`  +'☺ ' + info)
    }
}