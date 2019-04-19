/* eslint-disable */
import Vue from "vue";
import Router from "vue-router";

const V19 = () => import("@/views/X7/src/V19");

const V18 = () => import("@/views/X7/src/V18");

const Vv = () => import("@/views/X7/src/Vv");

const Vv2 = () => import("@/views/Vv2");

const Vv1 = () => import("@/views/Vv1");

const X7 = () => import("@/views/X7");

const X6 = () => import("@/views/X6");

Vue.use(Router);
export default new Router({
  mode: 'history',
  routes: [{
    path: "/",
    component: X6,
    meta: "sdsd"
  }, {
    path: "/x7",
    component: X7,
    meta: "sdsd",
    children: [{
      path: "",
      component: Vv1,
      meta: "sdsd"
    }, {
      path: "v-v2",
      component: Vv2,
      meta: "sdsd"
    }, {
      path: "vv",
      component: Vv,
      meta: "sdsd"
    }, {
      path: "v18",
      component: V18
    }, {
      path: "v19",
      component: V19,
      meta: "25"
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