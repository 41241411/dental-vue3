<script setup>
import 'bootstrap';
import * as bootstrap from 'bootstrap';
import { onMounted, onUnmounted, reactive, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import axios from 'axios';
import Swal from 'sweetalert2'

const { t, locale } = useI18n();

// 取得路由參數
const route = useRoute();
const id = route.params.id;
const room = reactive({
    id: null,
    state: 'free',
    time: 0,
    patients: [],
    color: '#000000'
});

//初始資料
const Data = async () => {
    try {
        const response = await axios.get(`https://f4jtjhdx-8000.asse.devtunnels.ms/room/${id}`);
        //console.log(response.data);
        Object.assign(room, response.data);
        //console.log(room);

        if (room.time != 0) {
            updateTimer();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

//WebSocket連線
let socket = null

const setupWebSocket = () => {
    console.log("WebSocket Content連接");

    // Vue.js 中的 WebSocket 連接範例
    socket = new WebSocket("wss://f4jtjhdx-8000.asse.devtunnels.ms/ws/room/");

    socket.onopen = () => {
        console.log("WebSocket Content連接成功");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Content收到消息：", data);
        if (data.event === "addPatient") {
            Data(data.id);  // 透過 id 拉取對應的資料
        } else if (data.event === "editPatient") {
            Data(room.id);  // 透過 id 拉取對應的資料
        } else if (data.event === "deletePatient") {
            Data(room.id);  // 透過 id 拉取對應的資料
        } else if (data.event === "endTimer_in_counter" && parseInt(data.id) === room.id) {;
            Data(room.id);  // 透過 id 拉取對應的資料
            msgalert(data);
        } else if (data.event === "startTimer") {
            //console.log("startTimer", data);
            Data();
        } else if (data.event === "addTimer") {
            //console.log("addTimer", data);
            Data();
        } else if (data.event === "endTimer") {
            //console.log("endTimer", data);
            Data();
        };

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

let isPlaying = false; // 控制是否已在播放

// 提示音
const msgalert = async (data) => {
    if (isPlaying) return; // 若已有音效播放中則跳出
    isPlaying = true;

    let audioSource;

    if (data.event === "endTimer_in_counter") {
        audioSource = new Audio("/music_2_cut.mp3");
    } else {
        audioSource = new Audio("/music_3_cut.mp3");
    }

    try {
        await audioSource.play();
        audioSource.loop = true;

        Swal.fire({
            icon: data.event === "endTimer_in_counter" ? "success" : "error",
            title: data.event === "endTimer_in_counter"
                ? t("content_alert.front_desk_end")
                : t("content_alert.front_desk_attempt_end"),
            didOpen: () => {
                console.log('音效播放中');
            },
            willClose: () => {
                audioSource.pause();  // 停止音效播放
                isPlaying = false;    // 重置播放狀態
                console.log('音效已停止');
            }
        });
    } catch (error) {
        console.warn("音效播放失敗:", error);
        isPlaying = false; // 播放失敗時也要重置
    }
};


//格式化狀態
const formatState = (state) => {
    return state === "free" ? t("status.free") : t("status.in_use");
}

//格式化時間
const formatTime = (time) => {
    if (time === undefined || time === null) return "00:00:00"; // 避免錯誤

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

//格式化預約時間
const formatDate = (dateString) => {
    if (!dateString) return "無";

    const date = new Date(dateString);  // 用原始的時間字串，這會視為 UTC 時間
    date.setHours(date.getHours() - 8);

    // 取得各個時間部分
    let year = date.getFullYear();
    let month = ("0" + (date.getMonth() + 1)).slice(-2); // 月份需要加1，並且確保是兩位數
    let day = ("0" + date.getDate()).slice(-2); // 日需要確保是兩位數
    let hours = date.getHours();
    let minutes = ("0" + date.getMinutes()).slice(-2); // 確保分鐘是兩位數

    // 12小時制時間
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12 小時制中的 0 要顯示為 12

    // 格式化成所需的 YYYY/MM/DD HH:mm:ss AM/PM 格式
    return `${year}/${month}/${day} ${ampm} ${hours}:${minutes}`;
};

//格式化病歷編號placeholderText
const placeholderText = computed(() => {
    return locale.value === 'en'
        ? 'Please enter the medical record number'
        : locale.value === 'th'
            ? 'กรุณาป้อนหมายเลขเวชระเบียน'
            : '請輸入病歷編號';
});

//設定時間
const addTime = (minutes) => {
    const min = minutes * 60;
    if (room.time == 0 && min < 0 || room.time + min < 0) {
        Swal.fire({
            icon: "warning",
            title: t("content_alert.addTime_warning"),
        });
        return;
    } else {
        room.time += min;
    }
}

//開始
const startTimer = async (id) => {
    console.log("開始計時被觸發！", id);
    if (room.time === 0) {
        Swal.fire({
            icon: "warning",
            title: t("content_alert.time_zero_warning"),
        });
        return;
    }
    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/start/${id}/`, {
            state: "in_use",
            time: room.time
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.status === 200) {
            room.state = "in_use";  // 更新前端狀態
            Swal.fire({
                icon: "success",
                title: t("content_alert.timer_started"),
            });

            // 如果剩餘時間為 0，則不開始倒數
            if (room.time > 0) {
                updateTimer();
            }

            const messagestartTimer = {
                event: "startTimer",
                data: {
                    id: id,
                    time: room.time,
                }
            };

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messagestartTimer));

            console.log("已發送 WebSocket 訊息 startTimer", messagestartTimer);

        } else {
            Swal.fire({
                icon: "error",
                title: t("content_alert.start_failure"),
            });
        }
    } catch (error) {
        console.error("啟動計時失敗:", error);
        Swal.fire({
            icon: "error",
            title: t("content_alert.start_failure"),
        });
    }
}

//結束
const endTimer = async (id) => {
    console.log("結束計時被觸發！", id);

    // 防止重複結束計時
    if (!intervalid) {
        console.log("計時器已經結束或尚未啟動");
        return;  // 如果計時器沒有啟動，則不執行結束操作
    }

    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/end/${id}/`, {}, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.status === 200) {
            room.time = 0;
            room.state = "free";  // 更新前端狀態

            clearInterval(intervalid);  // 停止計時器
            intervalid = null;

            Swal.fire({
                icon: "success",
                title: t("content_alert.timer_ended"),
            });

            let postData = {
                room_id: id,
                message: `結束`,
            };

            const response_msg = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/add_message/`, postData, {
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (response_msg.status === 201) {
                console.log("新增結束訊息成功")
            } else {
                console.log("新增結束訊息失敗")
            }

            const messagesendTimer = {
                event: "endTimer",
                data: {
                    id: id,
                }
            };

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messagesendTimer));

            console.log("已發送 WebSocket 訊息 endTimer", messagesendTimer);

            //wait formatData(id);
        } else {
            Swal.fire({
                icon: "error",
                title: t("content_alert.end_failure"),
            });
        }
    } catch (error) {
        console.error("結束計時失敗:", error);
        Swal.fire({
            icon: "error",
            title: t("content_alert.end_failure"),
        });
    }
};

//加時modal
const openAddtimeModal = () => {
    const addtimeModal = new bootstrap.Modal(document.getElementById('addtimeModal'));
    addtimeModal.show();
}

//加時modal設定時間
let modalTime = 0;
const addmodalTime = (minutes) => {
    modalTime += minutes * 60;
}

//加時
const addTimer = async (id) => {
    console.log("加時被觸發！", id);
    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/add_time/${id}/`, {
            time: modalTime
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.status === 200) {
            Swal.fire({
                icon: 'success',
                title: t("content_alert.extend_success"),
            });

            // 重新讀取房間資料，更新病人表格
            Data();

            // 關閉 Modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addtimeModal'));
            modal.hide();  // 這會隱藏 Modal

            let minutes = Math.floor(modalTime / 60);

            let postData = {
                room_id: id,
                message: `加時 ${minutes} 分鐘`,
            };

            const response_msg = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/add_message/`, postData, {
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (response_msg.status === 201) {
                console.log("新增加時訊息成功")
            } else {
                console.log("新增加時訊息失敗")
            }

            const messagesaddTimer = {
                event: "addTimer",
                data: {
                    id: id,
                    time: modalTime,
                }
            };

            modalTime = 0;

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messagesaddTimer));

            console.log("已發送 WebSocket 訊息 addTimer", messagesaddTimer);
        } else {
            Swal.fire({
                icon: 'error',
                title: t("content_alert.extend_failure"),
            });
        }
    } catch (error) {
        console.error('加時失敗:', error);
        Swal.fire({
            icon: 'error',
            title: t("content_alert.extend_failure"),
        });
    }
}

//新增病人modal
const openAddModel = () => {
    const addModal = new bootstrap.Modal(document.getElementById('addModal'));
    addModal.show();
}

const patientNumber = ref('');
const appointmentTime = ref('');

//新增病人
const addPatient = async (id) => {
    console.log('Patient id:', id);

    console.log('Patient Number:', patientNumber.value);
    console.log('Appointment Time:', appointmentTime.value);

    if (!patientNumber.value || !appointmentTime.value) {
        Swal.fire({
            icon: 'error',
            title: t("content_alert.error"),
            text: t("content_alert.incomplete_patient_info")
        });
        return;
    }
    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/add_patient/${room.id}/`, {
            number: patientNumber.value,
            reserve_time: appointmentTime.value
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.status === 201) {
            Swal.fire({
                icon: 'success',
                title: t("content_alert.add_success"),
            });

            // 清空輸入欄位
            patientNumber.value = "";
            appointmentTime.value = "";

            // 重新讀取房間資料，更新病人表格
            Data();
            updateTime();

            // 關閉 Modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
            modal.hide();  // 這會隱藏 Modal

            // 構造要發送的訊息
            const messageAddTime = {
                event: "addPatient",
                data: {
                    id: room.id,
                }
            };

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messageAddTime));

            console.log("已發送 WebSocket 訊息 addPatient：", messageAddTime);
        } else {
            Swal.fire({
                icon: 'error',
                title: t("content_alert.add_failure"),
            });
        }

    } catch (error) {
        console.error("新增病人失敗:", error);
        Swal.fire({
            icon: 'error',
            title: t("content_alert.add_failure"),
        });
    }
};

//格式化預約時間
let updateTimeInterval = null;

const updateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    appointmentTime.value = new Date(now - offset).toISOString().slice(0, 16);
};

//倒數計時
let intervalid = null;

const updateTimer = () => {
    // 重設倒數計時
    if (intervalid) clearInterval(intervalid);
    intervalid = setInterval(() => {
        if (room.time > 0 && room.state === 'in_use') {
            room.time -= 1;
        }
        if (room.time <= 0 && room.state === 'in_use') {
            clearInterval(intervalid);  // 停止計時器
            intervalid = null;
            endTimer(room.id);  // 結束計時，並將狀態更新為空閒中
        }
    }, 1000);  // 每秒減少 1 秒
};

// 組件掛載時執行
onMounted(() => {
    setupWebSocket();
    Data();
    updateTime();
    updateTimeInterval = setInterval(updateTime, 60000);
});

onUnmounted(() => {
    if (updateTimeInterval) clearInterval(updateTimeInterval);
});
</script>
<template>
    <div class="container my-5 card p-3 border-5" :style="{ borderColor: room.color, borderRadius: '25px' }">
        <div class="row justify-content-between">
            <div class="col-6 col-md-6 mt-1 text-md-start">
                <h1>{{ $t("content.chair_number", { id: room.id }) }}</h1><!-- 第 n 診療椅 -->
            </div>
            <div class="col-5 col-md-6 text-md-end">
                <button class="btn btn-primary btn-lg" style="width: 140px;" @click="openAddModel">
                    <img class="bi mb-1" src="/SVG/新增(白).svg" style="height: 20px;" />
                    {{
                        $t("content.add")
                    }}</button><!-- 新增按鈕 -->
            </div>
        </div>
        <div class="row justify-content-around">
            <div class="col-12 col-md-6 text-md-start">
                <h1>{{ $t("content.status") }}: <span :class="room.state === 'free' ? 'green-dot' : 'red-dot'"></span>{{
                    formatState(room.state)
                }}</h1><!-- 狀態 -->
            </div>
            <div class="col-12 col-md-6 mt-2 text-md-end">
                <button class="btn btn-primary me-1 btn-lg" @click="startTimer(room.id)" style="width: 32%;"
                    :disabled="room.state === 'in_use'">
                    <img class="bi mb-1" src="/SVG/開始.svg" style="height: 20px;" />
                    {{ $t("content.start") }}</button><!-- 開始按鈕 -->
                <button class="btn btn-warning me-1 btn-lg" @click="openAddtimeModal" style="width: 32%;"
                    :disabled="room.state === 'free'">
                    <img class="bi mb-1" src="/SVG/新增(白).svg" style="height: 20px;" />
                    {{ $t("content.extend") }}</button><!-- 加時按鈕 -->
                <button class="btn btn-secondary me-1 btn-lg" @click="endTimer(room.id)" style="width: 32%;"
                    :disabled="room.state === 'free'">
                    <img class="bi mb-1" src="/SVG/結束.svg" style="height: 20px;" />
                    {{ $t("content.end") }}</button><!-- 結束按鈕 -->
            </div>
        </div>
        <div class="row  gy-3  justify-content-around">
            <div class="col-12 col-md-12 text-md-start">
                <h1>{{ $t("content.usage_time") }}:{{ formatTime(room.time) }}</h1><!-- 使用時間 -->
            </div>
            <div class="col-12 col-md-6 text-md-start">
                <button class="btn btn-success me-1 btn-lg" style="width: 32%;" @click="addTime(-45)"
                    :disabled="room.state === 'in_use'">-45
                    min</button><!-- -45按鈕 -->
                <button class="btn btn-success me-1 btn-lg" style="width: 32%;" @click="addTime(-30)"
                    :disabled="room.state === 'in_use'">-30
                    min</button><!-- -30按鈕 -->
                <button class="btn btn-success me-1 btn-lg" style="width: 32%;" @click="addTime(-15)"
                    :disabled="room.state === 'in_use'">-15
                    min</button><!-- -15按鈕 -->
            </div>
            <div class="col-12 col-md-6 text-md-end">
                <button class="btn btn-success me-1 btn-lg" style="width: 32%;" @click="addTime(15)"
                    :disabled="room.state === 'in_use'">+15
                    min</button><!-- +15按鈕 -->
                <button class="btn btn-success me-1 btn-lg" style="width: 32%;" @click="addTime(30)"
                    :disabled="room.state === 'in_use'">+30
                    min</button><!-- +30按鈕 -->
                <button class="btn btn-success me-1 btn-lg" style="width: 32%;" @click="addTime(45)"
                    :disabled="room.state === 'in_use'">+45
                    min</button><!-- +45按鈕 -->
            </div>
        </div>
        <div class="mt-3">
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th style="width: 20%;">{{ $t("content.serial_number") }}</th>
                        <th style="width: 40%;">{{ $t("content.medical_record_number") }}</th>
                        <th style="width: 40%;">{{ $t("content.appointment_time") }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(patient, index) in room.patients" :key="patient.id">
                        <td>{{ index + 1 }}</td>
                        <td>{{ patient.number }}</td>
                        <td>{{ formatDate(patient.reserve_time) }}</td>
                    </tr>
                    <tr v-if="room.patients.length === 0">
                        <td colspan="3">{{ $t("content.no_patient") }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    <!-- addModal -->
    <div class="modal fade" id="addModal" tabindex="-1" aria-labelledby="addModalLabel">
        <div class="modal-dialog  modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="addModalLabel">
                        <img class="bi mb-1" src="/SVG/新增患者.svg" style="height: 20px;" />
                        {{ $t("content_model.add_patient", { id: room.id })
                        }}
                    </h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="input-group mb-3">
                            <label class="input-group-text" for="Number">{{ $t("content_model.medical_record_number")
                                }}</label>
                            <input type="text" class="form-control" id="Number" v-model="patientNumber"
                                :placeholder="placeholderText" required>
                        </div>
                        <div class="input-group mb-3">
                            <span class="input-group-text" id="appointment-addon">{{
                                $t("content_model.appointment_time") }}</span>
                            <input type="datetime-local" class="form-control" aria-label="預約時間"
                                aria-describedby="appointment-addon" v-model="appointmentTime" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{
                        $t("content_model.cancel") }}</button>
                    <button type="button" class="btn btn-primary" @click="addPatient">
                        <img class="bi mb-1 me-1" src="/SVG/確認.svg" style="height: 20px;" />{{ $t("content_model.add")
                        }}</button>
                </div>
            </div>
        </div>
    </div>
    <!-- addtimeModal -->
    <div class="modal fade" id="addtimeModal" tabindex="-1" aria-labelledby="addtimeModalLabel">
        <div class="modal-dialog  modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="addtimeModalLabel">
                        <img class="bi mb-1" src="/SVG/新增患者.svg" style="height: 20px;" />
                        {{ $t("content_model.extend_time", {
                            id: room.id
                        }) }}
                    </h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <h1>{{ formatTime(modalTime) }}</h1>
                    <div class="my-3">
                        <button class="btn btn-success me-2 btn-lg" @click="addmodalTime(15)">+15 min</button>
                        <button class="btn btn-success me-2 btn-lg" @click="addmodalTime(30)">+30 min</button>
                        <button class="btn btn-success me-2 btn-lg" @click="addmodalTime(45)">+45 min</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{
                        $t("content_model.cancel") }}</button>
                    <button type="button" class="btn btn-primary" @click="addTimer(room.id)">
                        <img class="bi mb-1 me-1" src="/SVG/確認.svg" style="height: 20px;" />{{
                            $t("content_model.extend") }}</button>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.green-dot::before {
    content: "●";
    color: green;
    font-size: 1.35em;
}

.red-dot::before {
    content: "●";
    color: red;
    font-size: 1.35em;
}
</style>