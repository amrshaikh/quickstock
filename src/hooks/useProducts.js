import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch products and their batches, filtering out soft-deleted products
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          batches (
            id, quantity_received, quantity_remaining, cost_price, date_added, pricing_unit, retail_price, wholesale_price, is_deleted
          )
        `)
        .neq('is_deleted', true)
        .order('name')

      if (fetchError) throw fetchError

      // Calculate total stock for each product
      const productsWithStock = data.map(product => {
        // filter out soft-deleted batches
        const activeBatches = product.batches ? product.batches.filter(b => b.is_deleted !== true) : []
        const totalStock = activeBatches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0)
        return { ...product, batches: activeBatches, totalStock }
      })

      setProducts(productsWithStock)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError(err.message || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [])

  const addProduct = async (productData) => {
    setLoading(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('products').insert([productData])
      if (insertError) throw insertError
      await fetchProducts()
      return { success: true }
    } catch (err) {
      console.error("Error adding product:", err)
      setError(err.message || 'Failed to add product')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateProduct = async (id, productData) => {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.from('products').update(productData).eq('id', id)
      if (updateError) throw updateError
      await fetchProducts()
      return { success: true }
    } catch (err) {
      console.error("Error updating product:", err)
      setError(err.message || 'Failed to update product')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (id) => {
    setLoading(true)
    setError(null)
    try {
      // Soft delete: update is_deleted to true
      const { data, error: deleteError } = await supabase.from('products').update({ is_deleted: true }).eq('id', id).select()
      if (deleteError) throw deleteError
      if (!data || data.length === 0) throw new Error("Failed to delete: No rows were updated. Are you sure you ran the SQL command?")
      
      await fetchProducts()
      return { success: true }
    } catch (err) {
      console.error("Error deleting product:", err)
      setError(err.message || 'Failed to delete product')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateBatch = async (batchId, batchData) => {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.from('batches').update(batchData).eq('id', batchId)
      if (updateError) throw updateError
      return { success: true }
    } catch (err) {
      console.error("Error updating batch:", err)
      setError(err.message || 'Failed to update batch')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteBatch = async (batchId) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: deleteError } = await supabase.from('batches').update({ is_deleted: true }).eq('id', batchId).select()
      if (deleteError) throw deleteError
      if (!data || data.length === 0) throw new Error("Failed to delete: No rows were updated. Are you sure you ran the SQL command to add is_deleted to batches?")
      await fetchProducts()
      return { success: true }
    } catch (err) {
      console.error("Error deleting batch:", err)
      setError(err.message || 'Failed to delete batch')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct, deleteBatch, updateBatch }
}
