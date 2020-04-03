import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { Button, Progress, Message } from 'element-ui'

Vue.config.productionTip = false

Vue.prototype.$message = Message
Vue.use(Button)
Vue.use(Progress)

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app')
