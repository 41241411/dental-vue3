<script setup>
import 'bootstrap';
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

//WebSocket連線
let socket = null

const setupWebSocket = () => {
  console.log("WebSocket Content連接");

  // Vue.js 中的 WebSocket 連接範例
  socket = new WebSocket("wss://f4jtjhdx-8000.asse.devtunnels.ms/ws/room/");

  socket.onopen = () => {
    console.log("WebSocket Content連接成功");
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log("Home收到消息：", data);
    if (data.event === "changeCount") {
      Data();
    }

    socket.onerror = (error) => {
      console.error("WebSocket Content連接錯誤:", error);
    };

    socket.onclose = () => {
      console.warn("⚠️ WebSocket 已關閉，3 秒後重連...");
      setTimeout(() => {
        setupWebSocket(); // ⏳ 重新連線
      }, 3000); // 延遲 3 秒重連
    };
  };
}

const room = ref({}); // 存儲房間顏色

// 獲取資料
const Data = async () => {
  try {
    const response = await axios.get('https://f4jtjhdx-8000.asse.devtunnels.ms/rooms_and_patients/');
    response.data.forEach(roomData => {
      room.value[roomData.id] = roomData.color;
    });

    const response1 = await axios.get('https://f4jtjhdx-8000.asse.devtunnels.ms/visibleCount/');
    visibleCount.value = response1.data.visibleCount;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

// 顏色更新函數
const changeColor = async (n, color) => {
  try {
    const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/update_color/${n}/`, {
      color: color
    });

    if (response.status === 200) {
      room.value[n] = color; // 更新顏色
      const messagechangeColor = {
        event: "changeColor",
      };

      // 傳送 WebSocket 訊息
      socket.send(JSON.stringify(messagechangeColor));

      console.log("已發送 WebSocket 訊息 messagechangeColor", messagechangeColor);
    }
  } catch (error) {
    console.error('Error updating color:', error);
  }
};

//診室選單數量
const visibleCount = ref(0)

// 監聽 visibleCount 的變化
watch(visibleCount, (newValue, oldValue) => {
  changeCount(newValue);
  console.log(`visibleCount 改變：從 ${oldValue} ➜ ${newValue}`)
})

// 更新診室選單數量
const changeCount = async (Count) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
  try {
    const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/update_visibleCount/`, {
      Count: Count
    });

    if (response.status === 200) {
      const messagechangeCount = {
        event: "changeCount",
        Count: Count
      };

      // 傳送 WebSocket 訊息
      socket.send(JSON.stringify(messagechangeCount));

      console.log("已發送 WebSocket 訊息 messagechangeCount", messagechangeCount);
    }
  } catch (error) {
    console.error('Error updating Count:', error);
  }}
};

// 生命週期函數：組件掛載時建立 WebSocket 連接
onMounted(async () => {
  // 初始資料請求
  await Data();
  setupWebSocket();
});
</script>
<template>
  <div class="row justify-content-end my-5">
    <div class="col-4">
      <h1 class="text-white">{{ $t("home.select_room") }} </h1><!-- 診室選擇 -->
    </div>
    <div class="col-4">
      <select v-model="visibleCount" style="font-size: 33px; border-radius: 8px;">
        <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
      </select>
    </div>
  </div>

  <div class="Consult_room mt-5 text-center">
    <div class="row">
      <div class="col-12" :class="{'col-md-12': visibleCount <= 2, 'col-md-4': visibleCount > 2}" v-for="n in visibleCount" :key="n">
        <router-link :to="`/Content/${n}`" class="card text-center mb-3 w-100"
          :style="{ border: '5px solid ' + room[n], textDecoration: 'none', borderRadius: '25px' }">
          <div class="card-body">
            <div class="container text-center">
              <div class="row align-items-center">
                <div class="col-6 col-md-7 mt-2 d-flex align-items-center">
                  <h3 class="me-2">{{ $t("home.chair_number", { id: n }) }}</h3> <!-- 第 n 診療椅 -->
                  <img class="bi mb-1" src="/SVG/詳細資訊.svg" style="height: 30px;" />
                </div>
                <div class="col-6 col-md-5"><!-- 顏色下拉選單 -->
                  <!-- 下拉選單觸發按鈕 -->
                  <div class="dropdown">
                    <button class="btn row dropdownMenuButton" type="button" :data-id="n" data-bs-toggle="dropdown"
                      aria-expanded="false"
                      :style="{ border: '2px solid black', borderRadius: '25px', width: '120px', height: '55px' }">
                      <div class="btn col-6 col-md-8 me-1"
                        :style="{ backgroundColor: room[n], border: '2px solid black', borderRadius: '25px', width: '40px', height: '40px' }">
                      </div>
                      <div class="btn col-6 col-md-4">
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
