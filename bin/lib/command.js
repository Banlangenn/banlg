// 大方的说：就是抄egg  https://github.com/eggjs/egg-init/blob/master/lib/init_command.js
// const fileSave = require('file-save');
// const babelParser = require('@babel/parser')
// const t = require('@babel/types')
// const generate = require('@babel/generator').default
// const traverse = require('@babel/traverse').default
const uppercamelcase = require('uppercamelcase')
module.exports = class Command {
    constructor(options) {
        options = options || {}
        this.name = options.name || 'banlg'
    }
    run(cwd, args) {
        this.argv = this.getParser(args || [])
        this.cwd = cwd
        this.projectRoot = this.searchPath()
        if (!this.hasFile(projectRoot, 'src/views')) {
            this.log('[views]\t 缺少陈放组件的views文件夹')
            process.exit(1)
        }
        if (!this.hasFile(projectRoot, 'src/router')) {
            this.log('[router]\t 缺少陈放路由配置的router文件夹')
            process.exit(1)
        }
        
    }

    searchPath (rank) {
        rank = rank > 4 ? 4 : rank
        let dir  = ['/', '/../', '/../../','/../../../']
        dir = dir.slice(0, rank)
        let srcpath = null
        for (const v of dir) {
            if (this.allpath(v).includes('src')) {
                srcpath = path.join(process.cwd(), v)
                break
            }
        }
        if (!srcpath) {
            this.log('[src]\t 请移到项目内后再试')
            process.exit(1)
        }
        return srcpath
    }

    getParser(argv) {
        // 历史遗留问题不能用库  入参就是如此奇葩
        if (argv.length === 0 ) {
            this.log('[组件名称缺失] \t ');
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
        return {
            uppercamelcase,
            componentName,
            ComponentName,
            parentName,
            isInsertParent,
            metaParam
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