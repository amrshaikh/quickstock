import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useDashboard() {
  const [metrics, setMetrics] = useState({ todaySalesCount: 0, todayRevenue: 0, todayProfit: 0 })
  const [salesData, setSalesData] = useState([]) // For chart
  const [freshnessAlerts, setFreshnessAlerts] = useState({ warning: [], critical: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch Sales for the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id, total_amount, created_at,
          sale_items ( quantity, unit_price_used, subtotal, batches ( cost_price ) )
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (salesError) throw salesError

      let todayCount = 0
      let todayRev = 0
      let todayProf = 0
      
      const chartDataMap = {}
      
      const todayString = new Date().toISOString().split('T')[0]

      sales.forEach(sale => {
        const dateStr = sale.created_at.split('T')[0]
        
        let saleCost = 0
        sale.sale_items.forEach(item => {
          saleCost += (item.batches?.cost_price || 0) * item.quantity // Approximate cost
        })
        const saleProfit = sale.total_amount - saleCost

        if (dateStr === todayString) {
          todayCount++
          todayRev += sale.total_amount
          todayProf += saleProfit
        }

        if (!chartDataMap[dateStr]) {
          chartDataMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 }
        }
        chartDataMap[dateStr].revenue += sale.total_amount
        chartDataMap[dateStr].profit += saleProfit
      })

      setMetrics({ todaySalesCount: todayCount, todayRevenue: todayRev, todayProfit: todayProf })
      setSalesData(Object.values(chartDataMap).slice(-7)) // Last 7 active days for chart

      // 2. Fetch Batches for Freshness Alerts
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select(`
          id, quantity_remaining, date_added,
          products ( name, shelf_life_days, product_code, pricing_unit )
        `)
        .gt('quantity_remaining', 0)
        
      if (batchesError) throw batchesError

      const now = new Date()
      const warning = []
      const critical = []

      batches.forEach(batch => {
        if (!batch.products) return;
        const added = new Date(batch.date_added)
        const daysOld = Math.floor((now - added) / (1000 * 60 * 60 * 24))
        const shelfLife = batch.products.shelf_life_days
        
        const percentUsed = (daysOld / shelfLife) * 100
        
        if (percentUsed >= 100) {
          critical.push({ ...batch, daysOld, percentUsed })
        } else if (percentUsed >= 75) {
          warning.push({ ...batch, daysOld, percentUsed })
        }
      })

      setFreshnessAlerts({ warning, critical })

    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { metrics, salesData, freshnessAlerts, loading, error, fetchDashboardData }
}
