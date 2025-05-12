<script setup>
import 'bootstrap';
import * as bootstrap from 'bootstrap';
import { onMounted, onUnmounted, reactive, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import Swal from 'sweetalert2'

const { t, locale } = useI18n();

const rooms = reactive({});

const num = ref(0)

//初始資料
const Data = async () => {
    try {
        const response = await axios.get(`https://f4jtjhdx-8000.asse.devtunnels.ms/rooms_and_patients/`);

        // 清除舊房間與倒數計時器
        Object.keys(rooms).forEach(key => {
            if (rooms[key].countdown) clearInterval(rooms[key].countdown);
            delete rooms[key];
        });

        // 新增房間資料
        response.data.forEach(room => {
            room.countdown = null;
            rooms[room.id] = room;

            if (room.time > 0 && room.state === 'in_use') {
                startCountdown(rooms[room.id]); // 確保是 reactive 的 room
            }
        });

        const response1 = await axios.get('https://f4jtjhdx-8000.asse.devtunnels.ms/visibleCount/');
        num.value = response1.data.visibleCount;

    } catch (error) {
        console.error("Error fetching data:", error);
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

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Reception收到消息：", data);
        if (data.event === "addPatient" || data.event === "startTimer" ||
            data.event === "deletePatient" || data.event === "editPatient" ||
            data.event === "endTimer_in_counter" || data.event === "changeColor" ||
            data.event === "changeCount"
        ) {
            await Data();
        } else if (data.event === "addTimer" || data.event === "endTimer") {
            await msgalert(data)
            await Data();
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



let isPlaying = false; // 控制音效是否已播放中

// 提示音
const msgalert = async (data) => {
    if (isPlaying) return; // 若音效正在播放，就不再觸發
    isPlaying = true;

    let message = data.event;

    // 根據事件與語系轉換訊息
    if (data.event === "addTimer" && data.time) {
        let minutes = Math.floor(data.time / 60);
        if (locale.value === 'en') {
            message = `Add ${minutes} minutes`;
        } else if (locale.value === 'th') {
            message = `เพิ่ม ${minutes} นาที`;
        } else if (locale.value === 'zh') {
            message = `加時 ${minutes} 分鐘`;
        }
    } else if (data.event === "endTimer") {
        if (locale.value === 'en') {
            message = `End`;
        } else if (locale.value === 'th') {
            message = `สิ้นสุด`;
        } else if (locale.value === 'zh') {
            message = `結束`;
        }
    }

    try {
        Swal.fire({
            icon: "success",
            title: t("reception_alert.room_message", { id: data.id, message: message }),
            didOpen: () => {
                let source = new Audio("/music_1_cut.mp3");
                source.loop = true;
                source.play().catch(error => {
                    console.warn("音效播放失敗:", error);
                    isPlaying = false;
                });

                const confirmButton = document.querySelector('.swal2-confirm');
                confirmButton.addEventListener('click', () => {
                    source.pause();
                    isPlaying = false; // 重置狀態
                    console.log('音效已停止');
                });
            },
            willClose: () => {
                isPlaying = false; // 防止例外沒點按鈕的情況
            }
        });

        await Data(); // 重新載入
    } catch (error) {
        console.error("發送訊息失敗:", error);
        isPlaying = false;
        Swal.fire({
            icon: "error",
            title: t("reception_alert.room_message_failure", { id: data.id }),
        });
    }
};


//倒數計時
const startCountdown = (room) => {
    if (room.countdown) return;

    room.countdown = setInterval(() => {
        if (room.time > 0 && room.state === 'in_use') {
            room.time--;
        } else {
            clearInterval(room.countdown);
            room.countdown = null;
        }
    }, 1000);
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

//格式化預約時間modal
let updateTimeInterval = null;
const appointmentTime = ref('');
const patientNumber = ref('');

const updateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    appointmentTime.value = new Date(now - offset).toISOString().slice(0, 16);
};

//格式化病歷編號placeholderText
const placeholderText = computed(() => {
    return locale.value === 'en'
        ? 'Please enter the medical record number'
        : locale.value === 'th'
            ? 'กรุณาป้อนหมายเลขเวชระเบียน'
            : '請輸入病歷編號';
});

const selectedRoomId = ref();
const selectedPatient = ref();
const selectedButton = ref();

//新增modal
const openAddModal = (roomId) => {
    selectedRoomId.value = roomId;
    const addModal = new bootstrap.Modal(document.getElementById('addModal'));
    addModal.show();
}

//新增病人
const addPatient = async () => {
    // console.log(appointmentTime.value);
    // console.log(patientNumber.value);
    // console.log(selectedRoomId.value);


    if (!appointmentTime.value || !patientNumber.value) {
        Swal.fire({
            icon: 'error',
            title: '錯誤',
            text: t("reception_alert.incomplete_patient_info")
        });
        return;
    }

    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/add_patient/${selectedRoomId.value}/`, {
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
                title: t("reception_alert.add_success"),
            });

            // 關閉 Modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
            modal.hide();  // 這會隱藏 Modal

            const messageaddPatient = {
                event: "addPatient",
                data: {
                    id: selectedRoomId.value,
                }
            };

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messageaddPatient));

            console.log("已發送 WebSocket 訊息 addPatient：", messageaddPatient);

            // 清空輸入欄位
            appointmentTime.value = "";
            patientNumber.value = "";
            selectedRoomId.value = "";

            // 重新讀取房間資料，更新病人表格
            await Data();
            updateTime();
        } else {
            Swal.fire({
                icon: 'error',
                title: t("reception_alert.add_failure"),
            });
        }

    } catch (error) {
        console.error("新增病人失敗:", error);
        Swal.fire({
            icon: 'error',
            title: t("reception_alert.add_failure"),
        });
    }
}

//編輯modal
const openEditModal = (patient) => {
    selectedPatient.value = patient
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
}

//編輯病人
const editPatient = async (room_id) => {
    // console.log(room_id);
    // console.log(selectedPatient.value);
    // console.log(selectedPatient.value.id);

    if (!selectedPatient.value) {
        Swal.fire({
            icon: 'error',
            title: t("reception_alert.error"),
        });
        return;
    }

    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/update_patient/${selectedPatient.value.id}/`, {
            room_id: room_id
        });

        if (response.status === 200) {
            Swal.fire({
                icon: 'success',
                title: t("reception_alert.update_success"),
            });

            // 關閉 Modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();  // 這會隱藏 Modal

            const messageeditPatient = {
                event: "editPatient",
                data: {
                    patient_id: selectedPatient.value.id,
                    room_id: room_id,
                }
            };

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messageeditPatient));

            console.log("已發送 WebSocket 訊息 editPatient：", messageeditPatient);

            // 重新讀取房間資料，更新病人表格
            await Data();
        } else {
            Swal.fire({
                icon: 'error',
                title: t("reception_alert.update_failure"),
            });
        }
    } catch (error) {
        console.error('更新病人診室號失敗:', error);
        Swal.fire({
            icon: 'error',
            title: t("reception_alert.update_failure"),
        });
    }
}

