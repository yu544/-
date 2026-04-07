import { computed } from 'vue'
import { useRoute } from 'vue-router'
import courses from '../data/courses.json'

/** 供卡片等组件使用：不足 1 分钟时用秒展示 */
export function formatCourseDurationZh(c) {
  const m = c?.timeMinutes
  if (m == null || Number.isNaN(m)) return ''
  if (m > 0 && m < 1) return `${Math.round(m * 60)} 秒`
  return `${m} 分钟`
}

export function formatCourseDurationEn(c) {
  const m = c?.timeMinutes
  if (m == null || Number.isNaN(m)) return ''
  if (m > 0 && m < 1) return `${Math.round(m * 60)} sec`
  return `${m} min`
}

export function useCourse() {
  const route = useRoute()
  const courseId = computed(() => String(route.params.id ?? ''))
  const course = computed(() => courses.find((c) => c.id === courseId.value) ?? courses[0])
  const durationLabelZh = computed(() => formatCourseDurationZh(course.value))
  return { route, courseId, course, durationLabelZh }
}
