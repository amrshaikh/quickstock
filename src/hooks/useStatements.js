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
          id, receipt_number, sale_type, payment_method, total_amount, discount_amount, created_at,
          sale_items ( product_id, quantity, unit_price_used, subtotal, batches ( cost_price, products ( name, product_code, pricing_unit ) ) )
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

  const deleteSale = async (saleId) => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Fetch all items for this sale
      const { data: saleItems, error: fetchError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
        
      if (fetchError) throw fetchError

      // 2. Restore quantities to batches
      // Group by batch_id in case there are duplicates
      const batchRestorations = {}
      saleItems.forEach(item => {
        batchRestorations[item.batch_id] = (batchRestorations[item.batch_id] || 0) + Number(item.quantity)
      })

      for (const [batchId, quantityToRestore] of Object.entries(batchRestorations)) {
        // Fetch current quantity to ensure we increment correctly (avoids race conditions as best as we can without RPC)
        const { data: batch, error: batchError } = await supabase
          .from('batches')
          .select('quantity_remaining')
          .eq('id', batchId)
          .single()
          
        if (batchError) throw batchError
        
        const { error: updateError } = await supabase
          .from('batches')
          .update({ quantity_remaining: Number(batch.quantity_remaining) + quantityToRestore })
          .eq('id', batchId)
          
        if (updateError) throw updateError
      }

      // 3. Delete sale_items (might be cascading, but safe to explicitly delete)
      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId)
        
      if (deleteItemsError) throw deleteItemsError

      // 4. Delete the sale
      const { error: deleteSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId)
        
      if (deleteSaleError) throw deleteSaleError
      
      // Refresh the data
      fetchStatements()
      return { success: true }
      
    } catch (err) {
      console.error("Error deleting sale:", err)
      setError(err.message || "Failed to delete sale")
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { salesData, stockData, loading, error, fetchStatements, deleteSale }
}