//刪除病人
const Delete = async (patient) => {
    // console.log(patient);
    // console.log(patient.id);

    // SweetAlert2 確認刪除對話框
    const result = await Swal.fire({
        title: t("reception_alert.confirm_delete_patient"),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: t("reception_alert.confirm"),
        cancelButtonText: t("reception_alert.cancel")
    });

    // 如果用戶確認刪除
    if (result.isConfirmed) {
        try {
            const response = await axios.delete(`https://f4jtjhdx-8000.asse.devtunnels.ms/delete_patient/${patient.id}/`);

            if (response.status === 200) {
                Swal.fire({
                    icon: 'success',
                    title: t("reception_alert.delete_success"),
                });

                const messagedeletePatient = {
                    event: "deletePatient",
                    data: {
                        patient_id: patient.id,
                    }
                };

                // 傳送 WebSocket 訊息
                socket.send(JSON.stringify(messagedeletePatient));

                console.log("已發送 WebSocket 訊息 deletePatient", messagedeletePatient);

                await Data();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: t("reception_alert.delete_failure"),
                });
            }
        } catch (error) {
            console.error('刪除病人時發生錯誤:', error);
            Swal.fire({
                icon: 'error',
                title: t("reception_alert.delete_failure"),
            });
        }
    }
}

//結束
const endTimer = async (id) => {
    console.log("結束計時被觸發！", id);

    try {
        const response = await axios.post(`https://f4jtjhdx-8000.asse.devtunnels.ms/end/${id}/`, {}, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.status === 200) {
            Swal.fire({
                icon: "success",
                title: t("reception_alert.timer_ended"),
                text: t("reception_alert.room_reset"),
            });

            const messagesendTimer = {
                event: "endTimer_in_counter",
                data: {
                    id: id,
                }
            };

            // 傳送 WebSocket 訊息
            socket.send(JSON.stringify(messagesendTimer));

            console.log("已發送 WebSocket 訊息 endTimer", messagesendTimer);

            await Data();
        } else {
            Swal.fire({
                icon: "error",
                title: t("reception_alert.end_failure"),
            });
        }
    } catch (error) {
        console.error("結束計時失敗:", error);
        Swal.fire({
            icon: "error",
            title: t("reception_alert.end_failure"),
        });
    }
}

