import { defineBoot } from '#q-app/wrappers'
import { createClient } from '@supabase/supabase-js'

// 创建 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] 未配置 Supabase URL 或 Key，请检查环境变量')
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export default defineBoot(({ app }) => {
  // 将 supabase 添加到全局属性
  app.config.globalProperties.$supabase = supabase
})

export { supabase }
