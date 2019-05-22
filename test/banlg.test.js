const fs = require('fs')
const path = require('path')
const assert = require('assert')
const tmps = ['../tmp/src/views/test.txt','../tmp/src/router/test.txt']
// const tmp = path.join(__dirname, '/../tmp')
const projectRoot = path.join(__dirname, '/../tmp/src/views')
const Command = require('./../bin/lib/command')
const fileSave = require('file-save')
let promiseArr = []
for (const item of tmps) {
    promiseArr.push(
        new Promise(function (resolve, reject) {
            try {
                fileSave(path.join(__dirname, item))
                .end()
                .finish(()=>{
                    resolve('data')
                })
            } catch (error) {
                reject(error)
            }
        })
    )
}
    
describe('test/init.test.js', () => {
    let command
    (async function () {
        command = new Command({dev: true})
        // command.deleteFolderRecursive(tmp)
        await Promise.all(promiseArr)
    })()
            
    it('banlg  banlanGen：没有src文件目录下', async function () {
        await command.run( path.join(__dirname, './'),['banlanGen'])
    })
    it('banlg  没有组件名称：创建组件', async function () {
        await command.run(projectRoot)
    })
        it('banlg banlanGen', async function () {
            await command.run(projectRoot, ['banlanGen'])
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/css/banlanGen.scss')))
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/index.js')))
            assert(fs.existsSync(path.join(command.projectRoot, 'src/router/index.js')))
        })
        it('banlg banlanGen：重复组件', async function () {
            await command.run(projectRoot, ['banlanGen'])
        })
        it('banlg children banlanGen：创建子组件', async function () {
            await command.run(projectRoot, ['children', 'banlanGen'])
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/Children/src/main.vue')))
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/Children/src/css/children.scss')))
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/Children/index.js')))
        })
        it('banlg -re：直接撤销撤销', async function () {
            await command.run(projectRoot, ['banlanGen777'])
        })
        it('banlg -re：直接撤销撤销', async function () {
            await command.run(projectRoot, ['-re'])
        })

        

        it('banlg children2 banlanGen -t：放到父组件肚子里的子组件', async function () {
            await command.run(projectRoot, ['children2', 'banlanGen', '-t'])
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/Children2.vue')))
            assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/css/Children2.scss')))
        })

        it('banlg -re：父组件内撤销', async function () {
            await command.run(projectRoot, ['-re'])
            assert(!fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/Children2.vue')))
            assert(!fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/css/Children2.scss')))
        })
        it('banlg -re：重复撤销', async function () {
            await command.run(projectRoot, ['-re'])
        })
        it('banlg children13 -m：设置mate name', async function () {
            await command.run(projectRoot, ['children13', '-m刘小姐'])
        })

        it('banlg  %u0u9hbk67^&%……：不符合命名规范', async function () {
            await command.run(projectRoot, ['%u0u9hbk67^&%……'])
        })

        it('banlg  -xxx：不是内置命令', async function () {
            await command.run(projectRoot, ['-xxxx'])
        })
        it('banlg  -xxx：dev-log', async function () {
            const command2 = new Command({dev: false})
            await command2.run(projectRoot, ['-xxxx'])
        })

        // 测试模板
})


