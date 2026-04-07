import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import CourseList from '../pages/CourseList.vue'
import About from '../pages/About.vue'
import CourseLayout from '../pages/course/CourseLayout.vue'
import CourseVideoView from '../pages/course/CourseVideoView.vue'
import CourseSimulationView from '../pages/course/CourseSimulationView.vue'
import CourseMaterialsView from '../pages/course/CourseMaterialsView.vue'
import CourseExerciseView from '../pages/course/CourseExerciseView.vue'
import CourseFeedbackView from '../pages/course/CourseFeedbackView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/courses', name: 'courses', component: CourseList },
    {
      path: '/course/:id',
      name: 'course-layout',
      component: CourseLayout,
      redirect: (to) => ({ path: `${to.path.replace(/\/$/, '')}/video` }),
      children: [
        { path: 'video', name: 'course-video', component: CourseVideoView },
        { path: 'simulation', name: 'course-simulation', component: CourseSimulationView },
        { path: 'materials', name: 'course-materials', component: CourseMaterialsView },
        { path: 'exercise', name: 'course-exercise', component: CourseExerciseView },
        { path: 'feedback', name: 'course-feedback', component: CourseFeedbackView },
      ],
    },
    { path: '/about', name: 'about', component: About },
  ],
})

export default router
