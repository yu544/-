<script setup>
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-badge">关于我们</div>
      <h1 class="hero-title">策算学堂 StratAlgo Academy</h1>
      <p class="hero-lead">
        本站点服务于全国大学生计算机设计大赛「微课与 AI
        辅助教学」赛道：以微课为主线，串联仿真、练习与反思，呈现可验证、可扩展的算法学习体验。
      </p>
    </header>

    <div class="grid">
      <section class="card">
        <div class="card-icon">🎯</div>
        <h2 class="card-title">教学目标</h2>
        <p class="card-text">
          帮助已具备 C 语言基础的学习者，把「贪心」「双指针」等抽象概念，落到可运行代码与可调参数实验上，形成可视化验证的学习闭环。
        </p>
      </section>
      <section class="card">
        <div class="card-icon">🏛️</div>
        <h2 class="card-title">科教融汇</h2>
        <p class="card-text">
          从田忌赛马等传统案例切入，联结现代算法与在线评测；强调学术诚信与引用标注，鼓励在「参考资料」中致谢讲义与 OJ 原题。
        </p>
      </section>
      <section class="card">
        <div class="card-icon">🤝</div>
        <h2 class="card-title">团队与致谢</h2>
        <p class="card-text">
          可在本页补充创作团队分工、指导教师与学校学院信息。公众号「策算笔记」与本站共用「策算」品牌，便于评审快速识别。
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 72px;
}

.hero {
  padding: 32px 34px;
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  right: -80px;
  bottom: -120px;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.15), transparent 65%);
  pointer-events: none;
}

.hero-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-soft);
  margin-bottom: 12px;
  position: relative;
}

.hero-title {
  margin: 0 0 14px;
  font-size: clamp(1.75rem, 3.2vw, 2.35rem);
  font-weight: 900;
  color: var(--text-h);
  letter-spacing: -0.02em;
  position: relative;
}

.hero-lead {
  margin: 0;
  max-width: 42rem;
  color: var(--text);
  line-height: 1.8;
  font-size: 1.05rem;
  position: relative;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  padding: 24px 22px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.card-icon {
  font-size: 1.75rem;
  margin-bottom: 12px;
}

.card-title {
  margin: 0 0 10px;
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--text-h);
}

.card-text {
  margin: 0;
  color: var(--text);
  line-height: 1.75;
  font-size: 0.98rem;
}
</style>
