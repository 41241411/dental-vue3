<script setup>
import 'bootstrap';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';
import { ref, computed, onMounted, watchEffect } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2'

const { t, locale } = useI18n();


// 控制 navbar 的開關
const isNavbarOpen = ref(false);

function toggleNavbar() {
    isNavbarOpen.value = !isNavbarOpen.value;
}
// 控制 navbar 的開關

//訊息
const message = ref([]);  // 用 ref 來管理 message 陣列

const Data = async () => {
    try {
        const response = await axios.get('https://f4jtjhdx-8000.asse.devtunnels.ms/get_message/');
        message.value = response.data;  // 把資料設定到 message.value 中
    } catch (error) {
        console.error('Failed to fetch messages:', error);
    }
}

const groupedMessages = computed(() => {
    return message.value.reduce((acc, msg) => {
        const date = new Date(msg.created_at).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(msg);
        return acc;
    }, {})
})
//訊息

// 訊息格式化
const formatMessage = (message) => {
    if (message === "結束") {
        if (locale.value === 'en') {
            return "End";
        } else if (locale.value === 'th') {
            return "สิ้นสุด";
        } else if (locale.value === 'zh') {
            return "結束";
        }
    } else {
        if (locale.value === 'en') {
            return message.replace("加時", "Extend").replace("分鐘", "min");
        } else if (locale.value === 'th') {
            return message.replace("加時", "เพิ่มเวลา").replace("分鐘", "นาที");
        } else if (locale.value === 'zh') {
            return message.replace("加時", "加時").replace("分鐘", "分鐘");
        }
    }
}
// 訊息格式化

// 更新導航欄並更新未讀數量
const unreadCount = ref(0);  // 用 ref 來管理 message 陣列
const unreadCount_id = ref(11);
const calledOnce = ref(false);
const route = useRoute();

const openOffcanvas = async () => {
    unreadCount.value = 0;
    updateUnreadCount();
}

const updateUnreadCount = async () => {
    try {
        await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/update_unread_count/${unreadCount_id.value}/`, { unread_count: unreadCount.value })
    } catch (error) {
        console.error("Error fetching data:", error)
    }
}

const updateNavbar = async () => {
    // 根據當前路由來決定顯示哪些導航項
    if (route.path === '/Reception') {
        unreadCount_id.value = 11
    } else if (route.path.startsWith('/Content/')) {
        // 當路徑以 '/Content/' 開頭，獲取 id 參數
        unreadCount_id.value = route.params.id
    } else {
        // 避免無限遞歸
        if (!calledOnce.value) {
            calledOnce.value = true
            updateNavbar()  // 這樣會觸發遞歸調用，請小心使用
        }
    }

    // 獲取未讀數量並更新
    try {
        const response_2 = await axios.get(`https://f4jtjhdx-8000.asse.devtunnels.ms/unread_count/${unreadCount_id.value}/`)
        unreadCount.value = response_2.data.unread_count
    } catch (error) {
        console.error("Error fetching unread count:", error)
    }
}
// 更新導航欄並更新未讀數量

// 刪除訊息
const deleteMessage = async (messageId) => {
    // SweetAlert2 確認刪除對話框
    const result = await Swal.fire({
        title: t("app_alert.confirm_delete"), // 使用 t() 來正確解析
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: t("app_alert.confirm"), // 使用 i18n 進行翻譯
        cancelButtonText: t("app_alert.cancel")    // 使用 i18n 進行翻譯
    });

    // 如果用戶確認刪除
    if (result.isConfirmed) {
        try {
            const response = await axios.delete(`https://f4jtjhdx-8000.asse.devtunnels.ms/del_message/${messageId}/`);

            if (response.status === 200) {
                Swal.fire({
                    icon: 'success',
                    title: t("app_alert.delete_success"),
                });

                // 呼叫資料更新函式（Data()）
                await Data();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: t("app_alert.delete_failure"),
                });
            }
        } catch (error) {
            console.error('刪除訊息時發生錯誤:', error);
            Swal.fire({
                icon: 'error',
                title: t("app_alert.delete_failure"),
            });
        }
    }
};
// 刪除訊息

// 監聽路由變化
watchEffect(() => {
    updateNavbar()  // 每次路由變更時更新導航欄
})
// 監聽路由變化


//更改語言
const changeLang = (lang) => {
    locale.value = lang;  // 使用 locale 改變語言
    localStorage.setItem("LANG", lang);  // 儲存選擇的語言到 localStorage
}
//更改語言

let socket = null

