import { createI18n } from 'vue-i18n';  // 使用 createI18n 來初始化 i18n

import en from "./en";
import zh from "./zh";
import th from "./th";

const message = {
  zh,
  en,
  th
};
 
const i18n = createI18n({
  locale: "zh", // 设置语言类型
  legacy: false, // 如果要支持compositionAPI，此项必须设置为false;
  globalInjection: true, // 全局注册$t方法
  messages: message,
});
 
export default i18n;