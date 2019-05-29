/*global it  describe*/
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const tmps = [
    {
        path: '../tmp/src/test.txt',
        content: ''
    },{
        path: '../tmp/src/views/test.txt',
        content: ''
    },{
        path:'../tmp/src/router/test.txt',
        content: ''
    },{
        path: '../tmp/vue.bl',
        content: `
        {{componentName}}========
        {{ComponentName}}===========
        {{lowerLineComName}}============
        {{lowerLineComN}}`
    },{
        path: '../tmp/css.bl',
        content: `
        {{componentName}}========
        {{ComponentName}}===========
        {{lowerLineComName}}============\n
        {{lowerLineComN}}`
    }
]
const isrf = false
const tmp = path.join(__dirname, '/../tmp')
const projectRoot = path.join(__dirname, '/../tmp/src')
const Command = require('./../lib/command')
const fileSave = require('file-save')
let promiseArr = []
for (const item of tmps) {
    promiseArr.push(
        () => new Promise(function (resolve, reject) {
            try {
                fileSave(path.join(__dirname, item.path))
                    .write(item.content)
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
    (async  () =>{
        command = new Command({dev: true})
        //  清掉本地文件
        command.deleteFolderRecursive(tmp)
        await promiseArr.shift()()
    })()
    // 文件是否存在 
    it('banlg  banlanGen：没有src文件目录下', async  () => {
        await command.run( path.join(__dirname, './'),['banlanGen'])
    })
    it('banlg banlanGen： 没有views文件夹', async  () => {
        await command.run(projectRoot, ['banlanGen'])
    })
    it('banlg banlanGen： 没有router文件夹', async  () => {
        await promiseArr.shift()()
        await command.run(projectRoot, ['banlanGen'])
        await promiseArr.shift()()
    })  

    // 业务测试
    it('banlg  没有组件名称：创建组件', async  () =>{
        await command.run(projectRoot)
    })

    it('banlg banlanGen', async  () => {
        await command.run(projectRoot, ['banlanGen'])
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/css/banlanGen.scss')))
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/index.js')))
        assert(fs.existsSync(path.join(command.projectRoot, 'src/router/index.js')))
    })
    it('banlg banlanGen：重复组件', async () => {
        await command.run(projectRoot, ['banlanGen'])
    })
    it('banlg children banlanGen：创建子组件', async () => {
        await command.run(projectRoot, ['children', 'banlanGen'])
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/Children/src/main.vue')))
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/Children/src/css/children.scss')))
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/Children/index.js')))
    })
    it('banlg newChildren banlanGen15：没有找到父组件', async () => {
        await command.run(projectRoot, ['newChildren', 'banlanGen15'])
    })
    it('banlg banlanGen777 -> banlg -re：删除文件撤销', async  () => {
        await command.run(projectRoot, ['banlanGen777'])
        await command.run(projectRoot, ['-re'])
    })

    it('banlg children2 banlanGen -t：放到父组件肚子里的子组件', async () =>{
        await command.run(projectRoot, ['children2', 'banlanGen', '-t'])
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/Children2.vue')))
        assert(fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/css/children2.scss')))
    })

    it('banlg -re：父组件内撤销', async () => {
        await command.run(projectRoot, ['-re'])
        assert(!fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/Children2.vue')))
        assert(!fs.existsSync(path.join(command.projectRoot, 'src/views/BanlanGen/src/css/children2.scss')))
    })
    it('banlg -re：重复撤销', async () =>  {
        await command.run(projectRoot, ['-re'])
    })


    it('banlg children13 -m：设置mate name', async () =>  {
        await command.run(projectRoot, ['children13', '-m刘小姐'])
    })

    it('banlg  %u0u9hbk67^&%……：不符合命名规范', async () =>  {
        await command.run(projectRoot, ['%u0u9hbk67^&%……'])
    })

    it('banlg  -xxx：不是内置命令', async () =>  {
        await command.run(projectRoot, ['-xxxx'])
    })
    it('banlg  -xxx：dev-log', async () =>  {
        const command2 = new Command({dev: false})
        await command2.run(projectRoot, ['-xxxx'])
    })

    // 测试模板
    // 模板是否存在
    it('banlg banlanGenTmp css vue模板', async () =>{
        await promiseArr.shift()()   // 生成测试模板
        await promiseArr.shift()()  // 生成测试模板
        // 为甚什么没有等待。。。
        await command.run(projectRoot, ['banlanGenTmp'])
    }) 
    it('banlg -re：撤销 banlanGenTmp', async () =>  {
        await command.run(projectRoot, ['-re'])
        isrf && command.deleteFolderRecursive(tmp)
    })
       
})


