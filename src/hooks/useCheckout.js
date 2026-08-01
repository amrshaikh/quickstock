import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const processCheckout = async (cartItems, saleType, totalAmount, discountAmount, paymentMethod = 'cash') => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Create Sale Record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ sale_type: saleType, total_amount: totalAmount, discount_amount: discountAmount, payment_method: paymentMethod }])
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

  return { processCheckout, loading, error }
}
