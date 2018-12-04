
# banlg
```
banlg  com  ?parentcom
根据命令
 1.更新router配置文件
 2.创建对应组件文件结构
``` 

## Installation

```bash
$ npm install banlg -g
$ yarn global add banlg
```

## API
# banlg  com   ?parentcom
* `com <String>`: 将要创建组件名称 
* `parentcom <String>`: 父组件名称(可选)
* 命名规则：驼峰  =>  生成的路由path 用'-'连接
* tips ? 代表可选参数

## 能做什么
* -1根据命令行创建 组件目录并初始化文件内容
* -2按需引入组件
* -3修改router配置（美其名曰：解放双手）

## 利于什么
* 1.用来规范团队的 -- 组件.路由.路由路径.命名(防止某些人起名字【胡里花哨】的)
* 2.节省一些（微微一些）人力，不用去创建文件和文件夹一节修改router配置文件
* 3.缩减一些（微微一些）项目周期
