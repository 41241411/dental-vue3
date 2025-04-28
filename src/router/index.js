import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: 'dental',
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: {
      title: 'dental',
    },
  },
  {
    path: '/Content/:id',
    name: 'Content',
    component: () => import('../views/ContentView.vue'),
    meta: {
      title: 'dental',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // 統一使用 import.meta.env.BASE_URL
  routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title // 設置頁面標題
  }
  next()
})

export default router
