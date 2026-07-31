import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Plus, Minus, X, AlertCircle, ShoppingCart, Scan, Tag, Trash2, CheckCircle, Percent, IndianRupee } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useCheckout } from '../hooks/useCheckout'

export default function Checkout() {
  const { products, loading: productsLoading, fetchProducts } = useProducts()
  const { processCheckout, loading: checkoutLoading, error: checkoutError } = useCheckout()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [saleType, setSaleType] = useState('retail')
  
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])
  
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return []
    const term = searchTerm.toLowerCase()
    return products.filter(p => 
      p.name?.toLowerCase().includes(term) || 
      p.product_code?.toLowerCase().includes(term)
    ).slice(0, 5)
  }, [searchTerm, products])

  const addToCart = (product) => {
    if (cart.find(item => item.product_id === product.id)) {
      updateQuantity(product.id, cart.find(item => item.product_id === product.id).quantity + (product.pricing_unit === 'per_kg' ? 0.5 : 1))
      setSearchTerm('')
      return;
    }
    
    setCart([...cart, {
      product_id: product.id,
      name: product.name,
      code: product.product_code,
      pricing_unit: product.pricing_unit,
      retail_price: product.retail_price,
      wholesale_price: product.wholesale_price,
      is_wholesale_eligible: product.is_wholesale_eligible,
      quantity: product.pricing_unit === 'per_kg' ? 1 : 1
    }])
    setSearchTerm('')
  }

  const updateQuantity = (productId, newQuantity) => {
    let num = Number(newQuantity)
    if (isNaN(num) || num < 0) num = 0
    
    // Limit kg to 5 decimal places (which equals exactly 2 decimal places in grams)
    // Limits pieces to 2 decimal places
    const item = cart.find(i => i.product_id === productId)
    if (item && item.pricing_unit === 'per_kg') {
      num = Math.round(num * 100000) / 100000
    } else {
      num = Math.round(num * 100) / 100
    }
    
    setCart(cart.map(i => i.product_id === productId ? { ...i, quantity: num } : i))
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const calculateItemPrice = (item) => {
    const price = saleType === 'wholesale' && item.wholesale_price 
      ? item.wholesale_price 
      : item.retail_price
    return Math.round(price * item.quantity)
  }

  const subtotal = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0)
  
  const handlePercentChange = (val) => {
    setDiscountPercent(val)
    if (val && !isNaN(Number(val))) {
      setDiscountAmount(Math.round(subtotal * (Number(val) / 100)).toString())
    } else {
      setDiscountAmount('')
    }
  }

  const handleAmountChange = (val) => {
    setDiscountAmount(val)
    if (val && !isNaN(Number(val)) && subtotal > 0) {
      const pct = (Number(val) / subtotal) * 100
      setDiscountPercent(Number.isInteger(pct) ? pct.toString() : pct.toFixed(1))
    } else {
      setDiscountPercent('')
    }
  }

  const numericDiscountAmount = Math.round(Number(discountAmount) || 0)
  const grandTotal = Math.max(0, subtotal - numericDiscountAmount)



  const handleCheckout = async () => {
    if (cart.length === 0) return
    
    // Validate we don't checkout items with 0 quantity
    if (cart.some(item => item.quantity === 0)) {
      alert("Please remove or update items with 0 quantity before checking out.")
      return
    }
    
    const cartForCheckout = cart.map(item => ({
      ...item,
      unit_price: saleType === 'wholesale' && item.wholesale_price 
        ? item.wholesale_price 
        : item.retail_price
    }))

    const result = await processCheckout(cartForCheckout, saleType, grandTotal, numericDiscountAmount)
    if (result.success) {
      alert(`Sale successful! Sale ID: ${result.saleId}.`)
      setCart([])
      setDiscountPercent('')
      setDiscountAmount('')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20">

      {checkoutError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm border border-red-200">
          <AlertCircle size={16} />
          {checkoutError}
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-stone-200">
        <button 
          onClick={() => setSaleType('retail')}
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-colors ${saleType === 'retail' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          Retail Mode
        </button>
        <button 
          onClick={() => setSaleType('wholesale')}
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-colors ${saleType === 'wholesale' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          Wholesale Mode
        </button>
      </div>

      {/* Scanner / Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 relative">
        <div className="flex items-center gap-2 mb-3">
          <Scan size={18} className="text-amber-600" />
          <span className="font-semibold text-stone-700 text-sm">Search / Select Item</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Product name or code..."
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50 tracking-wide"
          />
        </div>
        {searchTerm && (
          <div className="absolute z-20 left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full text-left px-4 py-3 border-b border-stone-50 hover:bg-stone-50 transition-colors flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-stone-800 text-sm">{product.name}</div>
                  <div className="text-xs text-stone-400 font-mono">{product.product_code}</div>
                </div>
                <Plus size={16} className="text-amber-600" />
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="px-4 py-3 text-stone-400 text-sm text-center">No products found.</div>
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-amber-600" />
            <span className="font-semibold text-stone-700 text-sm">Cart</span>
            {cart.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
              <Trash2 size={12}/> Clear
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="py-10 text-center">
            <ShoppingCart size={36} className="mx-auto text-stone-200 mb-2"/>
            <p className="text-stone-400 text-sm">Cart is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {cart.map(item => {
              const unitStep = item.pricing_unit === 'per_kg' ? 0.5 : 1
              const displayUnit = item.pricing_unit === 'per_kg' ? 'kg' : 'pcs'
              const currentPrice = calculateItemPrice(item)
              
              const itemUnitPrice = saleType === 'wholesale' && item.wholesale_price 
                ? item.wholesale_price 
                : item.retail_price

              return (
              <div key={item.product_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-stone-400 font-mono">{item.code}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-stone-300 hover:text-red-400 mt-0.5 flex-shrink-0">
                    <X size={14}/>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-stone-50 rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.product_id, Number(item.quantity) - unitStep)}
                      className="w-7 h-7 rounded-lg bg-white shadow-sm text-stone-600 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all"
                    >
                      <Minus size={12}/>
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity === 0 ? '' : (item.pricing_unit === 'per_kg' ? Number((item.quantity * 1000).toFixed(2)) : item.quantity)}
                        onChange={e => updateQuantity(item.product_id, item.pricing_unit === 'per_kg' ? Number(e.target.value)/1000 : e.target.value)}
                        className="w-14 text-center text-sm font-semibold text-stone-700 bg-transparent focus:outline-none"
                      />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-medium pointer-events-none pr-1">
                        {item.pricing_unit === 'per_kg' ? 'g' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.product_id, Number(item.quantity) + unitStep)}
                      className="w-7 h-7 rounded-lg bg-white shadow-sm text-stone-600 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all"
                    >
                      <Plus size={12}/>
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5 border border-transparent hover:border-stone-200 rounded px-1 transition-colors">
                    <span className="font-bold text-amber-700 text-sm">₹</span>
                    <input
                      type="number"
                      value={currentPrice === 0 ? '' : currentPrice}
                      onChange={e => updateQuantity(item.product_id, Number(e.target.value) / itemUnitPrice)}
                      className="w-16 text-right font-bold text-amber-700 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1"
                    />
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Discount & Summary */}
      {cart.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-emerald-600"/>
            <span className="font-semibold text-stone-700 text-sm">Smart Discount</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                value={discountPercent}
                onChange={e => handlePercentChange(e.target.value)}
                placeholder="Percent"
                className="w-full border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-stone-50"
              />
            </div>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                value={discountAmount}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="Amount"
                className="w-full border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-stone-50"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span><span className="font-medium text-stone-700">₹{subtotal}</span>
            </div>
            {numericDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span><span className="font-medium">-₹{numericDiscountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-stone-800 pt-1 border-t border-stone-100">
              <span>Total</span><span className="text-amber-700 text-lg">₹{grandTotal}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl py-3.5 font-bold text-sm shadow-md hover:shadow-amber-200 hover:from-amber-700 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={18}/> 
            {checkoutLoading ? 'Processing...' : `Complete Checkout — ₹${grandTotal}`}
          </button>
        </div>
      )}
    </div>
  )
}
