# banlg
[![Build Status](https://www.travis-ci.org/Banlangenn/banlg.svg?branch=master)](https://www.travis-ci.org/Banlangenn/banlg) [![codecov](https://codecov.io/gh/Banlangenn/banlg/branch/master/graph/badge.svg)](https://codecov.io/gh/Banlangenn/banlg)


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
***banlg&ensp;comName&ensp;?parentComName&ensp;?-t***
* `comName <String>`: 将要创建组件名称 
* `parentComName <String>`: 父组件名称(可选)
* `-t <flag>`: 是否插入当前父组件文件夹(可选)  
 :blush:? 代表可选参数
<u>命令和路由是有对应关系的</u>
```js
banlg comName  //（直接建立路由和组件文件和文件文件夹）
banlg comName parentComName  //（建立parentComName  的 comName 子路由）
banlg comName parentComName -t
 //（创建parentComName  的 comName 子路由，并且文件放在parentComName  文件夹下边）
```
***banlg&ensp;-re*** 
 * `-re <flag>`: 撤销上次操作:blush:删除文件,复原router，挽救于水火之中( **只能撤销一次,并且无法反向回退：慎用**)
## 自定义组件模板
项目根目录[src同级]，可自定义组件模板:`vue.bl    css.bl`，  
模板内会传入下列变量，用{{xxxxxx}} 接收 
  * componentName: 小驼峰**组件**名称
  * ComponentName：大驼峰**组件**名称
  * toLowerLineCN: 中线**组件**名称 

  例如：组件名称(banLanGen)：=> banLanGen => BanLanGen => ban-lan-gen 
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
1. 根据命令行创建 组件目录并初始化文件内容
2. 按需引入组件
3. 修改router配置（美其名曰：解放双手
4. 自动区别path命名：routes[0].path='/'   children[0].path='' 

## 利于什么
* 用来规范团队的 -- 组件.路由.路由路径.命名(防止某些人起名字【胡里花哨】的)
* 节省一些（微微一些）人力，不用去创建文件和文件夹一节修改router配置文件
* 缩减一些（微微一些）项目周期
* 可撤销，让你无后顾之忧
* 接入现有项目，无需任何更改
## -完！
<details>
  <summary><mark><font color=darkred>常见问题</font></mark></summary>
  <p> 1. 需要准备什么前置文件？<strong>答：跟着提示做就行。 </strong></p>
  <p> 2. 在什么文件夹下能用？<strong>答：项目内就行。</strong></p>
  <p> 3. 旧项目能用吗？<strong>答：能！（符合vue约定目录router/views）</strong></p>
  <p> 4. 待补充...</p>
</details>
