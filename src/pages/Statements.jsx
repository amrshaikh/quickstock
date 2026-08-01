import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Filter, FileSpreadsheet, FileText, Download, X, Trash2, Pencil } from 'lucide-react'
import { useStatements } from '../hooks/useStatements'
import { exportToCSV, formatDate } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { Receipt as ReceiptGenerator } from '../components/receipt/Receipt'
import { generateReceiptPDF, generateStatementPDF } from '../lib/receiptGenerator'

export default function Statements() {
  const navigate = useNavigate()
  const { salesData, stockData, loading, fetchStatements, deleteSale } = useStatements()
  const [activeTab, setActiveTab] = useState('sales') // 'sales', 'profit', 'stock'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)

  useEffect(() => {
    fetchStatements()
  }, [fetchStatements])

  const handleFilter = () => {
    let start = startDate ? new Date(startDate).toISOString() : null
    let end = endDate ? new Date(endDate) : null
    if (end) {
      end.setHours(23, 59, 59, 999)
      end = end.toISOString()
    }
    fetchStatements(start, end)
  }

  const exportSales = () => {
    const data = salesData.map(s => ({
      'Sale ID': s.id,
      'Date': formatDate(s.created_at),
      'Type': s.sale_type,
      'Payment': s.payment_method || 'cash',
      'Discount': s.discount_amount,
      'Total Amount': s.total_amount
    }))
    exportToCSV(data, `Sales_Statement_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const exportProfit = () => {
    const data = salesData.map(s => ({
      'Sale ID': s.id,
      'Date': formatDate(s.created_at),
      'Revenue': s.total_amount,
      'Cost': s.total_cost,
      'Profit': s.profit
    }))
    exportToCSV(data, `Profit_Statement_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const exportStock = () => {
    const data = stockData.map(p => ({
      'Code': p.product_code,
      'Product Name': p.name,
      'Pricing Unit': p.pricing_unit,
      'Total Received': Number(p.totalReceived).toFixed(2),
      'Current Stock': Number(p.totalRemaining).toFixed(2),
      'Active Batches': p.activeBatchesCount
    }))
    exportToCSV(data, `Stock_Statement_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleExport = (type) => {
    if (type === 'CSV') {
      if (activeTab === 'sales') exportSales()
      if (activeTab === 'profit') exportProfit()
      if (activeTab === 'stock') exportStock()
    }
    if (type === 'PDF') {
      generateStatementPDF(activeTab, { salesData, stockData, startDate, endDate })
    }
  }
  
  const receiptData = selectedSale ? {
    cart: selectedSale.sale_items?.map(si => ({
      name: si.batches?.products?.name || 'Unknown Item',
      code: si.batches?.products?.product_code || '-',
      quantity: si.quantity,
      pricing_unit: si.batches?.products?.pricing_unit || 'per_kg',
      unit_price: si.unit_price_used
    })) || [],
    total: selectedSale.total_amount,
    discount: selectedSale.discount_amount,
    saleType: selectedSale.sale_type,
    paymentMethod: selectedSale.payment_method || 'cash',
    date: formatDate(selectedSale.created_at),
    saleId: selectedSale.receipt_number || selectedSale.id,
    rawId: selectedSale.id
  } : null

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-8">
      {/* Tab Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-1 flex gap-1">
        {[
          { id: "sales", label: "Sales" },
          { id: "profit", label: "Profit" },
          { id: "stock", label: "Stock" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setActiveTab(f.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === f.id
                ? "bg-amber-600 text-white shadow-sm"
                : "text-stone-500 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-stone-100">
        <div className="flex-1 flex items-center gap-2 px-2 border-r border-stone-100">
          <Calendar size={16} className="text-stone-400 shrink-0" />
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="text-xs text-stone-700 focus:outline-none bg-transparent w-full"
          />
        </div>
        <div className="flex-1 flex items-center gap-2 px-2">
          <span className="text-stone-400 text-xs shrink-0">to</span>
          <input 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="text-xs text-stone-700 focus:outline-none bg-transparent w-full"
          />
        </div>
        <button 
          onClick={handleFilter}
          className="ml-1 bg-stone-100 text-stone-600 p-2 rounded-lg hover:bg-stone-200 transition-colors"
        >
          <Filter size={16} />
        </button>
      </div>

      {/* Data Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-700 capitalize">{activeTab} Statement</h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-stone-400 text-sm">Loading statement data...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[300px]">
              <thead>
                {activeTab === 'sales' && (
                  <tr className="border-b border-stone-100 text-stone-400 text-xs">
                    <th className="px-4 py-3 font-medium">Sale ID</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                )}
                {activeTab === 'profit' && (
                  <tr className="border-b border-stone-100 text-stone-400 text-xs">
                    <th className="px-4 py-3 font-medium">Sale ID</th>
                    <th className="px-4 py-3 font-medium text-right">Cost</th>
                    <th className="px-4 py-3 font-medium text-right text-emerald-600">Profit</th>
                  </tr>
                )}
                {activeTab === 'stock' && (
                  <tr className="border-b border-stone-100 text-stone-400 text-xs">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Rcvd</th>
                    <th className="px-4 py-3 font-medium text-right text-amber-600">Stock</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-stone-50">
                {activeTab === 'sales' && salesData.map(sale => (
                  <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="hover:bg-stone-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-stone-700">{sale.receipt_number || sale.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-stone-400">{formatDate(sale.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-stone-600">{sale.sale_type}</td>
                    <td className="px-4 py-3 text-xs capitalize text-stone-600">
                      <span className={`px-2 py-0.5 rounded-full ${sale.payment_method === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                        {sale.payment_method || 'cash'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-sm text-stone-800">₹{sale.total_amount.toFixed(2)}</p>
                      {sale.discount_amount > 0 && <p className="text-[10px] text-red-500">-₹{sale.discount_amount.toFixed(2)}</p>}
                    </td>
                  </tr>
                ))}
                
                {activeTab === 'profit' && salesData.map(sale => (
                  <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="hover:bg-stone-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-stone-700">{sale.receipt_number || sale.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-stone-400">₹{sale.total_amount.toFixed(2)} Rev</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500 text-right">₹{sale.total_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 text-right">+₹{sale.profit.toFixed(2)}</td>
                  </tr>
                ))}

                {activeTab === 'stock' && stockData.map(product => (
                  <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-stone-700">{product.name}</p>
                      <p className="text-[10px] font-mono text-stone-400">{product.product_code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500 text-right">{Number(product.totalReceived).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-amber-700 text-right">{Number(product.totalRemaining).toFixed(2)}</td>
                  </tr>
                ))}
                
                {((activeTab === 'sales' && salesData.length === 0) || 
                  (activeTab === 'profit' && salesData.length === 0) || 
                  (activeTab === 'stock' && stockData.length === 0)) && !loading && (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-stone-400 text-sm">No data found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Export Center */}
      <div className="bg-gradient-to-br from-amber-50 to-emerald-50 rounded-2xl p-4 border border-amber-100">
        <h3 className="text-sm font-semibold text-stone-700 mb-1 flex items-center gap-2">
          <FileText size={14} className="text-amber-600"/> Export Center
        </h3>
        <p className="text-xs text-stone-500 mb-3">Download your {activeTab} report</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('CSV')}
            className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <FileSpreadsheet size={14}/> Export CSV
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="flex-1 bg-amber-600 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-700 active:scale-95 transition-all opacity-70"
          >
            <FileText size={14}/> Print PDF
          </button>
        </div>
      </div>
      

      
      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title="Sale Details">
        {receiptData && (
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 overflow-hidden max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase tracking-wider text-stone-800">Quba Dates</h1>
                <p className="text-xs text-stone-500 mt-1">Premium Dry Fruits & Nuts</p>
                <div className="border-b border-dashed border-stone-300 my-3"></div>
                <p className="text-[10px] text-stone-500 text-left">Receipt #: {receiptData.saleId}</p>
                <p className="text-[10px] text-stone-500 text-left">Date: {receiptData.date}</p>
                <p className="text-[10px] text-stone-500 text-left capitalize">Type: {receiptData.saleType}</p>
                <p className="text-[10px] text-stone-500 text-left capitalize">Payment: {receiptData.paymentMethod}</p>
              </div>
              
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-stone-300">
                    <th className="text-left pb-1 text-stone-600 font-semibold">Item</th>
                    <th className="text-right pb-1 text-stone-600 font-semibold">Qty</th>
                    <th className="text-right pb-1 text-stone-600 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.cart.map((item, idx) => (
                    <tr key={idx} className="border-b border-stone-100">
                      <td className="py-2 pr-1">
                        <div className="font-medium text-stone-800">{item.name}</div>
                      </td>
                      <td className="py-2 text-right text-stone-600">{item.quantity.toFixed(2)}{item.pricing_unit === 'per_kg' ? 'kg' : ''}</td>
                      <td className="py-2 text-right font-medium text-stone-800">₹{(item.unit_price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 mb-2 text-xs">
                {receiptData.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-₹{receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-stone-300 text-stone-800">
                  <span>Total</span>
                  <span>₹{receiptData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if(window.confirm('Are you sure you want to delete this sale? This will instantly restore all items back to inventory.')) {
                    deleteSale(selectedSale.id).then((res) => {
                      if (res.success) setSelectedSale(null)
                    })
                  }
                }}
                className="flex-1 bg-red-50 text-red-600 rounded-xl py-3 text-sm font-bold shadow-sm border border-red-100 hover:bg-red-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16}/> Delete
              </button>
              
              <button
                onClick={() => {
                  navigate('/checkout', { state: { editSale: selectedSale } })
                }}
                className="flex-1 bg-stone-100 text-stone-700 rounded-xl py-3 text-sm font-bold shadow-sm border border-stone-200 hover:bg-stone-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Pencil size={16}/> Edit
              </button>
              
              <button
                onClick={() => generateReceiptPDF(receiptData)}
                className="flex-[2] bg-amber-600 text-white rounded-xl py-3 text-sm font-bold shadow-md hover:bg-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download size={16}/> Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
