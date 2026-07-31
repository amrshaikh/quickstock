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
      // Fetch products and their batches
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          batches (
            id, quantity_remaining, cost_price, date_added
          )
        `)
        .order('name')

      if (fetchError) throw fetchError

      // Calculate total stock for each product
      const productsWithStock = data.map(product => {
        const totalStock = product.batches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0)
        return { ...product, totalStock }
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
      const { error: deleteError } = await supabase.from('products').delete().eq('id', id)
      if (deleteError) throw deleteError
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

  return { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct }
}
