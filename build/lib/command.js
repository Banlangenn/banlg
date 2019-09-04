const fileSave = require('file-save');
const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const t = require('@babel/types');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const uppercamelcase = require('uppercamelcase');
module.exports = class Command {
    constructor(options) {
        options = options || {};
        this.name = options.name || 'banlg';
        this.revokeJsonPath = options.revokeJsonPath || './temporary.json';
        this.cssTemplate = options.cssTemplate || './css.bl';
        this.vueTemplate = options.vueTemplate || './vue.bl';
        this.dev = options.dev || false;
    }
    async run(cwd, args) {
        const argv = this.argv = this.parserArgv(args || []);
        if (!argv) {
            return;
        }
        this.cwd = cwd;
        this.projectRoot = this.searchPath(4);
        if (!this.projectRoot) {
            return;
        }
        if (!this.checkDir(this.projectRoot)) {
            return;
        }
        if (argv.componentName === '-re') {
            this.revoke();
            return;
        }
        if (!this.checkCom(argv)) {
            return;
        }
        const routerObject = this.generateRouter();
        if (!routerObject) {
            return;
        }
        const filesArray = this.generateVueCss();
        filesArray.push(routerObject);
        const promiseArr = this.createFilePromise(filesArray);
        try {
            await Promise.all(promiseArr);
            await this.fileSavePromise(path.join(__dirname, this.revokeJsonPath), JSON.stringify({
                routerCode: this.originCode,
                ComponentName: this.generatePath(this.argv.ComponentName),
                record: filesArray,
                projectRoot: this.projectRoot
            }));
        }
        catch (error) {
            this.log('文件生成失败\t ' + error);
        }
    }
    generateVueCss() {
        const componentName = this.argv.componentName;
        const ComponentName = this.argv.ComponentName;
        const lowerLineComName = this.argv.lowerLineComName;
        const parentName = this.argv.parentName;
        const isInsertParent = this.argv.isInsertParent;
        const projectRoot = this.projectRoot;
        const renderObject = {
            componentName,
            ComponentName,
            lowerLineComName
        };
        const vueContent = this.hasFile(projectRoot, this.vueTemplate) ?
            this.render(this.readFile(projectRoot, this.vueTemplate), renderObject) : null ||
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
        `;
        const cssContent = this.hasFile(projectRoot, this.cssTemplate) ?
            this.render(this.readFile(projectRoot, this.cssTemplate), renderObject) : null ||
            `.${lowerLineComName} {
                    
        
        
        
                    
}`;
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
        ];
        if (!isInsertParent) {
            files.push({
                fileDir: `src/views/${this.generatePath(ComponentName)}/index.js`,
                content: `import ${ComponentName} from './src/main'\nexport default ${ComponentName}`,
                fileName: 'index',
                action: 'create'
            });
        }
        return files;
    }
    generateRouter() {
        const self = this;
        const parentName = this.argv.parentName;
        const projectRoot = this.projectRoot;
        const checkRouterFile = this.hasFile(projectRoot, 'src/router/index.js');
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
        `;
        const ast = babelParser.parse(originCode, {
            sourceType: 'module',
            plugins: [
                'flow',
                'dynamicImport'
            ]
        });
        let noParent = true;
        let exitFlag = false;
        traverse(ast, {
            VariableDeclarator(astPath) {
                if (astPath.node.id.name === self.argv.ComponentName) {
                    self.log(`${self.argv.componentName}\t 组件已存在，请更换组件名称`);
                    exitFlag = true;
                    astPath.skip();
                }
                if (self.argv.parentName && astPath.node.id.name === self.argv.parentName) {
                    noParent = false;
                }
            }
        });
        if (exitFlag) {
            return false;
        }
        if (self.argv.parentName) {
            if (noParent) {
                this.log(`${parentName}\t 父级组件没找到，请检查后再试`);
                return false;
            }
            let isChildren = false;
            traverse(ast, {
                ObjectProperty(astPath) {
                    if (astPath.node.value.name === self.argv.parentName) {
                        if (astPath.parent.properties.some(element => {
                            return element.key.name === 'children';
                        })) {
                            isChildren = true;
                        }
                        astPath.skip();
                    }
                }
            });
            if (isChildren) {
                traverse(ast, {
                    ArrayExpression(astPath) {
                        const parent = astPath.findParent(p => p.isObjectProperty);
                        const properties = parent.parent.properties;
                        properties.forEach(element => {
                            if (element.value && element.value.name === self.argv.parentName) {
                                astPath.node.elements.push(self.generateEl());
                                astPath.skip();
                            }
                        });
                    }
                });
            }
            else {
                traverse(ast, {
                    ObjectExpression(astPath) {
                        const properties = astPath.node.properties;
                        properties.forEach(element => {
                            if (element.value && element.value.name === self.argv.parentName) {
                                astPath.pushContainer('properties', t.objectProperty(t.identifier('children'), t.arrayExpression([self.generateEl(true, true)])));
                                astPath.skip();
                            }
                        });
                    }
                });
            }
        }
        else {
            traverse(ast, {
                ArrayExpression(astPath) {
                    if (astPath.parent.key.name === 'routes') {
                        if (astPath.parent.value.elements.length === 1) {
                            astPath.node.elements.unshift(self.generateEl(false, true));
                        }
                        else {
                            astPath.node.elements.splice(1, 0, self.generateEl(false, false));
                        }
                        astPath.skip();
                    }
                }
            });
        }
        const introduce = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(self.argv.ComponentName), t.arrowFunctionExpression([], t.callExpression(t.import(), [
                t.stringLiteral(`${self.argv.isInsertParent ?
                    '@/views/' + parentName + '/src/' + self.argv.ComponentName :
                    '@/views/' + self.generatePath(self.argv.ComponentName)}`)
            ])))]);
        let lastImport = null;
        traverse(ast, {
            ImportDeclaration(astPath) {
                lastImport = astPath.node.source.value;
            }
        });
        traverse(ast, {
            ImportDeclaration(astPath) {
                if (astPath.node.source.value === lastImport) {
                    astPath.insertAfter(introduce);
                    astPath.skip();
                }
            }
        });
        const routerContent = generate(ast, {}).code
            .replace(/\n(\n)*()*(\n)*\n/g, '\n')
            .replace(/;(?=\n)/g, '');
        return {
            fileDir: `src/router/index.js`,
            content: routerContent,
            fileName: 'router',
            action: checkRouterFile ? 'change' : 'create'
        };
    }
    generatePath(com) {
        return this.argv.comPath ? this.argv.comPath + '/' + com : com;
    }
    generateEl(isChildren = true, isFirst = false) {
        const propertyArray = [t.objectProperty(t.identifier('path'), t.stringLiteral(`${isChildren ?
                (isFirst ? '' : this.toLowerLine(this.argv.componentName))
                : (isFirst ? '/' : '/' + this.toLowerLine(this.argv.componentName))}`)), t.objectProperty(t.identifier('component'), t.identifier(this.argv.ComponentName))];
        if (this.argv.metaParam) {
            propertyArray.push(t.objectProperty(t.identifier('meta'), t.stringLiteral(this.argv.metaParam)), t.objectProperty(t.identifier('name'), t.stringLiteral(this.argv.componentName)));
        }
        return t.objectExpression(propertyArray);
    }
    checkDir(projectRoot) {
        if (!this.hasFile(projectRoot, 'src/views')) {
            this.log('views\t 缺少陈放组件的views文件夹');
            return false;
        }
        if (!this.hasFile(projectRoot, 'src/router')) {
            this.log('router\t 缺少陈放路由配置的router文件夹');
            return false;
        }
        return true;
    }
    checkCom(argv) {
        if (/^-.*/.test(argv.componentName)) {
            this.log(`${argv.componentName}\t 暂未提供 ${argv.componentName} API`);
            return false;
        }
        if (/[!@#$%^&*]+/.test(argv.componentName)) {
            this.log(`${argv.componentName}\t 胡里花哨的组件命名是不允许的`);
            return false;
        }
        return true;
    }
    revoke() {
        const revokeJsonPath = this.revokeJsonPath;
        if (!this.hasFile(__dirname, revokeJsonPath) || !this.readFile(__dirname, revokeJsonPath)) {
            this.log('revoke\t 暂无可撤销操作');
            return;
        }
        try {
            const files = JSON.parse(this.readFile(__dirname, revokeJsonPath));
            if (files.projectRoot !== this.projectRoot) {
                this.log('revoke\t 当前项目暂无可撤销操作');
                return;
            }
            if (files.record.length === 4) {
                if (/\//.test(files.ComponentName)) {
                    console.log('========================');
                    console.log(files.ComponentName);
                    this.deleteFolderRecursive(path.join(this.projectRoot, `./src/views/${files.ComponentName}`));
                    const index = files.ComponentName.lastIndexOf('/');
                    const comPath = files.ComponentName.substr(0, index);
                    if (fs.readdirSync(path.join(this.projectRoot, `./src/views/${comPath}`)).length === 0) {
                        this.deleteFolderRecursive(path.join(this.projectRoot, `./src/views/${comPath}`));
                    }
                }
                else {
                    this.deleteFolderRecursive(path.join(this.projectRoot, `./src/views/${files.ComponentName}`));
                }
                this.log(`removeDir\t src/views/${files.ComponentName}`);
            }
            else {
                for (const file of files.record) {
                    if (file.fileName !== 'router') {
                        fs.unlinkSync(path.join(this.projectRoot, file.fileDir));
                        this.log(`removeFile\t ${file.fileDir}`);
                    }
                }
            }
            fs.writeFileSync(path.join(this.projectRoot, `./src/router/index.js`), files.routerCode);
            this.log(`change\t src/router/index.js`);
            fs.writeFileSync(path.join(__dirname, revokeJsonPath), '');
        }
        catch (err) {
            this.log('revoke\t 失败!文件解析错误\t ' + err);
            fs.writeFileSync(path.join(__dirname, revokeJsonPath), '');
        }
    }
    fileSavePromise(pathname, content, logInfo) {
        const self = this;
        return new Promise((resolve, reject) => {
            try {
                fileSave(pathname)
                    .write(content, 'utf8')
                    .end()
                    .finish(() => {
                    if (logInfo) {
                        self.log(logInfo);
                    }
                    resolve('data');
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
    createFilePromise(files) {
        const projectRoot = this.projectRoot;
        return files.map(file => {
            const pathInfo = path.join(projectRoot, file.fileDir);
            const logInfo = `${file.action}\t${file.fileDir}`;
            const content = file.content;
            return this.fileSavePromise(pathInfo, content, logInfo);
        });
    }
    searchPath(rank) {
        rank = rank > 4 ? 4 : rank;
        let dir = ['/', '/../', '/../../', '/../../../'];
        dir = dir.slice(0, rank);
        let srcpath = '';
        for (const v of dir) {
            if (this.allpath(v).includes('src')) {
                srcpath = path.join(this.cwd, v);
                break;
            }
        }
        if (!srcpath) {
            this.log('src\t 请移到项目内后再试');
            return srcpath;
        }
        return srcpath;
    }
    toLowerLine(str) {
        let temp = str.replace(/([A-Z])/g, '-$1').toLowerCase();
        if (temp.slice(0, 1) === '-') {
            temp = temp.slice(1);
        }
        return temp;
    }
    getMetaParam(arr) {
        for (const iterator of arr) {
            if (iterator.startsWith('-m')) {
                return iterator.slice(2).toString();
            }
        }
        return false;
    }
    parserArgv(argv) {
        if (argv.length === 0) {
            this.log('组件名称缺失\t ');
            return false;
        }
        const isInsertParent = argv[2] && argv[2] === '-t';
        if (isInsertParent) {
            if (/\//.test(argv[0])) {
                this.log(`${argv[0]}\t 插入父组件的不允许有路径`);
                return false;
            }
        }
        let componentName = argv[0].replace(/^\//, '').replace(/\/$/, '');
        let comPath = false;
        if (/\//.test(componentName)) {
            const index = componentName.lastIndexOf('/');
            comPath = componentName.substr(0, index);
            componentName = componentName.substr(index + 1);
        }
        const parentName = argv[1] && !argv[1].startsWith('-') ? uppercamelcase(argv[1]) : false;
        const metaParam = this.getMetaParam(argv);
        const ComponentName = uppercamelcase(componentName);
        const lowerLineComName = this.toLowerLine(componentName);
        return {
            componentName,
            ComponentName,
            lowerLineComName,
            parentName,
            isInsertParent,
            metaParam,
            comPath,
        };
    }
    render(template, context) {
        const tokenReg = /(\\)?\{{([^\\{\\}\\]+)(\\)?\}}/g;
        return template.replace(tokenReg, (word, slash1, token, slash2) => {
            if (slash1 || slash2) {
                return word.replace('\\', '');
            }
            const variables = token.replace(/\s/g, '').split('.');
            let currentObject = context;
            for (const item of variables) {
                currentObject = currentObject[item];
                if (currentObject === undefined || currentObject === null) {
                    return '<没有提供此变量>';
                }
            }
            return currentObject;
        });
    }
    deleteFolderRecursive(pathname) {
        if (fs.existsSync(pathname)) {
            fs.readdirSync(pathname).forEach(file => {
                const curPath = pathname + '/' + file;
                if (fs.statSync(curPath).isDirectory()) {
                    this.deleteFolderRecursive(curPath);
                }
                else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(pathname);
        }
    }
    allpath(source) {
        let all = [];
        try {
            all = fs.readdirSync(path.join(this.cwd, source))
                .filter((v) => fs.lstatSync(path.join(this.cwd, source) + v).isDirectory());
        }
        catch (error) {
            console.log(error);
        }
        return all;
    }
    hasFile(projectRoot, filePath) {
        return fs.existsSync(path.join(projectRoot, filePath));
    }
    readFile(projectRoot, filePath) {
        return fs.readFileSync(path.join(projectRoot, filePath), 'utf-8');
    }
    getException() {
        try {
            throw Error('');
        }
        catch (err) {
            return err;
        }
    }
    log(info) {
        info = info.replace(/^(.+)(?=\t+)/, '[$1]');
        console.log('\x1B[32m%s\x1B[39m', '☺' + info);
    }
};
//# sourceMappingURL=command.js.map