// 組件掛載時執行
onMounted(async () => {
    setupWebSocket();
    await Data();
    updateTime();
    updateTimeInterval = setInterval(updateTime, 60000);
});

onUnmounted(() => {
    if (updateTimeInterval) clearInterval(updateTimeInterval);
});
</script>
<template>
    <h1 class="my-5 text-white">{{ $t("reception.room_status") }}</h1><!-- 診室狀態 -->
    <div class="Consult_room mt-5 text-center">
        <div class="row">
            <div class="col-12 mt-1" :class="{'col-md-12': num === 1, 'col-md-6': num > 1}" v-for="room in Object.values(rooms).slice(0, num)" :key="room.id">
                <div class="card mb-3 border-5" :style="{ borderColor: room.color, borderRadius: '25px' }">
                    <div class="card-body">
                        <div class="row justify-content-between"><!-- row_1 -->
                            <div class="col-6 col-md-6 mt-3">
                                <h1 class="card-title">{{ $t("reception.chair_number", { id: room.id }) }}</h1>
                                <!-- 第 n 診療椅 -->
                            </div>
                            <div class="col-6 col-md-6">
                                <h1><span :class="room.state === 'free' ? 'green-dot' : 'red-dot'"></span>{{
                                    formatState(room.state)
                                }}</h1><!-- 狀態 -->
                            </div>
                        </div>
                        <div class="row justify-content-between"><!-- row_2 -->
                            <div class="col-12 col-md-7 mt-2">
                                <h2>{{ $t("reception.usage_time") }}: {{ formatTime(room.time) }}</h2><!-- 使用時間 -->
                            </div>
                            <div class="col-12 col-md-5">
                                <div class="d-xl-inline-block d-none">
                                    <button class="btn btn-primary btn-lg mb-2 me-1" style="width: 6.5rem;"
                                        @click="openAddModal(room.id)"> <img class="bi mb-1" src="/SVG/新增(白).svg"
                                            style="height: 20px;" />
                                        {{
                                            $t("reception.add")
                                        }}</button><!-- 新增按鈕 -->
                                    <button class="btn btn-secondary btn-lg mb-2" style="width: 6.5rem;"
                                        @click="endTimer(room.id)" :disabled="room.state === 'free'">
                                        <img class="bi mb-1" src="/SVG/結束.svg" style="height: 20px;" />
                                        {{ $t("reception.end") }}</button><!-- 結束按鈕 -->
                                </div>
                                <div class="d-xl-none d-inline-block mt-1">
                                    <button class="btn btn-primary mb-2 me-1" style="width: 6rem;"
                                        @click="openAddModal(room.id)"> <img class="bi mb-1" src="/SVG/新增(白).svg"
                                            style="height: 20px;" />
                                        {{
                                            $t("reception.add")
                                        }}</button><!-- 新增按鈕 -->
                                    <button class="btn btn-secondary mb-2 " style="width: 6rem;"
                                        @click="endTimer(room.id)" :disabled="room.state === 'free'">
                                        <img class="bi mb-1" src="/SVG/結束.svg" style="height: 20px;" />
                                        {{ $t("reception.end") }}</button><!-- 結束按鈕 -->
                                </div>
                            </div>
                        </div>
                        <div class="mt-1" style="height: 250px; overflow-y: auto; overflow-x: hidden; display: block;">
                            <!-- table -->
                            <table class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th style="width: 25%;">{{ $t("reception.medical_record_number") }}</th>
                                        <!-- 病歷編號 -->
                                        <th style="width: 50%;">{{ $t("reception.appointment_time") }}</th><!-- 預約時間 -->
                                        <th style="width: 25%;">{{ $t("reception.operation") }}</th><!-- 操作 -->
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(patient, index) in room.patients" :key="index">
                                        <td>{{ patient.number }}</td><!-- 病歷編號 -->
                                        <td>{{ formatDate(patient.reserve_time) }}</td><!-- 預約時間 -->
                                        <td><!-- 操作 -->
                                            <div class="row justify-content-center">
                                                <div class="col-12 col-md-6">
                                                    <button class="btn" @click="openEditModal(patient)">
                                                        <img class="bi mb-1" src="/SVG/更新.svg" style="height: 20px;" />
                                                    </button><!-- 更新按鈕 -->
                                                </div>
                                                <div class="col-12 col-md-6">
                                                    <button class="btn" @click="Delete(patient)">
                                                        <img class="bi mb-1" src="/SVG/刪除.svg" style="height: 20px;" />
                                                    </button><!-- 刪除按鈕 -->
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr v-if="room.patients.length === 0">
                                        <td colspan="3">{{ $t("reception.no_patient") }}</td><!-- 無病人 -->
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- addModal -->
        <div class="modal fade" id="addModal" tabindex="-1" aria-labelledby="addModalLabel">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h1 class="modal-title fs-5" id="addModalLabel">
                            <img class="bi mb-1" src="/SVG/新增患者.svg" style="height: 30px;" />
                            {{ $t("reception_model.add_patient", {
                                id: selectedRoomId
                            }) }}
                        </h1><!-- 新增病人 - 第 n 診療椅 -->
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="input-group mb-3">
                                <label class="input-group-text" for="Number">{{
                                    $t("reception_model.medical_record_number")
                                }}</label><!-- 病歷編號 -->
                                <input type="text" class="form-control" id="Number" v-model="patientNumber"
                                    :placeholder="placeholderText" required>
                            </div>
                            <div class="input-group mb-3">
                                <span class="input-group-text" id="appointment-addon">{{
                                    $t("reception_model.appointment_time")
                                }}</span><!-- 預約時間 -->
                                <input type="datetime-local" class="form-control" aria-label="預約時間"
                                    aria-describedby="appointment-addon" v-model="appointmentTime" required lang="en">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{
                            $t("reception_model.cancel")
                        }}</button><!-- 取消按鈕 -->
                        <button type="button" class="btn btn-primary" @click="addPatient">
                            <img class="bi mb-1" src="/SVG/新增(白).svg" style="height: 20px;" />
                            {{ $t("reception_model.add")
                            }}</button><!-- 確定新增按鈕 -->
                    </div>
                </div>
            </div>
        </div>
        <!-- editModal -->
        <div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel">
            <div class="modal-dialog  modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h1 class="modal-title fs-5" id="editModalLabel"> <img class="bi mb-1" src="/SVG/更新.svg"
                                style="height: 30px;" />
                            {{ $t("reception_model.change_patient_room") }}</h1>
                        <!-- 更改病人診室號 -->
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- 顯示 10 個 radio 按鈕，使用 Bootstrap row 來排列 -->
                        <div class="row">
                            <div v-for="(room, index) in rooms" :key="index" class="col-6 col-md-4 mb-3">
                                <!-- 每個 radio 按鈕 -->
                                <input type="radio" class="btn-check" :id="'radio-' + (index)" name="options-outlined"
                                    :value="index" v-model="selectedButton" autocomplete="off" />
                                <label class="btn w-100" :for="'radio-' + (index)" :style="{
                                    borderColor: room.color,
                                    color: selectedButton === (index) ? '#fff' : room.color,
                                    backgroundColor: selectedButton === (index) ? room.color : '#fff'
                                }">
                                    {{ $t("reception_model.room_number", { index: index }) }}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{
                            $t("reception_model.cancel")
                        }}</button><!-- 取消按鈕 -->
                        <button type="button" class="btn btn-primary" @click="editPatient(selectedButton)">
                            <img class="bi mb-1 me-1" src="/SVG/確認.svg" style="height: 20px;" />{{
                                $t("reception_model.confirm") }}</button><!-- 確定更新按鈕 -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
html,
body {
    overflow-x: hidden;
}

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