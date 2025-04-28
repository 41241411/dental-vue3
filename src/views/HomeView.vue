<script setup>
import 'bootstrap';
import * as bootstrap from 'bootstrap';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'; // 引入 Vue Router
import Swal from 'sweetalert2';
import { useI18n } from 'vue-i18n';
import { Dropdown } from 'bootstrap';
import emitter from '@/event-bus';

const socket = ref(null); // WebSocket 連接
const room = ref({}); // 存儲房間顏色

const { t } = useI18n();
const router = useRouter();
const selectedN = ref(null);

// WebSocket 連接設定
const setupWebSocket = () => {
  console.log('WebSocket');
  socket.value = new WebSocket('wss://f4jtjhdx-8000.asse.devtunnels.ms/ws/room/');

  socket.value.onopen = () => {
    console.log('WebSocket 連接成功');
  };

  socket.value.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.event === 'OPENChangeColor') {
      console.log('HOME收到消息：', data);
      openDropdown(data.id);
    } else if (data.event === 'ChangeColor') {
      console.log('HOME收到消息：', data);
      changeColor(data.id, data.color);
    }
  };

  socket.value.onerror = (error) => {
    console.error('WebSocket 錯誤:', error);
  };

  socket.value.onclose = () => {
    console.warn('⚠️ WebSocket 已關閉，3 秒後重連...');
    setTimeout(() => {
      setupWebSocket(); // ⏳ 重新連線
    }, 1000); // 延遲 3 秒重連
  };
};

// 生命週期函數：組件掛載時建立 WebSocket 連接
onMounted(() => {
  // 初始資料請求
  fetchData();
  setupWebSocket();
});

// 生命週期函數：組件卸載時關閉 WebSocket 連接
onBeforeUnmount(() => {
  if (socket.value) {
    socket.value.close();
    console.log('WebSocket 連接已關閉');
  }
});

// 監聽事件
emitter.on('login-content', (data) => {
  openlogintModel(data.data.id);
  console.log('HOME收到消息：', data.data.id);
});

emitter.on('Contentpassword', (data) => {
  console.log('HOME收到消息：', data.data.Contentpassword);
  passwordInput.value = parseInt(data.data.Contentpassword);
  console.log('selectedN', selectedN.value);
  login(selectedN.value);
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
const fetchData = async () => {
  try {
    const response = await axios.get('https://f4jtjhdx-8000.asse.devtunnels.ms/rooms_and_patients/');
    response.data.forEach(roomData => {
      room.value[roomData.id] = roomData.color;
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

// 開啟登入彈窗
const openlogintModel = (id) => {
  selectedN.value = id;
  const modalElement = document.getElementById('loginModal');
  let loginModal = bootstrap.Modal.getInstance(modalElement);
  if (!loginModal) {
    loginModal = new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
  }

  document.querySelectorAll('.modal-backdrop').forEach((el, index) => {
    if (index > 0) el.remove();
  });

  loginModal.show(); // 顯示 Modal
};

const passwordInput = ref("")

// 登入處理
const login = async (id) => {
  try {
    if (!passwordInput.value) {
      Swal.fire({
        icon: 'warning',
        title: t('home.input')
      });
      return;
    }

    const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/login/${id}/`, {
      password: passwordInput.value,
    }, { withCredentials: true });

    if (response.status === 200 && response.data.success) {
      Swal.fire({
        icon: 'success',
        title: t('home.success'),
      }).then(() => {
        passwordInput.value = ''; // 清空輸入框
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();  // 關閉 Modal
        console.log('✅ 登入成功，準備轉址');
        router.push(`/Content/${id}`);
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: t('home.error'),
      }).then(() => {
        passwordInput.value = ''; // 清空輸入框
        window.location.reload();
      });
    }
  } catch (error) {
    console.error('登入錯誤：', error);
    Swal.fire({
      icon: 'error',
      title: t('home.error'),
    }).then(() => {
      passwordInput.value = ''; // 清空輸入框
      window.location.reload();
    });
  }
};

// 開啟下拉選單
const openDropdown = (n) => {
  const btn = document.querySelector(`.dropdownMenuButton[data-id="${n}"]`);
  const dropdown = Dropdown.getOrCreateInstance(btn);
  dropdown.show(); // 開啟
};

</script>
<template>
  <h1 class="my-5 text-white">{{ $t("home.select_room") }}</h1><!-- 診室選擇 -->
  <div class="Consult_room mt-5 text-center">
    <div class="row">
      <div class="col-12 col-md-4" v-for="n in 10" :key="n">
        <div class="card text-center mb-3 w-100"
          :style="{ border: '5px solid ' + room[n], textDecoration: 'none', borderRadius: '25px' }">
          <div class="card-body">
            <div class="container text-center">
              <div class="row align-items-center">
                <div class="col-12 col-md-12 col-lg-7 mt-2 d-flex align-items-center"
                  @click.prevent="openlogintModel(n)">
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
        </div>
      </div>
    </div>
  </div>

  <!-- loginModal -->
  <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="loginModalLabel">
            <img class="bi mb-1 me-1" src="/SVG/詳細資訊.svg" style="height: 30px;" />
            {{ $t("home.login") }} - {{ $t("home.chair_number", {
              id:
                selectedN
            }) }}
          </h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body my-3">
          <div class="input-group">
            <span class="input-group-text" id="passwordLabel">{{ $t("home.password") }}</span>
            <input type="text" class="form-control" v-model="passwordInput" aria-labelledby="passwordLabel">

          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t("home.cancel") }}</button>
          <button type="button" class="btn btn-primary" @click="login(selectedN)">
            <img class="bi mb-1 me-1" src="/SVG/確認.svg" style="height: 20px;" />
            {{ $t("home.confirm") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
