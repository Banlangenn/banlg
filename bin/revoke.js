#!/usr/bin/env node
'use strict';
process.on('exit', () => {
    console.log('');
});
const fs = require('fs')
const path  = require('path')
// util
// 重写console.log 带颜色
const log = info =>{console.log('\x1B[32m%s\x1B[39m',info)}
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
    log(path.join(projectRoot, filePath))
    return fs.existsSync(path.join(projectRoot, filePath))
}
function readFile (projectRoot,filepath) {
    return fs.readFileSync(path.resolve(projectRoot, filepath), 'utf-8')
}

// 开始


const projectRoot = searchPath(4)



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


// 开始
if (!hasFile(__dirname, './temporary.json')) {
    log('[revoke]\t 暂无可撤销操作')
    process.exit(1)
}

try {
    const files = JSON.parse(readFile(__dirname, './temporary.json'))
    if (files.record.length === 4) {
        deleteFolderRecursive(path.join(projectRoot, `./src/views/${files.ComponentName}`))
        log(`☺ [remove]\t  src/views/${files.ComponentName}`)
    } else {
        for (const file of files.record) {
            if (file.fileName !== 'router') {
                fs.unlinkSync(path.join(projectRoot, file.fileDir), (err) => {
                    if (err) {
                        log(err)
                    }
                    log(`☺ [remove]\t  ${file.fileDir}`)
                })
            }
            
        }
    }
    fs.writeFile(path.join(projectRoot, `./src/router/index.js`), files.routerCode, (err) => {
        if (err) {
            log(err)
        }
        log(`☺ [change]\t  src/router/index.js`)
        fs.unlinkSync(path.join(__dirname, './temporary.json'), (err) => {
            if (err) {
                log(err)
            }
            process.exit(0)
        })
    })
} catch (err) {
    log(err)
    log('[revoke]\t 失败!文件解析错误')
    process.exit(1)
}




