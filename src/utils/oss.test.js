/**
 * OSS 上传功能测试脚本
 * 
 * 使用方法:
 * 1. 浏览器测试: 访问 /test/oss 页面
 * 2. 手动测试: 在浏览器控制台运行以下代码
 */

import { uploadToOSS, uploadBatchToOSS, getOSSConfig, deleteFromOSS } from './oss'

/**
 * 测试配置是否正确
 */
export function testConfig() {
  console.log('========== OSS 配置测试 ==========')
  
  const config = getOSSConfig()
  console.log('Region:', config.region || '❌ 未配置')
  console.log('Bucket:', config.bucket || '❌ 未配置')
  console.log('AccessKey:', config.hasAccessKey ? '✅ 已配置' : '❌ 未配置')
  console.log('CustomDomain:', config.customDomain || '未配置（可选）')
  
  const isValid = config.region && config.bucket && config.hasAccessKey
  console.log('配置状态:', isValid ? '✅ 完整' : '❌ 不完整')
  
  return isValid
}

/**
 * 测试单文件上传
 * @param {File} file - 测试文件
 */
export async function testSingleUpload(file) {
  console.log('\n========== 单文件上传测试 ==========')
  console.log('测试文件:', file.name)
  console.log('文件大小:', file.size)
  console.log('文件类型:', file.type)
  
  const startTime = Date.now()
  
  try {
    const result = await uploadToOSS(file, {
      category: 'test',
      onProgress: (percent) => {
        console.log(`上传进度: ${percent}%`)
      }
    })
    
    const duration = Date.now() - startTime
    
    console.log('✅ 上传成功!')
    console.log('URL:', result.url)
    console.log('ObjectName:', result.objectName)
    console.log('ETag:', result.etag)
    console.log('上传耗时:', duration, 'ms')
    
    return {
      success: true,
      result,
      duration
    }
  } catch (error) {
    console.error('❌ 上传失败:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 测试批量上传
 * @param {File[]} files - 测试文件列表
 */
export async function testBatchUpload(files) {
  console.log('\n========== 批量上传测试 ==========')
  console.log('测试文件数:', files.length)
  
  const startTime = Date.now()
  
  try {
    const { results, errors } = await uploadBatchToOSS(files, {
      category: 'test',
      onProgress: (totalPercent, index, file) => {
        console.log(`总进度: ${Math.round(totalPercent)}%, 当前: ${file.name}`)
      }
    })
    
    const duration = Date.now() - startTime
    
    console.log('\n✅ 批量上传完成')
    console.log('成功:', results.length, '个')
    console.log('失败:', errors.length, '个')
    console.log('总耗时:', duration, 'ms')
    
    if (errors.length > 0) {
      console.log('\n失败详情:')
      errors.forEach(e => console.log(' -', e.file, ':', e.error))
    }
    
    return {
      success: true,
      results,
      errors,
      duration
    }
  } catch (error) {
    console.error('❌ 批量上传异常:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 测试删除文件
 * @param {string} objectName - OSS对象路径
 */
export async function testDelete(objectName) {
  console.log('\n========== 删除文件测试 ==========')
  console.log('删除对象:', objectName)
  
  try {
    await deleteFromOSS(objectName)
    console.log('✅ 删除成功')
    return { success: true }
  } catch (error) {
    console.error('❌ 删除失败:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 运行完整测试套件
 * @param {File[]} testFiles - 测试文件列表
 */
export async function runFullTest(testFiles) {
  console.log('╔════════════════════════════════════╗')
  console.log('║     OSS 上传功能完整测试套件       ║')
  console.log('╚════════════════════════════════════╝')
  
  const results = {
    config: false,
    singleUpload: null,
    batchUpload: null
  }
  
  // 1. 测试配置
  results.config = testConfig()
  
  if (!results.config) {
    console.error('\n❌ 配置不完整，终止测试')
    return results
  }
  
  // 2. 测试单文件上传
  if (testFiles && testFiles.length > 0) {
    results.singleUpload = await testSingleUpload(testFiles[0])
    
    // 如果单文件上传成功，测试删除
    if (results.singleUpload.success) {
      await testDelete(results.singleUpload.result.objectName)
    }
  }
  
  // 3. 测试批量上传
  if (testFiles && testFiles.length > 1) {
    results.batchUpload = await testBatchUpload(testFiles)
    
    // 清理测试文件
    if (results.batchUpload.success) {
      console.log('\n清理测试文件...')
      for (const result of results.batchUpload.results) {
        await testDelete(result.objectName)
      }
    }
  }
  
  // 测试报告
  console.log('\n╔════════════════════════════════════╗')
  console.log('║           测试报告总结             ║')
  console.log('╚════════════════════════════════════╝')
  console.log('配置检查:', results.config ? '✅ 通过' : '❌ 失败')
  console.log('单文件上传:', results.singleUpload?.success ? '✅ 通过' : '❌ 失败')
  if (results.singleUpload?.success) {
    console.log('  - 耗时:', results.singleUpload.duration, 'ms')
    console.log('  - URL:', results.singleUpload.result.url)
  }
  if (results.batchUpload) {
    console.log('批量上传:', results.batchUpload.success ? '✅ 通过' : '❌ 失败')
    console.log('  - 成功:', results.batchUpload.results.length, '个')
    console.log('  - 失败:', results.batchUpload.errors.length, '个')
    console.log('  - 总耗时:', results.batchUpload.duration, 'ms')
  }
  
  return results
}

/**
 * 快速测试（在浏览器控制台使用）
 * 
 * 使用示例:
 * 1. 打开浏览器开发者工具 (F12)
 * 2. 切换到 Console 标签
 * 3. 输入以下代码:
 * 
 *    // 检查配置
 *    testOSSConfig()
 *    
 *    // 测试单文件上传（先选择文件）
 *    const file = document.querySelector('input[type="file"]').files[0]
 *    testOSSUpload(file)
 *    
 *    // 运行完整测试
 *    const files = Array.from(document.querySelector('input[type="file"]').files)
 *    runOSSTest(files)
 */

// 全局暴露测试函数（用于浏览器控制台）
if (typeof window !== 'undefined') {
  window.testOSSConfig = testConfig
  window.testOSSUpload = testSingleUpload
  window.testOSSBatch = testBatchUpload
  window.runOSSTest = runFullTest
  
  console.log('OSS 测试工具已加载')
  console.log('可用函数:')
  console.log('  - testOSSConfig()      检查配置')
  console.log('  - testOSSUpload(file)  测试单文件上传')
  console.log('  - testOSSBatch(files)  测试批量上传')
  console.log('  - runOSSTest(files)    运行完整测试')
}

export default {
  testConfig,
  testSingleUpload,
  testBatchUpload,
  testDelete,
  runFullTest
}
