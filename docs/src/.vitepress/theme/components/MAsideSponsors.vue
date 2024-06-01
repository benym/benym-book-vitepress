<script setup lang="ts">
import { VPDocAsideSponsors } from 'vitepress/theme'

const data = [
  {
    items: [{ img: 'https://img.foreverblog.cn/wormhole_4_tp.gif' }]
  },
  {
    items: [{ img: 'https://img.foreverblog.cn/logo_en_default.png' }]
  },
  {
    items: [{ img: 'https://help-assets.codehub.cn/enterprise/guanwang/tencent-logo.svg' }]
  },
  {
    items: [{ img: 'https://help-assets.codehub.cn/enterprise/guanwang/coding-logo.svg' }]
  }
]
</script>

<template>
  <VPDocAsideSponsors :data="data" />
</template>

<style>
.vp-sponsor-grid.medium .vp-sponsor-grid-image {
  max-height: 90px;
}
</style>
