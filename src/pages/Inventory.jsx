import { useEffect, useState, useMemo } from 'react'
import { Plus, PackagePlus, Search, Package, Edit2, Trash2 } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabaseClient'

export default function Inventory() {
  const { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct, deleteBatch, updateBatch } = useProducts()
  const [isProductModalOpen, setProductModalOpen] = useState(false)
  const [isBatchModalOpen, setBatchModalOpen] = useState(false)
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [editingBatch, setEditingBatch] = useState(null)

  const [batchCostPrice, setBatchCostPrice] = useState('')
  const [batchRetailPrice, setBatchRetailPrice] = useState('')
  const [batchWholesalePrice, setBatchWholesalePrice] = useState('')
  const [batchRetailMargin, setBatchRetailMargin] = useState('')
  const [batchWholesaleMargin, setBatchWholesaleMargin] = useState('')

  const handleCostChange = (val) => {
    setBatchCostPrice(val)
    const cost = Number(val)
    if (!isNaN(cost) && cost > 0) {
      if (batchRetailPrice) {
        const rp = Number(batchRetailPrice)
        if (!isNaN(rp)) setBatchRetailMargin((((rp - cost) / cost) * 100).toFixed(2).replace(/\.00$/, ''))
      }
      if (batchWholesalePrice) {
        const wp = Number(batchWholesalePrice)
        if (!isNaN(wp)) setBatchWholesaleMargin((((wp - cost) / cost) * 100).toFixed(2).replace(/\.00$/, ''))
      }
    }
  }

  const handlePriceChange = (val, type) => {
    if (type === 'retail') setBatchRetailPrice(val)
    else setBatchWholesalePrice(val)
    
    if (!batchCostPrice) return
    const cost = Number(batchCostPrice)
    const price = Number(val)
    if (!isNaN(cost) && !isNaN(price) && cost > 0 && val !== '') {
      const margin = (((price - cost) / cost) * 100).toFixed(2).replace(/\.00$/, '')
      if (type === 'retail') setBatchRetailMargin(margin)
      else setBatchWholesaleMargin(margin)
    } else {
      if (type === 'retail') setBatchRetailMargin('')
      else setBatchWholesaleMargin('')
    }
  }

  const handleMarginChange = (val, type) => {
    if (type === 'retail') setBatchRetailMargin(val)
    else setBatchWholesaleMargin(val)

    if (!batchCostPrice) return
    const cost = Number(batchCostPrice)
    const margin = Number(val)
    if (!isNaN(cost) && !isNaN(margin) && val !== '') {
      const price = (cost + (cost * margin / 100)).toFixed(2)
      if (type === 'retail') setBatchRetailPrice(price)
      else setBatchWholesalePrice(price)
    }
  }

  const openBatchModal = (prod) => {
    setEditingBatch(null)
    setSelectedProduct(prod)
    setBatchCostPrice('')
    setBatchRetailPrice('')
    setBatchWholesalePrice('')
    setBatchRetailMargin('')
    setBatchWholesaleMargin('')
    setBatchModalOpen(true)
  }

  const openEditBatchModal = (batch) => {
    setEditingBatch(batch)
    setBatchCostPrice(batch.cost_price || '')
    setBatchRetailPrice(batch.retail_price || '')
    setBatchWholesalePrice(batch.wholesale_price || '')
    
    if (batch.cost_price && batch.retail_price) {
       setBatchRetailMargin((((batch.retail_price - batch.cost_price) / batch.cost_price) * 100).toFixed(2).replace(/\.00$/, ''))
    } else {
       setBatchRetailMargin('')
    }
    
    if (batch.cost_price && batch.wholesale_price) {
       setBatchWholesaleMargin((((batch.wholesale_price - batch.cost_price) / batch.cost_price) * 100).toFixed(2).replace(/\.00$/, ''))
    } else {
       setBatchWholesaleMargin('')
    }
    
    setBatchModalOpen(true)
  }

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleAddProduct = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      name: fd.get('name'),
      product_code: fd.get('product_code') || null,
      is_wholesale_eligible: fd.get('is_wholesale_eligible') === 'on',
      shelf_life_days: 365,
      retail_price: 0,
      wholesale_price: 0,
      pricing_unit: 'per_kg'
    }
    await addProduct(data)
    setProductModalOpen(false)
  }

  const handleUpdateProduct = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      name: fd.get('name'),
      product_code: fd.get('product_code') || null,
      is_wholesale_eligible: fd.get('is_wholesale_eligible') === 'on',
      shelf_life_days: 365
    }
    const result = await updateProduct(selectedProduct.id, data)
    if (result.success) {
      const updatedProduct = { ...selectedProduct, ...data }
      setSelectedProduct(updatedProduct)
      setIsEditMode(false)
    } else {
      alert("Error updating product: " + result.error)
    }
  }

  const handleAddBatch = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const quantity = Number(fd.get('quantity'))
    const shelfLife = Number(fd.get('shelf_life_days')) || 365
    
    if (shelfLife !== selectedProduct.shelf_life_days) {
      await updateProduct(selectedProduct.id, { shelf_life_days: shelfLife })
    }
    
    if (editingBatch) {
      const data = {
        quantity_received: quantity,
        cost_price: Number(fd.get('cost_price')),
        pricing_unit: fd.get('pricing_unit'),
        retail_price: Number(fd.get('retail_price')),
        wholesale_price: Number(fd.get('wholesale_price')) || null,
        date_added: fd.get('date_added') ? new Date(fd.get('date_added')).toISOString() : new Date().toISOString()
      }
      
      const quantityDiff = quantity - editingBatch.quantity_received
      data.quantity_remaining = editingBatch.quantity_remaining + quantityDiff
      
      const res = await updateBatch(editingBatch.id, data)
      if (res.success) {
        setSelectedProduct(prev => ({
          ...prev,
          batches: prev.batches.map(b => b.id === editingBatch.id ? { ...b, ...data } : b)
        }))
      } else {
        alert("Error updating batch: " + res.error)
      }
    } else {
      const data = {
        product_id: selectedProduct.id,
        quantity_received: quantity,
        quantity_remaining: quantity,
        cost_price: Number(fd.get('cost_price')),
        pricing_unit: fd.get('pricing_unit'),
        retail_price: Number(fd.get('retail_price')),
        wholesale_price: Number(fd.get('wholesale_price')) || null,
        date_added: fd.get('date_added') ? new Date(fd.get('date_added')).toISOString() : new Date().toISOString()
      }
      
      const { error } = await supabase.from('batches').insert([data])
      if (error) {
        alert("Error adding batch: " + error.message)
        return
      }
    }
    await fetchProducts()
    setBatchModalOpen(false)
  }

  const filteredProducts = useMemo(() => {
    if (!searchQ) return products
    const term = searchQ.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.product_code?.toLowerCase().includes(term)
    )
  }, [searchQ, products])

  const stockBadge = (stock) => {
    if (stock === 0) return "bg-red-100 text-red-700 border border-red-200"
    if (stock <= 20) return "bg-orange-100 text-orange-700 border border-orange-200"
    return "bg-emerald-100 text-emerald-700 border border-emerald-200"
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-8">
      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
          />
        </div>
        <button
          onClick={() => setProductModalOpen(true)}
          className="bg-amber-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">{error}</div>}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 text-center">
          <p className="text-xl font-bold text-amber-700">{products.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Total SKUs</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 text-center">
          <p className="text-xl font-bold text-orange-600">{products.filter(p => p.totalStock > 0 && p.totalStock <= 20).length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Low Stock</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 text-center">
          <p className="text-xl font-bold text-red-600">{products.filter(p => p.totalStock === 0).length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Out of Stock</p>
        </div>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="py-8 text-center text-stone-400 text-sm col-span-full">Loading products...</div>
        ) : filteredProducts.map(prod => (
          <div key={prod.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col">
            <div 
              className="p-5 flex-1 cursor-pointer hover:bg-stone-50 transition-colors"
              onClick={() => {
                setSelectedProduct(prod)
                setIsEditMode(false)
                setDetailsModalOpen(true)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-stone-800 text-sm">{prod.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-stone-400 font-mono">{prod.product_code || 'No Code'}</span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${stockBadge(prod.totalStock)}`}>
                  {Number(prod.totalStock).toFixed(3)} {((prod.batches.find(b => b.quantity_remaining > 0) || prod.batches[0])?.pricing_unit || prod.pricing_unit) === 'per_kg' ? 'kg' : 'pcs'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-50">
                <div>
                  <p className="text-xs text-stone-400">Retail</p>
                  <p className="text-sm font-bold text-amber-700">₹{(prod.batches.find(b => b.quantity_remaining > 0) || prod.batches[0])?.retail_price || prod.retail_price || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Wholesale</p>
                  <p className="text-sm font-semibold text-stone-600">{(prod.batches.find(b => b.quantity_remaining > 0) || prod.batches[0])?.wholesale_price || prod.wholesale_price ? `₹${(prod.batches.find(b => b.quantity_remaining > 0) || prod.batches[0])?.wholesale_price || prod.wholesale_price}` : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Quick Add Stock / Add Batch */}
            <div className="bg-stone-50 border-t border-stone-100 px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-500 flex-1">Register new stock batch:</span>
              <button
                onClick={() => openBatchModal(prod)}
                className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1"
              >
                <PackagePlus size={14} /> Add Batch
              </button>
            </div>
          </div>
        ))}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package size={36} className="mx-auto text-stone-200 mb-2" />
            <p className="text-stone-400 text-sm">No items match your search</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isProductModalOpen} onClose={() => setProductModalOpen(false)} title="Add New Product">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Product Code (Optional)</label>
              <input name="product_code" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="e.g. AJWA-01" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Name</label>
              <input name="name" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="e.g. Ajwa Dates" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 cursor-pointer">
                <input type="checkbox" name="is_wholesale_eligible" className="rounded text-amber-600 focus:ring-amber-400" />
                Available for Wholesale?
              </label>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:from-amber-700 hover:to-amber-600 transition-all">Save Product</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Product Details">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
              <div>
                <h3 className="font-bold text-stone-800 text-lg">{selectedProduct.name}</h3>
                <p className="text-xs text-stone-500 font-mono">{selectedProduct.product_code}</p>
              </div>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <Edit2 size={12} /> {isEditMode ? 'Cancel Edit' : 'Edit Details'}
              </button>
            </div>

            {isEditMode ? (
              <form onSubmit={handleUpdateProduct} className="space-y-4 bg-white p-4 rounded-xl border border-stone-100">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">Name</label>
                    <input name="name" defaultValue={selectedProduct.name} required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Product Code</label>
                      <input name="product_code" defaultValue={selectedProduct.product_code || ''} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 cursor-pointer mt-7">
                        <input type="checkbox" name="is_wholesale_eligible" defaultChecked={selectedProduct.is_wholesale_eligible} className="rounded text-amber-600 focus:ring-amber-400" />
                        Wholesale?
                      </label>
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-amber-700 transition-all">Save Changes</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                    <h4 className="text-xs font-bold text-stone-600">Stock Batches History</h4>
                  </div>
                  <div className="overflow-x-auto max-h-[40vh] no-scrollbar">
                    <table className="w-full text-left text-xs relative">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-stone-100 text-stone-400">
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium text-right">Rcvd</th>
                          <th className="px-4 py-2 font-medium text-right">Rem</th>
                          <th className="px-4 py-2 font-medium text-right">Retail ₹</th>
                          <th className="px-4 py-2 font-medium text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                          selectedProduct.batches.map(batch => (
                            <tr key={batch.id} className="hover:bg-stone-50 transition-colors">
                              <td className="px-4 py-3 text-stone-600">{new Date(batch.date_added).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right font-medium text-stone-700">{Number(batch.quantity_received).toFixed(3)}</td>
                              <td className="px-4 py-3 text-right font-bold text-amber-700">{Number(batch.quantity_remaining).toFixed(3)}</td>
                              <td className="px-4 py-3 text-right text-emerald-600">₹{batch.retail_price}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    onClick={() => openEditBatchModal(batch)}
                                    className="text-stone-300 hover:text-amber-500 transition-colors"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if(window.confirm('Are you sure you want to delete this batch?')) {
                                      const res = await deleteBatch(batch.id)
                                      if(!res.success) alert(res.error)
                                      else {
                                        // Update selected product state to trigger re-render of modal
                                        setSelectedProduct(prev => ({
                                          ...prev,
                                          batches: prev.batches.filter(b => b.id !== batch.id)
                                        }))
                                      }
                                    }
                                  }}
                                  className="text-stone-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-4 py-6 text-center text-stone-400">No batch history found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-stone-50 border-t border-stone-100">
                     <button
                        onClick={async () => {
                           if(window.confirm('Are you sure you want to delete this product?')) {
                              const res = await deleteProduct(selectedProduct.id)
                              if (res.success) {
                                setDetailsModalOpen(false)
                              } else {
                                alert("Failed to delete product: " + (res.error || "Please ensure you ran the SQL script to add the is_deleted column."))
                              }
                           }
                        }}
                        className="w-full text-center text-xs font-bold text-red-600 hover:text-red-700 py-1"
                     >
                        Delete Product
                     </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={isBatchModalOpen} onClose={() => setBatchModalOpen(false)} title={editingBatch ? 'Edit Batch' : `Add Batch: ${selectedProduct?.name}`}>
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Quantity Received</label>
              <input name="quantity" type="number" step="0.01" defaultValue={editingBatch?.quantity_received || ''} required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Pricing Unit</label>
              <select name="pricing_unit" defaultValue={editingBatch?.pricing_unit || 'per_kg'} required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none">
                <option value="per_kg">Per kg</option>
                <option value="per_piece">Per piece</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Cost Price (₹)</label>
            <input name="cost_price" type="number" step="0.01" value={batchCostPrice} onChange={e => handleCostChange(e.target.value)} required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Wholesale Price (₹)</label>
              <div className="flex gap-2">
                <input name="wholesale_price" type="number" step="0.01" value={batchWholesalePrice} onChange={e => handlePriceChange(e.target.value, 'wholesale')} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 w-24">
                  <input type="number" placeholder="Margin" value={batchWholesaleMargin} onChange={e => handleMarginChange(e.target.value, 'wholesale')} className="w-full bg-transparent text-sm focus:outline-none text-right" />
                  <span className="text-stone-400 text-xs font-bold">%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Retail Price (₹)</label>
              <div className="flex gap-2">
                <input name="retail_price" type="number" step="0.01" value={batchRetailPrice} onChange={e => handlePriceChange(e.target.value, 'retail')} required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 w-24">
                  <input type="number" placeholder="Margin" value={batchRetailMargin} onChange={e => handleMarginChange(e.target.value, 'retail')} className="w-full bg-transparent text-sm focus:outline-none text-right" />
                  <span className="text-stone-400 text-xs font-bold">%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Date Received</label>
            <input name="date_added" type="datetime-local" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" defaultValue={editingBatch ? new Date(editingBatch.date_added).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Shelf Life (Days)</label>
            <input name="shelf_life_days" type="number" placeholder="365" defaultValue={selectedProduct?.shelf_life_days || 365} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:from-emerald-700 hover:to-emerald-600 transition-all">{editingBatch ? 'Update Batch' : 'Add Batch'}</button>
          </div>
        </form>
      </Modal>


    </div>
  )
}
