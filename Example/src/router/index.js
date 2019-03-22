/* eslint-disable */
import Vue from "vue";
import Router from "vue-router";

const BlgChildren2 = () => import("@/views/BanLanGen/src/BlgChildren2");

const BlgChildren1 = () => import("@/views/BanLanGen/src/BlgChildren1");

const BlgChildren = () => import("@/views/BlgChildren");

const BanLanGen = () => import("@/views/BanLanGen");

Vue.use(Router);
export default new Router({
  mode: 'history',
  routes: [{
    path: "/",
    component: BanLanGen,
    children: [{
      path: "",
      component: BlgChildren
    }, {
      path: "blg-children1",
      component: BlgChildren1
    }, {
      path: "blg-children2",
      component: BlgChildren2
    }]
  }, {
    path: "*",
    redirect: "/"
  }],

  scrollBehavior(to, from) {
    return {
      x: 0,
      y: 0
    };
  }

});