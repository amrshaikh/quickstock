import { useEffect, useState, useMemo } from 'react'
import { Plus, PackagePlus, Search, Package } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabaseClient'

export default function Inventory() {
  const { products, loading, error, fetchProducts, addProduct } = useProducts()
  const [isProductModalOpen, setProductModalOpen] = useState(false)
  const [isBatchModalOpen, setBatchModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleAddProduct = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      name: fd.get('name'),
      variety: fd.get('variety'),
      product_code: fd.get('product_code'),
      pricing_unit: fd.get('pricing_unit'),
      retail_price: Number(fd.get('retail_price')),
      wholesale_price: Number(fd.get('wholesale_price')) || null,
      is_wholesale_eligible: fd.get('is_wholesale_eligible') === 'on',
      shelf_life_days: Number(fd.get('shelf_life_days'))
    }
    await addProduct(data)
    setProductModalOpen(false)
  }

  const handleAddBatch = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const quantity = Number(fd.get('quantity'))
    const data = {
      product_id: selectedProduct.id,
      quantity_received: quantity,
      quantity_remaining: quantity,
      cost_price: Number(fd.get('cost_price')),
      date_added: fd.get('date_added') ? new Date(fd.get('date_added')).toISOString() : new Date().toISOString()
    }
    await supabase.from('batches').insert([data])
    await fetchProducts()
    setBatchModalOpen(false)
  }

  const filteredProducts = useMemo(() => {
    if (!searchQ) return products
    const term = searchQ.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.product_code?.toLowerCase().includes(term) ||
      (p.variety && p.variety.toLowerCase().includes(term))
    )
  }, [searchQ, products])

  const stockBadge = (stock) => {
    if (stock === 0) return "bg-red-100 text-red-700 border border-red-200"
    if (stock <= 20) return "bg-orange-100 text-orange-700 border border-orange-200"
    return "bg-emerald-100 text-emerald-700 border border-emerald-200"
  }

  return (
    <div className="p-4 space-y-4 pb-8">
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
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-stone-100 text-center">
          <p className="text-xl font-bold text-amber-700">{products.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Total SKUs</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-stone-100 text-center">
          <p className="text-xl font-bold text-orange-600">{products.filter(p => p.totalStock > 0 && p.totalStock <= 20).length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Low Stock</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-stone-100 text-center">
          <p className="text-xl font-bold text-red-600">{products.filter(p => p.totalStock === 0).length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Out of Stock</p>
        </div>
      </div>

      {/* Product Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-stone-400 text-sm">Loading products...</div>
        ) : filteredProducts.map(prod => (
          <div key={prod.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-stone-800 text-sm">{prod.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-stone-400 font-mono">{prod.product_code}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                      {prod.variety || "General"}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${stockBadge(prod.totalStock)}`}>
                  {Number(prod.totalStock).toFixed(2)} {prod.pricing_unit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-50">
                <div>
                  <p className="text-xs text-stone-400">Retail</p>
                  <p className="text-sm font-bold text-amber-700">₹{prod.retail_price}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Wholesale</p>
                  <p className="text-sm font-semibold text-stone-600">{prod.wholesale_price ? `₹${prod.wholesale_price}` : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Quick Add Stock / Add Batch */}
            <div className="bg-stone-50 border-t border-stone-100 px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-500 flex-1">Register new stock batch:</span>
              <button
                onClick={() => {
                  setSelectedProduct(prod)
                  setBatchModalOpen(true)
                }}
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
              <label className="block text-xs font-semibold text-stone-600 mb-1">Product Code</label>
              <input name="product_code" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="e.g. AJWA-01" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Name</label>
              <input name="name" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="e.g. Ajwa Dates" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Variety (Category)</label>
              <input name="variety" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="e.g. Premium Large" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Pricing Unit</label>
                <select name="pricing_unit" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none">
                  <option value="per_kg">Per kg</option>
                  <option value="per_piece">Per piece</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Shelf Life (Days)</label>
                <input name="shelf_life_days" type="number" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" defaultValue="180" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Retail Price (₹)</label>
                <input name="retail_price" type="number" step="0.01" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Wholesale Price (₹)</label>
                <input name="wholesale_price" type="number" step="0.01" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:from-amber-700 hover:to-amber-600 transition-all">Save Product</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isBatchModalOpen} onClose={() => setBatchModalOpen(false)} title={`Add Batch: ${selectedProduct?.name}`}>
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Quantity Received ({selectedProduct?.pricing_unit})</label>
            <input name="quantity" type="number" step="0.01" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Total Cost Price (₹)</label>
            <input name="cost_price" type="number" step="0.01" required className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="Total cost for this batch" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Date Received</label>
            <input name="date_added" type="datetime-local" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" defaultValue={new Date().toISOString().slice(0, 16)} />
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:from-emerald-700 hover:to-emerald-600 transition-all">Add Batch</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
