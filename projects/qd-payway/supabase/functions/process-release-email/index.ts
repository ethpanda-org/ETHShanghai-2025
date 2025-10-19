import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { releasePayment } from './blockchain.ts'
import { sendReleaseSuccessEmail, sendReleaseFailureEmail } from './email.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    console.log('=== Processing release email request ===')
    console.log(`Request method: ${req.method}`)
    console.log(`Request headers:`, Object.fromEntries(req.headers.entries()))
    
    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 解析 SendGrid Webhook 数据（Parsed 格式）
    // SendGrid 会自动解析邮件，提供 from, subject, envelope 等字段
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (error) {
      console.error('Failed to parse form data:', error)
      return new Response(
        JSON.stringify({ error: 'Body can not be decoded as form data', details: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const from = formData.get('from')?.toString() || ''
    const subject = formData.get('subject')?.toString() || ''
    const envelope = formData.get('envelope')?.toString() || ''
    const to = formData.get('to')?.toString() || ''

    console.log(`Email from: ${from}`)
    console.log(`Email to: ${to}`)
    console.log(`Subject: ${subject}`)
    
    // 如果关键字段缺失，返回错误
    if (!from || !subject) {
      console.error('Missing required fields')
      console.log('All form data keys:', Array.from(formData.keys()))
      return new Response(
        JSON.stringify({ error: 'Missing required fields (from or subject)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 提取真实的发件人邮箱
    // 优先使用 envelope.from（SMTP 级别的真实发件人）
    // 否则从 from 字段提取（可能包含名字，如 "User Name <user@example.com>"）
    let senderEmail = from
    
    // 1. 尝试从 envelope 获取真实发件人
    if (envelope) {
      try {
        const envelopeData = JSON.parse(envelope)
        if (envelopeData.from) {
          senderEmail = envelopeData.from
        }
      } catch (error) {
        console.warn('Failed to parse envelope:', error)
      }
    }
    
    // 2. 如果 from 包含尖括号格式 "Name <email>"，提取邮箱部分
    if (senderEmail.includes('<')) {
      const emailMatch = senderEmail.match(/<(.+?)>/)
      if (emailMatch) {
        senderEmail = emailMatch[1]
      }
    }
    
    // 3. 统一转换为小写并去除空格
    senderEmail = senderEmail.toLowerCase().trim()
    console.log(`Extracted sender email: ${senderEmail}`)

    // 1. 验证邮件主题格式: RELEASE: [订单号]
    const subjectMatch = subject.match(/RELEASE:\s*(\d+)/i)
    if (!subjectMatch) {
      console.error('Invalid email subject format')
      return new Response(
        JSON.stringify({ error: 'Invalid email subject format. Expected: RELEASE: [Order ID]' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderId = subjectMatch[1]
    console.log(`Order ID: ${orderId}`)

    // 2. 查询合约信息
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (contractError || !contract) {
      console.error('Contract not found:', contractError)
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Contract found: ${contract.order_id}, status: ${contract.status}`)

    // 3. 双重验证
    const verificationEmail = (contract.verification_email || '').toLowerCase().trim()
    
    // 验证发件人邮箱
    if (senderEmail !== verificationEmail) {
      console.error(`Email mismatch: ${senderEmail} !== ${verificationEmail}`)
      
      // 发送失败通知
      await sendReleaseFailureEmail(
        senderEmail,
        orderId,
        '邮箱验证失败：发件人邮箱与合约预留邮箱不一致'
      )
      
      return new Response(
        JSON.stringify({ error: 'Email verification failed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 验证合约状态
    if (contract.status !== 'PENDING') {
      console.error(`Invalid contract status: ${contract.status}`)
      
      await sendReleaseFailureEmail(
        verificationEmail,
        orderId,
        `合约状态无效：当前状态为 ${contract.status}，只有状态为 PENDING 的合约才能申请放款`
      )
      
      return new Response(
        JSON.stringify({ error: 'Invalid contract status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 检查是否已有成功的放款记录（防止重复处理）
    const { data: existingRelease } = await supabase
      .from('release_requests')
      .select('*')
      .eq('order_id', orderId)
      .eq('request_status', 'completed')
      .maybeSingle()

    if (existingRelease) {
      console.log('Release already processed')
      return new Response(
        JSON.stringify({ message: 'Release already processed', txHash: existingRelease.transaction_hash }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. 创建 release_request 记录（状态：processing）
    const { data: releaseRequest, error: insertError } = await supabase
      .from('release_requests')
      .insert({
        order_id: orderId,
        sender_email: senderEmail,
        request_status: 'processing',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating release request:', insertError)
      throw new Error('Failed to create release request')
    }

    console.log(`Release request created: ${releaseRequest.id}`)

    // 6. 调用智能合约执行放款
    console.log('Calling blockchain...')
    const { txHash } = await releasePayment(orderId)
    console.log(`Transaction successful: ${txHash}`)

    // 7. 更新 release_request 状态为 completed
    await supabase
      .from('release_requests')
      .update({
        request_status: 'completed',
        transaction_hash: txHash,
        processed_at: new Date().toISOString(),
      })
      .eq('id', releaseRequest.id)

    // 8. 更新合约状态为 PAID
    await supabase
      .from('contracts')
      .update({
        status: 'PAID',
        transaction_hash: txHash,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)

    console.log('Database updated successfully')

    // 9. 发送成功通知邮件（付款方和收款方）
    const notifications = []
    
    // 通知付款方
    if (verificationEmail) {
      notifications.push(
        sendReleaseSuccessEmail(
          verificationEmail,
          orderId,
          contract.amount,
          contract.receiver_address,
          txHash
        )
      )
    }

    // 通知收款方（如果有邮箱）
    // 注意：当前版本收款方没有预留邮箱，未来可扩展
    
    await Promise.all(notifications)

    // 10. 记录执行日志
    const duration = Date.now() - startTime
    console.log(`=== Release completed successfully in ${duration}ms ===`)

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        txHash,
        message: 'Release processed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: any) {
    console.error('Error processing release:', error)

    const duration = Date.now() - startTime
    console.log(`=== Release failed after ${duration}ms ===`)

    // 尝试更新 release_request 状态为 failed
    try {
      const formData = await req.formData()
      const subject = formData.get('subject')?.toString() || ''
      const subjectMatch = subject.match(/RELEASE:\s*(\d+)/i)
      
      if (subjectMatch) {
        const orderId = subjectMatch[1]
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 查找最新的 processing 状态记录
        const { data: pendingRequest } = await supabase
          .from('release_requests')
          .select('*')
          .eq('order_id', orderId)
          .eq('request_status', 'processing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (pendingRequest) {
          await supabase
            .from('release_requests')
            .update({
              request_status: 'failed',
              error_message: error.message,
              processed_at: new Date().toISOString(),
            })
            .eq('id', pendingRequest.id)

          // 发送失败通知
          const { data: contract } = await supabase
            .from('contracts')
            .select('verification_email')
            .eq('order_id', orderId)
            .single()

          if (contract?.verification_email) {
            await sendReleaseFailureEmail(
              contract.verification_email,
              orderId,
              error.message
            )
          }
        }
      }
    } catch (updateError) {
      console.error('Error updating failed status:', updateError)
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

