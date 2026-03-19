<template>
  <div class="login-page flex flex-center">
    <q-card class="login-card">
      <q-card-section class="text-center">
        <q-icon name="eco" size="64px" color="primary" />
        <div class="text-h5 q-mt-md text-weight-bold text-primary">清新绿 CMS</div>
        <div class="text-subtitle2 text-grey">欢迎回来</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <!-- 用户名 -->
          <q-input
            v-model="form.username"
            label="用户名"
            outlined
            dense
            :rules="[val => !!val || '请输入用户名']"
            @keyup.enter="onSubmit"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <!-- 密码 -->
          <q-input
            v-model="form.password"
            label="密码"
            type="password"
            outlined
            dense
            :rules="[val => !!val || '请输入密码']"
            @keyup.enter="onSubmit"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>

          <!-- 记住我 -->
          <div class="row items-center">
            <q-checkbox v-model="rememberMe" label="记住我" dense />
          </div>

          <!-- 登录按钮 -->
          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            size="lg"
            label="登录"
            :loading="loading"
          />

          <!-- 注册链接 -->
          <div class="text-center q-mt-md">
            <span class="text-grey">还没有账号？</span>
            <q-btn
              flat
              color="primary"
              label="立即注册"
              to="/register"
              dense
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { SHA256 } from 'crypto-js'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const rememberMe = ref(false)

const form = ref({
  username: '',
  password: ''
})

// 检查是否已登录
onMounted(() => {
  if (authStore.isLoggedIn) {
    router.push('/')
  }
})

async function onSubmit() {
  if (!form.value.username || !form.value.password) {
    $q.notify({
      type: 'warning',
      message: '请输入用户名和密码'
    })
    return
  }

  loading.value = true
  try {
    // 密码加密
    const encryptedPassword = SHA256(form.value.password).toString()
    
    await authStore.login({
      username: form.value.username,
      password: encryptedPassword
    })

    $q.notify({
      type: 'positive',
      message: '登录成功'
    })

    // 跳转到首页
    router.push('/')
  } catch (error) {
    console.error(error)
    // 错误已由全局拦截器处理，页面组件只需处理自身的loading状态
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}
</style>
