import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import CourseList from '../pages/CourseList.vue'
import CourseDetail from '../pages/CourseDetail.vue'
import About from '../pages/About.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/courses', name: 'courses', component: CourseList },
    { path: '/course/:id', name: 'course-detail', component: CourseDetail, props: true },
    { path: '/about', name: 'about', component: About },
  ],
})

export default router

