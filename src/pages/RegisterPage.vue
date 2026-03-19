<template>
  <div class="register-page flex flex-center">
    <q-card class="register-card">
      <q-card-section class="text-center">
        <q-icon name="eco" size="64px" color="primary" />
        <div class="text-h5 q-mt-md text-weight-bold text-primary">清新绿 CMS</div>
        <div class="text-subtitle2 text-grey">创建新账号</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <!-- 用户名 -->
          <q-input
            v-model="form.username"
            label="用户名 *"
            outlined
            dense
            :rules="[
              val => !!val || '请输入用户名',
              val => val.length >= 3 || '用户名至少3个字符',
              val => /^[a-zA-Z0-9_]+$/.test(val) || '用户名只能包含字母、数字和下划线'
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <!-- 邮箱 -->
          <q-input
            v-model="form.email"
            label="邮箱 *"
            type="email"
            outlined
            dense
            :rules="[
              val => !!val || '请输入邮箱',
              val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || '请输入有效的邮箱地址'
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <!-- 密码 -->
          <q-input
            v-model="form.password"
            label="密码 *"
            type="password"
            outlined
            dense
            :rules="[
              val => !!val || '请输入密码',
              val => val.length >= 6 || '密码至少6个字符'
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>

          <!-- 确认密码 -->
          <q-input
            v-model="form.confirmPassword"
            label="确认密码 *"
            type="password"
            outlined
            dense
            :rules="[
              val => !!val || '请确认密码',
              val => val === form.password || '两次输入的密码不一致'
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="lock_outline" />
            </template>
          </q-input>

          <!-- 用户协议 -->
          <div class="row items-center">
            <q-checkbox v-model="agreeTerms" dense>
              <template v-slot:default>
                <span class="text-caption">
                  我已阅读并同意
                  <a href="javascript:void(0)" class="text-primary">用户协议</a>
                  和
                  <a href="javascript:void(0)" class="text-primary">隐私政策</a>
                </span>
              </template>
            </q-checkbox>
          </div>

          <!-- 注册按钮 -->
          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            size="lg"
            label="注册"
            :loading="loading"
            :disable="!agreeTerms"
          />

          <!-- 登录链接 -->
          <div class="text-center q-mt-md">
            <span class="text-grey">已有账号？</span>
            <q-btn
              flat
              color="primary"
              label="立即登录"
              to="/login"
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
const agreeTerms = ref(false)

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 检查是否已登录
onMounted(() => {
  if (authStore.isLoggedIn) {
    router.push('/')
  }
})

async function onSubmit() {
  // 表单验证
  if (!form.value.username || !form.value.email || !form.value.password) {
    $q.notify({
      type: 'warning',
      message: '请填写所有必填项'
    })
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    $q.notify({
      type: 'warning',
      message: '两次输入的密码不一致'
    })
    return
  }

  if (!agreeTerms.value) {
    $q.notify({
      type: 'warning',
      message: '请同意用户协议和隐私政策'
    })
    return
  }

  loading.value = true
  try {
    // 密码加密
    const encryptedPassword = SHA256(form.value.password).toString()
    
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      password: encryptedPassword
    })

    $q.notify({
      type: 'positive',
      message: '注册成功，请登录'
    })

    // 跳转到登录页
    router.push('/login')
  } catch (error) {
    console.error(error)
    // 错误已由全局拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  min-height: 100vh;
}

.register-card {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}
</style>
