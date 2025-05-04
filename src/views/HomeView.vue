<script setup>
import 'bootstrap';
import { ref, onMounted } from 'vue';
import axios from 'axios';

const room = ref({}); // 存儲房間顏色

// 生命週期函數：組件掛載時建立 WebSocket 連接
onMounted(() => {
  // 初始資料請求
  Data();
});

// 顏色更新函數
const changeColor = async (n, color) => {
  try {
    const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/update_color/${n}/`, {
      color: color
    });

    if (response.status === 200) {
      room.value[n] = color; // 更新顏色
    }
  } catch (error) {
    console.error('Error updating color:', error);
  }
};

// 獲取資料
const Data = async () => {
  try {
    const response = await axios.get('https://f4jtjhdx-8000.asse.devtunnels.ms/rooms_and_patients/');
    response.data.forEach(roomData => {
      room.value[roomData.id] = roomData.color;
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

</script>
<template>
  <h1 class="my-5 text-white">{{ $t("home.select_room") }}</h1><!-- 診室選擇 -->
  <div class="Consult_room mt-5 text-center">
    <div class="row">
      <div class="col-12 col-md-4" v-for="n in 10" :key="n">
        <router-link :to="`/Content/${n}`" class="card text-center mb-3 w-100"
          :style="{ border: '5px solid ' + room[n], textDecoration: 'none', borderRadius: '25px' }">
          <div class="card-body">
            <div class="container text-center">
              <div class="row align-items-center">
                <div class="col-12 col-md-12 col-lg-7 mt-2 d-flex align-items-center">
                  <h3 class="me-2">{{ $t("home.chair_number", { id: n }) }}</h3> <!-- 第 n 診療椅 -->
                  <img class="bi mb-1" src="/SVG/詳細資訊.svg" style="height: 30px;" />
                </div>
                <div class="col-12 col-md-5"><!-- 顏色下拉選單 -->
                  <!-- 下拉選單觸發按鈕 -->
                  <div class="dropdown">
                    <button class="btn row dropdownMenuButton" type="button" :data-id="n" data-bs-toggle="dropdown"
                      aria-expanded="false"
                      :style="{ border: '2px solid black', borderRadius: '25px', width: '120px', height: '55px' }">
                      <div class="btn col-6 col-md-6 me-1"
                        :style="{ backgroundColor: room[n], border: '2px solid black', borderRadius: '25px', width: '40px', height: '40px' }">
                      </div>
                      <div class="btn col-6 col-md-6">
                        <!-- 自訂的SVG箭頭 -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor"
                          class="bi bi-chevron-down" viewBox="0 0 15 15">
                          <path fill-rule="evenodd"
                            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
                        </svg>
                      </div>
                    </button>
                    <!-- 下拉選單內容 -->
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton"
                      :style="{ width: '170px' }">
                      <li class="d-flex flex-wrap">
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#C00000')"
                          :style="{ backgroundColor: '#C00000', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#FF0000')"
                          :style="{ backgroundColor: '#FF0000', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#FFC000')"
                          :style="{ backgroundColor: '#FFC000', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#FFFF00')"
                          :style="{ backgroundColor: '#FFFF00', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#92D050')"
                          :style="{ backgroundColor: '#92D050', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                      </li>
                      <li class="d-flex flex-wrap">
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#00B050')"
                          :style="{ backgroundColor: '#00B050', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#00B0F0')"
                          :style="{ backgroundColor: '#00B0F0', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#0070C0')"
                          :style="{ backgroundColor: '#0070C0', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#002060')"
                          :style="{ backgroundColor: '#002060', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                        <a class="dropdown-item p-0 m-1" href="#" @click.prevent="changeColor(n, '#7030A0')"
                          :style="{ backgroundColor: '#7030A0', border: '2px solid black', borderRadius: '25px', width: '25px', height: '25px' }"></a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>
