<script setup lang="ts">
import { inject, Ref, computed } from 'vue'
import { useRoute } from 'vitepress'

const DEV = inject('DEV') as Ref<boolean>
const route = useRoute()

const pageId = computed(() => route.path.replace('/benym-book-vitepress', ''))
</script>

<template>
  <div class="copyright">
    <img
      v-if="!DEV"
      class="visitor"
      :src="`https://visitor-badge.laobi.icu/badge?page_id=benym.book.${pageId}`"
      title="当前页面累计访问数"
      onerror="this.style.display='none'"
    />
    Copyright © 2018-present benym
  </div>
</template>

<style scoped>
.copyright {
  margin-top: 24px;
  border-top: 1px solid rgba(60, 60, 67, 0.12);
  padding: 32px 24px;
  background-color: #ffffff;
}

.visitor {
  margin-right: 8px;
}

@media (max-width: 414px) {
  .visitor {
    display: none;
  }
}
</style>
