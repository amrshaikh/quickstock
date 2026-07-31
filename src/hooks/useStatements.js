import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useStatements() {
  const [salesData, setSalesData] = useState([])
  const [stockData, setStockData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStatements = useCallback(async (startDate, endDate) => {
    setLoading(true)
    setError(null)
    
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString()
    let start = startDate
    if (!start) {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      start = d.toISOString()
    }

    try {
      // 1. Fetch Sales and calculate profit
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id, sale_type, total_amount, discount_amount, created_at,
          sale_items ( quantity, unit_price_used, subtotal, batches ( cost_price, products ( name, product_code, pricing_unit ) ) )
        `)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError

      const processedSales = sales.map(sale => {
        let totalCost = 0
        sale.sale_items.forEach(item => {
          totalCost += (item.batches?.cost_price || 0) * item.quantity
        })
        return {
          ...sale,
          total_cost: totalCost,
          profit: sale.total_amount - totalCost
        }
      })
      setSalesData(processedSales)

      // 2. Fetch current Stock (not historically bounded for simplicity in MVP, but can be joined with adjustments if needed)
      // We will just show current stock and recent adjustments
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, product_code, pricing_unit,
          batches ( quantity_remaining, quantity_received, cost_price, date_added )
        `)
        .order('name')
        
      if (productsError) throw productsError
      
      const processedStock = products.map(p => {
        const totalRemaining = p.batches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0)
        const totalReceived = p.batches.reduce((sum, b) => sum + Number(b.quantity_received), 0)
        return {
          ...p,
          totalRemaining,
          totalReceived,
          activeBatchesCount: p.batches.filter(b => b.quantity_remaining > 0).length
        }
      })
      
      setStockData(processedStock)

    } catch (err) {
      console.error("Error fetching statements:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { salesData, stockData, loading, error, fetchStatements }
}
