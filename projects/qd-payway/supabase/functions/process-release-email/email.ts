/**
 * 邮件发送辅助函数
 * 使用 SendGrid API 发送通知邮件
 */

interface EmailData {
  to: string
  subject: string
  html: string
}

/**
 * 发送邮件（使用 SendGrid API）
 */
async function sendEmail(data: EmailData): Promise<void> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY')
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mcppayway.com'

  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not configured, skipping email')
    return
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: data.to }],
            subject: data.subject,
          },
        ],
        from: { email: fromEmail },
        content: [
          {
            type: 'text/html',
            value: data.html,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SendGrid API error: ${error}`)
    }

    console.log(`Email sent successfully to ${data.to}`)
  } catch (error) {
    console.error('Error sending email:', error)
    // 不抛出错误，避免因邮件发送失败而阻止主流程
  }
}

/**
 * 发送放款成功通知邮件
 */
export async function sendReleaseSuccessEmail(
  toEmail: string,
  orderId: string,
  amount: string,
  receiverAddress: string,
  txHash: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f7fafc;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .info-box {
          background: white;
          border-left: 4px solid #48bb78;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: 600;
          color: #4a5568;
        }
        .value {
          color: #2d3748;
          font-family: monospace;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #718096;
          font-size: 14px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">💰 资金已成功释放</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">您的托管合约已完成放款</p>
      </div>
      
      <div class="content">
        <p>您好，</p>
        <p>您的放款请求已成功处理，资金已从托管合约转至收款方钱包。</p>
        
        <div class="info-box">
          <div class="info-row">
            <span class="label">订单号：</span>
            <span class="value">${orderId}</span>
          </div>
          <div class="info-row">
            <span class="label">金额：</span>
            <span class="value">${amount} USDT</span>
          </div>
          <div class="info-row">
            <span class="label">收款方：</span>
            <span class="value">${receiverAddress.slice(0, 10)}...${receiverAddress.slice(-8)}</span>
          </div>
          <div class="info-row">
            <span class="label">交易状态：</span>
            <span class="value">✅ 已完成</span>
          </div>
        </div>
        
        <center>
          <a href="https://sepolia.etherscan.io/tx/${txHash}" class="button">
            查看区块链交易详情
          </a>
        </center>
        
        <p style="font-size: 14px; color: #718096; margin-top: 20px;">
          交易哈希: <code>${txHash}</code>
        </p>
      </div>
      
      <div class="footer">
        <p>此为系统自动发送的通知邮件，请勿直接回复。</p>
        <p>© ${new Date().getFullYear()} PayWay - 智能托管支付平台</p>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: toEmail,
    subject: `✅ 资金已释放 - 订单 ${orderId}`,
    html,
  })
}

/**
 * 发送放款失败通知邮件
 */
export async function sendReleaseFailureEmail(
  toEmail: string,
  orderId: string,
  errorMessage: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f7fafc;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .error-box {
          background: #fff5f5;
          border-left: 4px solid #f56565;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          color: #718096;
          font-size: 14px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">❌ 放款指令处理失败</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">您的放款请求未能成功处理</p>
      </div>
      
      <div class="content">
        <p>您好，</p>
        <p>很抱歉，您发送的放款指令在处理过程中遇到了问题。</p>
        
        <div class="error-box">
          <p style="margin: 0 0 10px 0;"><strong>订单号：</strong>${orderId}</p>
          <p style="margin: 0;"><strong>失败原因：</strong></p>
          <p style="margin: 10px 0 0 0; color: #c53030;">${errorMessage}</p>
        </div>
        
        <p><strong>处理建议：</strong></p>
        <ul>
          <li>请确认您使用的是预留的邮箱地址发送指令</li>
          <li>检查邮件主题格式是否正确：<code>RELEASE: ${orderId}</code></li>
          <li>确认合约状态为"资金托管中"</li>
          <li>如问题持续，请联系客服支持</li>
        </ul>
        
        <p>您可以重新发送放款指令邮件，我们将再次尝试处理。</p>
      </div>
      
      <div class="footer">
        <p>此为系统自动发送的通知邮件，请勿直接回复。</p>
        <p>© ${new Date().getFullYear()} PayWay - 智能托管支付平台</p>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: toEmail,
    subject: `❌ 放款处理失败 - 订单 ${orderId}`,
    html,
  })
}

