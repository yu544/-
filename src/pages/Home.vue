<script setup>
import CourseCard from '../components/CourseCard.vue'
import courses from '../data/courses.json'

const recommended = courses[0]
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero-glow" aria-hidden="true" />
      <div class="hero-inner">
        <div class="hero-left">
          <div class="hero-eyebrow">
            <span class="dot" />
            全国大学生计算机设计大赛 · 微课与 AI 辅助教学
          </div>
          <h1 class="hero-title">
            用故事讲透算法，<br /><span class="hero-title-accent">用交互验证直觉</span>
          </h1>
          <p class="hero-desc">
            策算学堂以微课视频为核心，配套虚拟仿真实验、课件资料、在线练习与 AI
            学习向导，面向已学 C 语言基础的大学生与编程初学者。
          </p>
          <div class="hero-actions">
            <router-link class="btn-primary" to="/courses">浏览课程</router-link>
            <router-link class="btn-secondary" to="/course/tianji-qiwei/video">田忌赛马 · 立即体验</router-link>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-num">5</span>
              <span class="stat-label">大教学模块</span>
            </div>
            <div class="stat">
              <span class="stat-num">1</span>
              <span class="stat-label">套可调参数仿真</span>
            </div>
            <div class="stat">
              <span class="stat-num">AI</span>
              <span class="stat-label">首页向导 + 练习提示</span>
            </div>
          </div>
        </div>

        <div class="hero-right">
          <div class="bento">
            <div class="bento-item bento-wide">
              <span class="bento-icon">🎬</span>
              <div class="bento-copy">
                <div class="bento-title">微课视频</div>
                <div class="bento-desc">章节目录与时间轴跳转，目标导读一目了然</div>
              </div>
            </div>
            <div class="bento-item">
              <span class="bento-icon">🧪</span>
              <div class="bento-copy">
                <div class="bento-title">虚拟仿真</div>
                <div class="bento-desc">马匹战力 · 策略对战 · 柱状对比</div>
              </div>
            </div>
            <div class="bento-item">
              <span class="bento-icon">📝</span>
              <div class="bento-copy">
                <div class="bento-title">练习测试</div>
                <div class="bento-desc">Monaco 编辑 · Judge0 · 概念测验</div>
              </div>
            </div>
            <div class="bento-item bento-accent">
              <span class="bento-icon">🤖</span>
              <div class="bento-copy">
                <div class="bento-title">AI 辅助</div>
                <div class="bento-desc">右侧向导随时问答；练习页分级提示</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section recommend">
      <div class="section-head">
        <div>
          <h2 class="section-title">推荐微课</h2>
          <p class="section-sub">从古典兵家故事切入，落到贪心策略与双指针的可视化理解。</p>
        </div>
        <router-link class="link-more" to="/courses">查看全部 →</router-link>
      </div>
      <CourseCard :course="recommended" featured />
    </section>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-mark">策算学堂</span>
          <span class="footer-en">StratAlgo Academy</span>
        </div>
        <div class="footer-grid">
          <div>
            <div class="footer-heading">参赛信息</div>
            <p class="footer-text">全国大学生计算机设计大赛 · 微课与 AI 辅助教学赛道作品</p>
          </div>
          <div>
            <div class="footer-heading">内容品牌</div>
            <p class="footer-text">与公众号「策算笔记」共用「策算」品牌前缀</p>
          </div>
          <div>
            <div class="footer-heading">联系与反馈</div>
            <p class="footer-text">可在站内「关于我们」补充团队邮箱与指导教师信息</p>
          </div>
        </div>
        <div class="footer-bottom">用心标注出处与引用 · 祝参赛顺利</div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 8px 0 48px;
}

.hero {
  position: relative;
  padding: 32px 0 8px;
  margin-bottom: 8px;
}

.hero-glow {
  position: absolute;
  inset: -40px 10% auto -10%;
  height: 280px;
  background: radial-gradient(closest-side, rgba(245, 166, 35, 0.2), transparent);
  pointer-events: none;
  z-index: 0;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 36px;
  align-items: center;
}

@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-soft);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 14px 8px 10px;
  margin-bottom: 18px;
  box-shadow: var(--shadow-sm);
}

.hero-eyebrow .dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--gold);
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.25);
}

.hero-title {
  margin: 0 0 16px;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: var(--text-h);
}

.hero-title-accent {
  background: linear-gradient(120deg, var(--gold) 0%, #d97706 45%, var(--brand-soft) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  margin: 0 0 22px;
  max-width: 34rem;
  color: var(--text);
  line-height: 1.75;
  font-size: 1.02rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand), var(--brand-soft));
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 6px 24px rgba(26, 47, 90, 0.28);
  transition:
    transform 0.15s,
    box-shadow 0.2s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(26, 47, 90, 0.35);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  color: var(--text-h);
  font-weight: 700;
  text-decoration: none;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.btn-secondary:hover {
  border-color: rgba(245, 166, 35, 0.45);
  background: rgba(245, 166, 35, 0.08);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-num {
  font-weight: 900;
  font-size: 1.35rem;
  color: var(--brand);
}
@media (prefers-color-scheme: dark) {
  .stat-num {
    color: var(--gold);
  }
}
.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.bento {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.bento-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.bento-item:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.bento-wide {
  grid-column: 1 / -1;
}

.bento-accent {
  grid-column: 1 / -1;
  border-color: rgba(245, 166, 35, 0.35);
  background: linear-gradient(135deg, rgba(245, 166, 35, 0.12), var(--bg-elevated));
}

.bento-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.bento-title {
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 4px;
}

.bento-desc {
  font-size: 14px;
  color: var(--text);
  line-height: 1.55;
}

.section {
  margin-top: 40px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.section-title {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-h);
}

.section-sub {
  margin: 0;
  color: var(--text);
  line-height: 1.65;
  max-width: 36rem;
}

.link-more {
  text-decoration: none;
  font-weight: 700;
  color: var(--brand);
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  transition:
    background 0.2s,
    border-color 0.2s;
  white-space: nowrap;
}
.link-more:hover {
  border-color: rgba(245, 166, 35, 0.4);
  background: rgba(245, 166, 35, 0.1);
}

@media (prefers-color-scheme: dark) {
  .link-more {
    color: var(--gold-hover);
  }
}

.site-footer {
  margin-top: 56px;
  padding: 36px 0 20px;
  border-top: 1px solid var(--border);
}

.footer-inner {
  padding-top: 8px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
}

.footer-mark {
  font-weight: 900;
  font-size: 1.15rem;
  color: var(--text-h);
}

.footer-en {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}

.footer-heading {
  font-weight: 800;
  font-size: 13px;
  color: var(--text-h);
  margin-bottom: 8px;
}

.footer-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text);
}

.footer-bottom {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-muted);
}
</style>
