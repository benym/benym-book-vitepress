---
description: 网址导航
layoutClass: m-nav-layout
outline: [2, 3, 4]
sidebar: false
article: false
comment: false
---

<script setup>
import { NAV_DATA } from '../../nav/data.ts'
</script>
<style src="../../nav/index.scss"></style>

# 导航

<MNavLinks v-for="{title, items} in NAV_DATA" :title="title" :items="items"/>
