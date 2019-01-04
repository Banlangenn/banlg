
# banlg
```
banlg  comName  ?parentComName ?-t
根据命令
 1.更新router配置文件
 2.创建对应组件文件结构

 3.可自定义vue和css 模板
 4.接入现有项目，无需任何更改
 5.强制统一命名风格与组件结构，保障项目规范
 6.可撤销上次操作,让你无后顾之忧

``` 

## Installation

```bash
$ npm install banlg -g 
$ yarn global add banlg
（mac 遇到权限问题,在安装命令前加  sudo 即可）
```

## API
## banlg&ensp;comName&ensp;?parentComName&ensp;?-t
* `comName <String>`: 将要创建组件名称 
* `parentComName <String>`: 父组件名称(可选)
* `-t <flag>`: 是否插入当前父组件文件夹(可选)  

 :blush: ? 代表可选参数
## banlg&ensp;-re
* `-re <flag>`: 撤销上次操作:blush:删除文件,复原router( **只能撤销一次,并且无法回退**)
## 自定义组件模板
项目根目录[src同级]，可自定义组件模板:`vue.bl    css.bl`，  
模板内会传入下列变量，用{{xxxxxx}} 接收
 * componentName: 小驼峰**组件**名称,
 * ComponentName：大驼峰**组件**名称, 
 * toLowerLineCN: 中线**组件**名称
 * 例如：组件名称(banLanGen)：=> banLanGen => BanLanGen => ban-lan-gen
 ```
vue模板例子（css亦是如此）：
   <template>
       <div class="{{toLowerLineCN}}"></div>
   </template>
   <script>
   export default {
       name: '{{ComponentName}}',
   }
   </script>
   <style lang='scss' >
       @import './css/{{componentName}}.scss';
   </style>
 ```
## 内部命名规范
```bash
组件名称、组件文件名称 => 大驼峰
路由path、class类名 => '-'链接
```


## 能做什么
* -1根据命令行创建 组件目录并初始化文件内容
* -2按需引入组件
* -3修改router配置（美其名曰：解放双手
* -4自动区别path命名：routes[0].path='/'   children[0].path='' 

## 利于什么
* 1.用来规范团队的 -- 组件.路由.路由路径.命名(防止某些人起名字【胡里花哨】的)
* 2.节省一些（微微一些）人力，不用去创建文件和文件夹一节修改router配置文件
* 3.缩减一些（微微一些）项目周期
* 4.可撤销，让你无后顾之忧
* 5.接入现有项目，无需任何更改
