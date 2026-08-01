import { useEffect } from 'react'
import { DollarSign, TrendingUp, ShoppingBag, AlertTriangle, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboard } from '../hooks/useDashboard'

export default function Dashboard() {
  const { metrics, salesData, freshnessAlerts, loading, fetchDashboardData } = useDashboard()

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const margin = metrics.todayRevenue > 0 ? ((metrics.todayProfit / metrics.todayRevenue) * 100).toFixed(1) : 0

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col justify-between">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
            <DollarSign size={20} className="text-amber-700"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">₹{metrics.todayRevenue.toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1 font-medium">Today's Revenue</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col justify-between">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={20} className="text-emerald-700"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">₹{metrics.todayProfit.toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1 font-medium">Today's Profit</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle size={20} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{metrics.todaySalesCount}</p>
            <p className="text-xs text-stone-400 mt-1 font-medium">Total Orders</p>
          </div>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-stone-700">Today's Profit Margin</span>
          <span className="text-sm font-bold text-emerald-700">{margin}%</span>
        </div>
        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, margin)}%` }}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-stone-700">Revenue (Last 7 Active Days)</h3>
        </div>
        {loading ? (
          <div className="h-[250px] flex items-center justify-center text-stone-400 text-sm">Loading chart...</div>
        ) : (
          <div className="h-[250px] mt-2 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" stroke="#78716c" tick={{fill: '#78716c', fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis stroke="#78716c" tick={{fill: '#78716c', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={45} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: '12px', color: '#78350f', fontSize: '12px' }} 
                  itemStyle={{ color: '#d97706', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Freshness Alerts */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-700">Freshness Alerts</h3>
        </div>
        <div className="p-4 space-y-3">
          {loading && <p className="text-stone-400 text-sm">Checking batches...</p>}
          
          {!loading && freshnessAlerts.critical.map(batch => (
            <div key={batch.id} className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-semibold text-red-800 text-sm">{batch.products.name} ({batch.products.product_code})</h4>
                <p className="text-red-600 text-xs mt-1">Exceeded shelf life! {batch.percentUsed.toFixed(0)}% time elapsed. {Number(batch.quantity_remaining).toFixed(2)} {batch.products.pricing_unit} left.</p>
              </div>
            </div>
          ))}

          {!loading && freshnessAlerts.warning.map(batch => (
            <div key={batch.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-semibold text-amber-800 text-sm">{batch.products.name} ({batch.products.product_code})</h4>
                <p className="text-amber-700 text-xs mt-1">Sell soon. {batch.percentUsed.toFixed(0)}% shelf life elapsed. {Number(batch.quantity_remaining).toFixed(2)} {batch.products.pricing_unit} left.</p>
              </div>
            </div>
          ))}

          {!loading && freshnessAlerts.critical.length === 0 && freshnessAlerts.warning.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-green-600 py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl font-bold">✓</span>
              </div>
              <p className="font-medium text-sm">All stock is fresh!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
