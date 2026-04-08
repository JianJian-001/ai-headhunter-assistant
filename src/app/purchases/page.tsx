'use client'

import { useState, useEffect } from 'react'
import type { Purchase } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPurchases()
  }, [])

  async function fetchPurchases() {
    try {
      const res = await fetch('/api/purchases')
      const data = await res.json()
      setPurchases(Array.isArray(data) ? data : [])
    } catch {
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#8E86AF] hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={16} /> 返回技能商城
        </Link>
        <h1 className="text-[42px] font-bold text-[#27214D] leading-tight">购买记录</h1>
        <p className="text-[15px] text-[#8E86AF] mt-1">查看你的技能购买和订阅记录</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#EAE5FF] animate-pulse h-16" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8E86AF] text-[15px] mb-4">暂无购买记录</p>
            <Link
              href="/marketplace"
              className="inline-flex h-10 px-5 rounded-2xl bg-primary text-white text-[14px] font-medium items-center hover:bg-[#5B4EE6] transition-colors"
            >
              前往技能商城
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAE5FF] overflow-hidden">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-[#EAE5FF] text-left text-[#8E86AF]">
                  <th className="px-5 py-4 font-medium">技能名称</th>
                  <th className="px-5 py-4 font-medium">价格</th>
                  <th className="px-5 py-4 font-medium">订阅时长</th>
                  <th className="px-5 py-4 font-medium">支付渠道</th>
                  <th className="px-5 py-4 font-medium">状态</th>
                  <th className="px-5 py-4 font-medium">到期时间</th>
                  <th className="px-5 py-4 font-medium">购买时间</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-[#F3F0FF] last:border-0">
                    <td className="px-5 py-4 font-medium text-[#27214D]">{p.skill_name}</td>
                    <td className="px-5 py-4 text-[#4A4365]">¥{p.price}</td>
                    <td className="px-5 py-4 text-[#4A4365]">{p.subscription_days}天</td>
                    <td className="px-5 py-4 text-[#4A4365]">{p.payment_channel}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${
                          p.status === 'active'
                            ? 'bg-[#E8FFF3] text-[#10B981]'
                            : p.status === 'expired'
                              ? 'bg-[#F3F0FF] text-[#8E86AF]'
                              : 'bg-[#FFF5E6] text-[#F59E0B]'
                        }`}
                      >
                        {p.status === 'active' ? '生效中' : p.status === 'expired' ? '已过期' : '已退款'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#8E86AF]">
                      {new Date(p.expires_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-5 py-4 text-[#8E86AF]">
                      {new Date(p.created_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
