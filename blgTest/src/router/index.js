/* eslint-disable */
import Vue from "vue";
import Router from "vue-router";

const BanLanGen = () => import("@/views/BanLanGen");

Vue.use(Router);
export default new Router({
  mode: 'history',
  routes: [{
    path: "/",
    component: BanLanGen
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