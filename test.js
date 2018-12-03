const acdddddd = () => import("@/components/acdddddd/index.vue");

const acddd = () => import("@/components/acddd/index.vue");

const acdddddeeddddddddddd = () => import("@/components/acdddddeeddddddddddd/index.vue");

const acdddddeedddddddd = () => import("@/components/acdddddeedddddddd/index.vue");

const acdddddeeddddd = () => import("@/components/acdddddeeddddd/index.vue");

const acdddddeedd = () => import("@/components/acdddddeedd/index.vue");

const liuji = () => import("@/components/liuji/index.vue");

const router = new Router({
  mode: 'history',
  routes: [{
    path: '/',
    redirect: '/datastatistics'
  }, {
    path: '/login',
    component: login
  }, {
    path: "Acdddddeedd",
    component: "acdddddeedd"
  }, {
    path: "Acdddddeeddddd",
    component: "acdddddeeddddd"
  }, {
    path: "Acdddddeedddddddd",
    component: "acdddddeedddddddd"
  }, {
    path: "Acdddddeeddddddddddd",
    component: "acdddddeeddddddddddd"
  }, {
    path: "Acddd",
    component: "acddd"
  }, {
    path: "Acdddddd",
    component: "acdddddd"
  }]
});