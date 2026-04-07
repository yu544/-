<script setup>
import { nextTick, onMounted } from 'vue'
import Prism from 'prismjs'
import 'prismjs/components/prism-c'
import { useCourse } from '../../composables/useCourse'

const { course } = useCourse()

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

onMounted(() => {
  nextTick(() => {
    try {
      Prism.highlightAll()
    } catch {
      /* ignore */
    }
  })
})
</script>

<template>
  <section class="tab-section">
    <div class="tab-section-inner">
      <h2 class="tab-title">课件资料</h2>
      <div class="tab-placeholder">
        <div class="materials-hero">
          <div class="hero-kicker">课程资源中心</div>
          <h3 class="hero-title">一页整合文档、伪代码与示例实现</h3>
          <p class="hero-desc">
            建议学习顺序：先读伪代码掌握思路，再看 C 代码理解细节，最后用练习测试模块验证输出是否与策略一致。
          </p>
        </div>

        <div class="materials-layout">
          <div class="materials-left">
            <div class="block">
              <div class="block-title">资源下载</div>
              <div class="dl">
                <div class="dl-row">
                  <div class="dl-k">教学文档</div>
                  <a
                    v-if="course.materials.teachingDocDownload"
                    class="dl-a"
                    :href="course.materials.teachingDocDownload"
                    download
                    target="_blank"
                    rel="noreferrer"
                  >下载资料</a>
                  <div v-else class="dl-empty">待补充链接</div>
                </div>
                <div class="dl-row">
                  <div class="dl-k">教学课件</div>
                  <a v-if="course.materials.slidesDownload" class="dl-a" :href="course.materials.slidesDownload" target="_blank">下载资料</a>
                  <div v-else class="dl-empty">待补充链接</div>
                </div>
              </div>
            </div>

            <div v-if="course.materials.teachingDocPreview" class="block doc-preview-block">
              <div class="block-title">教学文档预览（PDF）</div>
              <iframe
                class="doc-frame"
                title="教学文档预览"
                :src="course.materials.teachingDocPreview"
              />
            </div>

            <div class="block">
              <div class="block-title">伪代码说明</div>
              <ol class="pc">
                <li v-for="(p, idx) in course.materials.pseudocode" :key="idx">{{ p }}</li>
              </ol>
            </div>

            <div class="block">
              <div class="block-title">学习清单（建议）</div>
              <ul class="checklist">
                <li>理解“无必胜局时，最弱对最强”的贪心思想。</li>
                <li>手动推演 3 组数据，核对每一轮胜负与累计银币。</li>
                <li>把代码提交到练习测试，验证边界输入（n=1、全平局等）。</li>
              </ul>
            </div>

            <div class="block">
              <div class="block-title">参考资料链接</div>
              <ul class="refs">
                <li v-for="refItem in course.materials.referenceLinks" :key="refItem.url">
                  <a class="ref-a" :href="refItem.url" target="_blank" rel="noreferrer">{{ refItem.label }}</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="materials-right">
            <div class="block">
              <div class="block-title">C 语言示例代码</div>
              <div class="code-meta">
                <span class="meta-chip">语言：C</span>
                <span class="meta-chip">算法：贪心 + 双指针</span>
                <span class="meta-chip">计分：胜 +200 / 负 -200 / 平 0</span>
              </div>

              <div class="code-wrap">
                <pre class="code-pre"><code class="language-c">{{ course.materials.codeExample }}</code></pre>
                <button type="button" class="copy-btn" @click="copyText(course.materials.codeExample)">复制</button>
              </div>

              <div class="code-note">
                提示：该代码块是站点原型占位，后续你们可以替换成文档中的完整 C 语言实现。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tab-section {
  padding-top: 8px;
  margin-top: 4px;
}

.tab-section-inner {
  padding-bottom: 8px;
}

.tab-title {
  margin: 0 0 10px;
  color: var(--text-h);
  font-size: 20px;
}

.tab-placeholder {
  background: var(--brand-bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  color: var(--text);
  line-height: 1.8;
  box-shadow: var(--shadow-sm);
}

.materials-hero {
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid rgba(245, 166, 35, 0.32);
  background: linear-gradient(135deg, rgba(245, 166, 35, 0.12), rgba(26, 47, 90, 0.06));
}

.hero-kicker {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-soft);
}

.hero-title {
  margin: 4px 0 6px;
  color: var(--text-h);
  font-size: 18px;
}

.hero-desc {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  line-height: 1.7;
}

.block {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
  padding: 14px;
}

:global(.dark) .block {
  background: rgba(22, 23, 29, 0.6);
  border-color: rgba(46, 48, 58, 0.95);
}

.block-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.materials-layout {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .materials-layout {
    grid-template-columns: 1fr;
  }
}

.materials-left,
.materials-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dl {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dl-k {
  font-weight: 900;
  color: var(--text-h);
}

.dl-a {
  text-decoration: none;
  font-weight: 800;
  color: var(--text-h);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(26, 47, 90, 0.2);
  background: rgba(26, 47, 90, 0.05);
}

.dl-empty {
  color: var(--text);
  opacity: 0.75;
}

.doc-preview-block {
  margin-top: 4px;
}

.doc-frame {
  width: 100%;
  min-height: 520px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
}

.refs {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-a {
  color: var(--text-h);
  text-decoration: none;
  font-weight: 800;
}

.checklist {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text);
}

.code-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.meta-chip {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-h);
}

.code-wrap {
  position: relative;
}

.code-pre {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(26, 47, 90, 0.12);
  background: rgba(26, 47, 90, 0.04);
  overflow: auto;
}

.copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(229, 228, 231, 1);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-weight: 900;
  padding: 0 12px;
}

:global(.dark) .copy-btn {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.code-note {
  margin-top: 10px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.7;
}

.pc {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