const setupWebSocket = () => {
    console.log("WebSocket navbar連接");

    // Vue.js 中的 WebSocket 連接範例
    socket = new WebSocket("wss://f4jtjhdx-8000.asse.devtunnels.ms/ws/room/");

    socket.onopen = () => {
        console.log("WebSocket navbar連接成功");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === "addTimer" || data.event === "endTimer") {
            unreadCount.value++;  // 使用 ref 更新值
            updateUnreadCount();  // 更新未讀數量
        }
        Data();  // 執行資料處理函數
    };

    socket.onerror = (error) => {
        console.error("WebSocket navbar連接錯誤:", error);
    };

    socket.onclose = () => {
        console.warn("⚠️ WebSocket 已關閉，3 秒後重連...");
        setTimeout(() => {
            setupWebSocket(); // ⏳ 重新連線
        }, 3000); // 延遲 3 秒重連
    };
};

// 在組件加載時設置 WebSocket 連接
onMounted(() => {
    setupWebSocket();
    Data();
});
</script>

<template>
    <!-- Navbar-->
    <nav class="navbar navbar-expand-lg bg-white bg-body-tertiary fixed-top w-100">
        <div class="container-xxl">
            <RouterLink to="/" class="navbar-brand">
                <img class="bi" width="200" height="50" src="/LOGO.png" /><!-- LOGO -->
            </RouterLink>
            <button class="navbar-toggler bg-white" type="button" @click="toggleNavbar" style="position: relative;">
                <span class="navbar-toggler-icon"></span>
            </button><!-- 小畫面的選單 -->
            <div :class="['collapse', 'navbar-collapse', 'bg-white', { 'show': isNavbarOpen }]"
                id="navbarSupportedContent">
                <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
                    <li class="nav-item"><!-- 診室 -->
                        <router-link to="/" class="nav-link" active-class="active" aria-current="page">
                            <img class="bi mb-1" src="/SVG/診室.svg" style="height: 30px;" />
                            {{ t("navbar.room")
                            }}</router-link>
                    </li><!-- 診室 -->
                    <li class="nav-item"><!-- 櫃台 -->
                        <router-link to="/Reception" class="nav-link" active-class="active" aria-current="page">
                            <img class="bi mb-1" src="/SVG/櫃台.svg" style="height: 30px;" />
                            {{ t("navbar.reception") }}</router-link>
                    </li><!-- 櫃台 -->
                    <li class="nav-item d-flex justify-content-center"><!-- 訊息 -->
                        <button class="btn nav-link position-relative" type="button" data-bs-toggle="offcanvas"
                            @click="openOffcanvas" data-bs-target="#offcanvasScrolling"
                            aria-controls="offcanvasScrolling">
                            <img class="bi mb-1" src="/SVG/訊息.svg" style="height: 30px;" />
                            {{ t("navbar.message") }}
                            <div v-if="unreadCount > 0"><span
                                    class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                    {{ unreadCount }}
                                </span></div>
                        </button>
                    </li><!-- 訊息 -->
                    <li class="nav-item dropdown"><!-- 語言 -->
                        <a class="nav-link dropdown-toggle" id="navbarDropdownPortfolio" href="#" role="button"
                            data-bs-toggle="dropdown" aria-expanded="false">
                            <img class="bi mb-1" src="/SVG/語言.svg" style="height: 30px;" />
                            {{ t("navbar.language") }}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdownPortfolio">
                            <li><a class="dropdown-item" href="#" @click="changeLang('zh')">中文</a></li>
                            <li><a class="dropdown-item" href="#" @click="changeLang('en')">English</a></li>
                            <li><a class="dropdown-item" href="#" @click="changeLang('th')">แบบไทย</a></li>
                        </ul>
                    </li><!-- 語言 -->
                </ul>
            </div>
        </div>
    </nav>
    <!-- 訊息展開內容 -->
    <div class="offcanvas offcanvas-end" data-bs-scroll="true" data-bs-backdrop="false" tabindex="-1"
        id="offcanvasScrolling" aria-labelledby="offcanvasScrollingLabel" style="width: 300px;">
        <div class="offcanvas-header">
            <h1 class="offcanvas-title w-100 text-center" id="offcanvasScrollingLabel">{{ t("navbar.message") }}</h1>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="container">
            <div class="offcanvas-body border-top border-3 border-dark" id="message-list">
                <div v-if="message.length === 0">
                    <p>{{ t("navbar.no_message") }}</p>
                </div>
                <div v-else>
                    <div v-for="(group, date) in groupedMessages" :key="date">
                        <!-- 日期標題 -->
                        <div class="text-center">
                            <strong>{{ date }}</strong>
                        </div>

                        <!-- 訊息列表 -->
                        <div v-for="msg in group" :key="msg.id" class="message">
                            <div class="">
                                <div class="row mt-2 bg-dark-subtle  border border-dark-subtle rounded-4">
                                    <div class="col-md-10 text-start">
                                        <strong>{{ $t("navbar.room") }} {{ msg.room_id }}:</strong> {{
                                            formatMessage(msg.message) }} <br>
                                        <small>({{ new Date(msg.created_at).toLocaleTimeString() }})</small>
                                    </div>
                                    <div class="col-md-2 mt-2">
                                        <button type="button" class="btn-close" @click="deleteMessage(msg.id)"
                                            aria-label="Close"></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
