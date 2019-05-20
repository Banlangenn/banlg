const fs = require('fs')
const path  = require('path')
//  this 访问的是  整个全局：用的时候赋值给新变量导致的

function allpath (source) {
    let all = []
    try {
        all = fs.readdirSync(path.join(process.cwd(), source))
        .filter((v) => fs.lstatSync(path.join(process.cwd(), source) + v).isDirectory()) 
    } catch (error) {}
    return all
}
function log(info) {
    console.log('\x1B[32m%s\x1B[39m',info)
}
function deleteFolderRecursive(path) {
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
function toLowerLine(str) {
    let temp = str.replace(/([A-Z])/g,"-$1").toLowerCase()
      if (temp.slice(0,1) === '-') { //如果首字母是大写，执行replace时会多一个_，这里需要去掉
          temp = temp.slice(1)
      }
    return temp
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
function readFile (projectRoot, filePath) {
    return fs.readFileSync(path.resolve(projectRoot, filePath), 'utf-8')
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



// exports.Utils = Utils // 对象上还有个{Utils}
module.exports = {
    allpath,
    log,
    deleteFolderRecursive,
    toLowerLine,
    searchPath,
    hasFile,
    readFile,
    render
} 