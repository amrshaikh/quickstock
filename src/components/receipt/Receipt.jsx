import { forwardRef } from 'react'

export const Receipt = forwardRef(({ cart, total, discount, saleType, date, saleId }, ref) => {
  return (
    <div 
      ref={ref} 
      className="bg-white p-8 w-[400px] text-black font-sans absolute left-[-9999px]"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Quba Dates</h1>
        <p className="text-sm text-gray-600 mt-1">Premium Dry Fruits & Nuts</p>
        <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
        <p className="text-xs text-gray-500 text-left">Receipt #: {saleId}</p>
        <p className="text-xs text-gray-500 text-left">Date: {date}</p>
        <p className="text-xs text-gray-500 text-left capitalize">Type: {saleType}</p>
      </div>
      
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left pb-2">Item</th>
            <th className="text-right pb-2">Qty</th>
            <th className="text-right pb-2">Price</th>
            <th className="text-right pb-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-2 pr-2">
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-gray-500">{item.code}</div>
              </td>
              <td className="py-2 text-right">{item.quantity}{item.pricing_unit === 'per_kg' ? 'kg' : ''}</td>
              <td className="py-2 text-right">₹{item.unit_price?.toFixed(2)}</td>
              <td className="py-2 text-right">₹{(item.unit_price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 mb-6 text-sm">
        {discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount</span>
            <span>-₹{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="font-medium">Thank you for your purchase!</p>
        <p className="text-xs text-gray-500 mt-1">Visit again</p>
      </div>
    </div>
  )
})
