import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const processCheckout = async (cartItems, saleType, totalAmount, discountAmount, paymentMethod = 'cash') => {
    setLoading(true)
    setError(null)
    
    try {
      // 0. Generate Receipt Number
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const dateString = `${yyyy}${mm}${dd}`
      
      const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()
      const endOfDay = new Date(today.setHours(23,59,59,999)).toISOString()
      
      const { count, error: countError } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        
      if (countError) throw countError
      
      const sequence = String(count + 1).padStart(3, '0')
      const receiptNumber = `QD-${dateString}-${sequence}`

      // 1. Create Sale Record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ sale_type: saleType, total_amount: totalAmount, discount_amount: discountAmount, payment_method: paymentMethod, receipt_number: receiptNumber }])
        .select()
        .single()
        
      if (saleError) throw saleError
      const saleId = saleData.id

      const saleItemsToInsert = []
      
      // 2. Process FIFO for each cart item
      for (const item of cartItems) {
        let remainingToDeduct = Number(item.quantity)
        
        // Fetch batches for this product ordered by date_added ASC
        const { data: batches, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('product_id', item.product_id)
          .gt('quantity_remaining', 0)
          .order('date_added', { ascending: true })
          
        if (batchError) throw batchError
        
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          
          const availableInBatch = Number(batch.quantity_remaining)
          const qtyToDeduct = Math.min(availableInBatch, remainingToDeduct)
          
          // Add to sale_items
          saleItemsToInsert.push({
            sale_id: saleId,
            product_id: item.product_id,
            batch_id: batch.id,
            quantity: qtyToDeduct,
            unit_price_used: item.unit_price,
            subtotal: qtyToDeduct * item.unit_price
          })
          
          // Update batch quantity
          const { error: updateError } = await supabase
            .from('batches')
            .update({ quantity_remaining: availableInBatch - qtyToDeduct })
            .eq('id', batch.id)
            
          if (updateError) throw updateError
          
          remainingToDeduct -= qtyToDeduct
        }
        
        if (remainingToDeduct > 0) {
          console.warn(`Not enough stock for product ${item.name}. Missing ${remainingToDeduct}`)
          // In a perfect system, we'd rollback. For this MVP, we proceed with what we have.
        }
      }
      
      // 3. Insert all sale items
      if (saleItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsToInsert)
          
        if (itemsError) throw itemsError
      }
      
      return { success: true, saleId }
    } catch (err) {
      console.error("Checkout failed:", err)
      setError(err.message || "Failed to process checkout")
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateSale = async (saleId, cartItems, saleType, totalAmount, discountAmount, paymentMethod = 'cash') => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Revert Old Sale Items
      const { data: oldItems, error: oldItemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
        
      if (oldItemsError) throw oldItemsError

      const batchRestorations = {}
      oldItems.forEach(item => {
        batchRestorations[item.batch_id] = (batchRestorations[item.batch_id] || 0) + Number(item.quantity)
      })

      for (const [batchId, quantityToRestore] of Object.entries(batchRestorations)) {
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

      // 2. Delete Old Sale Items
      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId)
        
      if (deleteItemsError) throw deleteItemsError

      // 3. Process FIFO for new cart items
      const saleItemsToInsert = []
      for (const item of cartItems) {
        let remainingToDeduct = Number(item.quantity)
        
        const { data: batches, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('product_id', item.product_id)
          .gt('quantity_remaining', 0)
          .order('date_added', { ascending: true })
          
        if (batchError) throw batchError
        
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          
          const availableInBatch = Number(batch.quantity_remaining)
          const qtyToDeduct = Math.min(availableInBatch, remainingToDeduct)
          
          saleItemsToInsert.push({
            sale_id: saleId,
            product_id: item.product_id,
            batch_id: batch.id,
            quantity: qtyToDeduct,
            unit_price_used: item.unit_price,
            subtotal: qtyToDeduct * item.unit_price
          })
          
          const { error: updateError } = await supabase
            .from('batches')
            .update({ quantity_remaining: availableInBatch - qtyToDeduct })
            .eq('id', batch.id)
            
          if (updateError) throw updateError
          
          remainingToDeduct -= qtyToDeduct
        }
      }
      
      // 4. Insert New Sale Items
      if (saleItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsToInsert)
          
        if (itemsError) throw itemsError
      } else {
        throw new Error("Cannot update a sale to have 0 items.")
      }

      // 5. Update Sale Record Totals
      const { error: saleUpdateError } = await supabase
        .from('sales')
        .update({ sale_type: saleType, total_amount: totalAmount, discount_amount: discountAmount, payment_method: paymentMethod })
        .eq('id', saleId)
        
      if (saleUpdateError) throw saleUpdateError
      
      return { success: true, saleId }
    } catch (err) {
      console.error("Sale update failed:", err)
      setError(err.message || "Failed to update sale")
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { processCheckout, updateSale, loading, error }
}
