<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/MainNavbar.vue'
</script>

<template>
  <Navbar/>
  <div class="mt-5">
  <RouterView />
  </div>
</template>

<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  display: flex;
  flex-direction: column;
  padding: 0;
}

#r html,
body {
  background: linear-gradient(to bottom, #5f82f5ad, #42cfe241);
}

* {
  font-family: 'Microsoft JhengHei UI', sans-serif !important;
  /* 強制所有元素使用此字體 */
  font-weight: bold !important;
  /* 強制所有元素使用粗體 */
}

.navbar {
  height: 70px;
  box-shadow: 0 5px 6px rgba(0, 0, 0, 0.5);
  /* 下方陰影 */
}

.navbar-nav .dropdown-menu {
  position: absolute !important;
  /* 或使用 relative，根據需要選擇 */
}

.navbar-collapse {
  z-index: 1050 !important;
  /* 確保開關按鈕位於最上層 */
}

.offcanvas {
  z-index: 1100 !important;
  /* 確保開關按鈕位於最上層 */
  top: 80px !important;
  /* 讓 Offcanvas 從 navbar 底部開始 */
  height: calc(100% - 160px) !important;
  /* 調整高度，不讓它蓋住 navbar */
  border-radius: 15px !important;
  overflow-y: auto;
}

@media (min-width: 1400px) {

  /* 只影響超大螢幕 */
  .container-xxl {
    max-width: 1600px !important;
  }
}
</style>
