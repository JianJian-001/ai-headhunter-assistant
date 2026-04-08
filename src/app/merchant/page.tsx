'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckSquare, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface MerchantInfo {
  is_merchant: boolean
  merchant_channel: string | null
}

export default function MerchantPage() {
  const [info, setInfo] = useState<MerchantInfo | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<'alipay' | 'wechat'>('alipay')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMerchant()
  }, [])

  async function fetchMerchant() {
    try {
      const res = await fetch('/api/merchant')
      const data = await res.json()
      setInfo(data)
    } catch {
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup() {
    if (!agreed) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/merchant/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel }),
      })
      if (res.ok) {
        fetchMerchant()
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-8 pt-8">
        <div className="bg-white rounded-3xl border border-[#EAE5FF] animate-pulse h-[500px]" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-8 pt-6 pb-0">
        <Link
          href="/my-skills/added"
          className="inline-flex items-center gap-2 text-[18px] font-bold text-[#1F173A] mb-4 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          商户管理
        </Link>
        <h1 className="text-[32px] font-bold text-[#20194A] leading-tight mb-6">商户管理</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {info?.is_merchant ? (
          /* Already a merchant */
          <div className="bg-white rounded-[20px] border border-[#EAE5FF] p-7 max-w-3xl">
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-16 h-16 rounded-2xl bg-[#E8FFF3] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#10B981]" />
              </div>
              <div className="text-center">
                <h2 className="text-[22px] font-bold text-[#20194A]">商户已开通</h2>
                <p className="text-[14px] text-[#8B84A7] mt-1">
                  收款渠道：{info.merchant_channel === 'wechat' ? '微信支付' : '支付宝'}
                </p>
              </div>
              <div className="bg-[#F6F3FF] rounded-2xl p-5 text-[14px] text-[#4A4365] leading-relaxed w-full max-w-xl text-center">
                <p>你可以在「我创建的技能」页面将技能上架到商城销售。</p>
                <p className="mt-1">
                  买家购买后，收入将通过{info.merchant_channel === 'wechat' ? '微信支付' : '支付宝'}结算到你的账户。
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Not yet a merchant */
          <div className="bg-white rounded-[20px] border border-[#EAE5FF] p-[28px_24px] max-w-3xl">
            <div className="flex flex-col gap-[18px]">
              {/* Empty spacer */}
              <div className="h-5" />

              {/* Title */}
              <div className="flex flex-col gap-2">
                <h2 className="text-[28px] font-bold text-[#20194A]">收款服务渠道</h2>
                <p className="text-[15px] text-[#8B84A7]">目前支持以下渠道申请开通</p>
              </div>

              {/* Payment channel cards */}
              <div className="flex flex-col gap-4 max-w-[560px]">
                {/* 支付宝 */}
                <button
                  onClick={() => setSelectedChannel('alipay')}
                  className={`flex items-center gap-4 p-[16px_18px] rounded-[18px] border text-left transition-colors ${
                    selectedChannel === 'alipay'
                      ? 'border-[#168BFF] bg-[#F0F8FF]'
                      : 'border-[#EAE5FF] bg-white hover:bg-[#FAFBFF]'
                  }`}
                >
                  <div className="w-[52px] h-[52px] rounded-[14px] bg-[#168BFF] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[28px] font-bold leading-none">支</span>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="text-[24px] font-bold text-[#1F173A] leading-tight">支付宝</span>
                    <span className="text-[14px] text-[#6F688E] leading-[1.7]">
                      提交开户申请后，由支付宝进行开户审核，商户完成签约后开户完成，一般 1-3 个工作日内完成开户。
                    </span>
                  </div>
                </button>

                {/* 微信支付 */}
                <button
                  onClick={() => setSelectedChannel('wechat')}
                  className={`flex items-center gap-4 p-[16px_18px] rounded-[18px] border text-left transition-colors ${
                    selectedChannel === 'wechat'
                      ? 'border-[#07C160] bg-[#F0FFF6]'
                      : 'border-[#EAE5FF] bg-white hover:bg-[#FAFBFF]'
                  }`}
                >
                  <div className="w-[52px] h-[52px] rounded-[14px] bg-[#07C160] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[28px] font-bold leading-none">微</span>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="text-[24px] font-bold text-[#1F173A] leading-tight">微信支付</span>
                    <span className="text-[14px] text-[#6F688E] leading-[1.7]">
                      提交开户申请后，由微信支付进行开户审核，审核通过后即可完成开通，一般 1-3 个工作日内完成。
                    </span>
                  </div>
                </button>
              </div>

              {/* Agreement + button */}
              <div className="flex flex-col gap-[14px] pt-2 max-w-[560px]">
                <p className="text-[14px] text-[#6F688E]">
                  开通商户前你需要确认以下协议内容，请仔细阅读后勾选并继续
                </p>
                <button
                  onClick={() => setAgreed(!agreed)}
                  className="flex items-center gap-[10px] hover:opacity-80 transition-opacity w-fit"
                >
                  <CheckSquare
                    size={18}
                    className={agreed ? 'text-[#6E61FF]' : 'text-[#1F173A]'}
                    fill={agreed ? '#6E61FF' : 'none'}
                    strokeWidth={2}
                  />
                  <span className="text-[15px] font-semibold text-[#1F173A]">
                    创作者技能服务协议
                  </span>
                </button>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleSetup}
                    disabled={!agreed || submitting}
                    className="w-[220px] h-[52px] rounded-2xl bg-[#1F173A] text-white text-[16px] font-bold hover:bg-[#2F2853] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? '开通中...' : '同意协议并继续开通'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
