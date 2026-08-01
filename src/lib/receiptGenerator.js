import { jsPDF } from 'jspdf'

export const generateReceiptPDF = (receiptData) => {
  if (!receiptData) return;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 250]
    });
    
    let y = 10;
    
    // Header
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("QUBA DATES", 40, y, { align: "center" });
    y += 5;
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("Premium Dry Fruits & Nuts", 40, y, { align: "center" });
    y += 4;
    
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(5, y, 75, y);
    y += 4;
    pdf.setLineDashPattern([], 0);
    
    pdf.setFontSize(8);
    pdf.text(`Receipt #: ${receiptData.saleId}`, 5, y);
    y += 4;
    pdf.text(`Date: ${receiptData.date}`, 5, y);
    y += 4;
    pdf.text(`Type: ${receiptData.saleType}`, 5, y);
    y += 4;
    if (receiptData.paymentMethod) {
      pdf.text(`Payment: ${receiptData.paymentMethod}`, 5, y);
      y += 4;
    }
    
    pdf.line(5, y, 75, y);
    y += 4;
    
    // Table Header
    pdf.setFont("helvetica", "bold");
    pdf.text("Item", 5, y);
    pdf.text("Qty", 45, y, { align: "right" });
    pdf.text("Total", 75, y, { align: "right" });
    y += 4;
    pdf.line(5, y, 75, y);
    y += 4;
    
    // Items
    pdf.setFont("helvetica", "normal");
    receiptData.cart.forEach(item => {
      pdf.setFont("helvetica", "bold");
      const name = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
      pdf.text(name, 5, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
      pdf.text(item.code || '-', 5, y);
      
      const qtyStr = `${Number(item.quantity).toFixed(2)}${item.pricing_unit === 'per_kg' ? 'kg' : ''}`;
      pdf.text(qtyStr, 45, y, { align: "right" });
      
      const itemTotal = ((item.unit_price || 0) * item.quantity).toFixed(2);
      pdf.text(`Rs ${itemTotal}`, 75, y, { align: "right" });
      y += 4;
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(5, y, 75, y);
      pdf.setDrawColor(0, 0, 0);
      y += 4;
    });
    
    // Totals
    if (receiptData.discount > 0) {
      pdf.text("Discount", 5, y);
      pdf.text(`-Rs ${receiptData.discount.toFixed(2)}`, 75, y, { align: "right" });
      y += 4;
    }
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Total", 5, y);
    pdf.text(`Rs ${receiptData.total.toFixed(2)}`, 75, y, { align: "right" });
    y += 6;
    
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Thank you for your purchase!", 40, y, { align: "center" });
    y += 3;
    pdf.text("Visit again", 40, y, { align: "center" });
    
    pdf.save(`Receipt_${receiptData.saleId}.pdf`);
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
  }
}

export const generateStatementPDF = (activeTab, data) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const { salesData, stockData, startDate, endDate } = data;
    let y = 15;
    
    // Header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("QUBA DATES", 105, y, { align: "center" });
    y += 6;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Premium Dry Fruits & Nuts", 105, y, { align: "center" });
    y += 8;
    
    pdf.line(15, y, 195, y);
    y += 8;
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    const title = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + " Statement";
    pdf.text(title, 105, y, { align: "center" });
    y += 6;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date generated: ${new Date().toISOString().split('T')[0]}`, 105, y, { align: "center" });
    y += 5;
    
    if (startDate || endDate) {
      const s = startDate ? new Date(startDate).toLocaleDateString() : 'Start';
      const e = endDate ? new Date(endDate).toLocaleDateString() : 'Present';
      pdf.text(`Period: ${s} to ${e}`, 105, y, { align: "center" });
      y += 5;
    }
    y += 5;
    
    // Draw Table
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, y, 180, 8, "F");
    const colY = y + 5.5;
    
    if (activeTab === 'sales') {
      pdf.text("Sale ID", 18, colY);
      pdf.text("Date", 60, colY);
      pdf.text("Type", 95, colY);
      pdf.text("Payment", 125, colY);
      pdf.text("Discount", 160, colY, { align: "right" });
      pdf.text("Total", 192, colY, { align: "right" });
      y += 8;
      
      pdf.setFont("helvetica", "normal");
      salesData.forEach((sale) => {
        pdf.text(sale.id.slice(0, 8), 18, y + 5.5);
        pdf.text(new Date(sale.created_at).toLocaleString(), 60, y + 5.5);
        pdf.text(sale.sale_type, 95, y + 5.5);
        pdf.text(sale.payment_method || 'cash', 125, y + 5.5);
        pdf.text(`Rs ${sale.discount_amount.toFixed(2)}`, 160, y + 5.5, { align: "right" });
        pdf.setFont("helvetica", "bold");
        pdf.text(`Rs ${sale.total_amount.toFixed(2)}`, 192, y + 5.5, { align: "right" });
        pdf.setFont("helvetica", "normal");
        y += 8;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(15, y, 195, y);
      });
    } else if (activeTab === 'profit') {
      pdf.text("Sale ID", 18, colY);
      pdf.text("Date", 60, colY);
      pdf.text("Revenue", 125, colY, { align: "right" });
      pdf.text("Cost", 155, colY, { align: "right" });
      pdf.text("Profit", 192, colY, { align: "right" });
      y += 8;
      
      pdf.setFont("helvetica", "normal");
      salesData.forEach((sale) => {
        pdf.text(sale.id.slice(0, 8), 18, y + 5.5);
        pdf.text(new Date(sale.created_at).toLocaleString(), 60, y + 5.5);
        pdf.text(`Rs ${sale.total_amount.toFixed(2)}`, 125, y + 5.5, { align: "right" });
        pdf.text(`Rs ${sale.total_cost.toFixed(2)}`, 155, y + 5.5, { align: "right" });
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 128, 0);
        pdf.text(`+Rs ${sale.profit.toFixed(2)}`, 192, y + 5.5, { align: "right" });
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        y += 8;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(15, y, 195, y);
      });
    } else if (activeTab === 'stock') {
      pdf.text("Product Name", 18, colY);
      pdf.text("Code", 80, colY);
      pdf.text("Received", 145, colY, { align: "right" });
      pdf.text("Current Stock", 192, colY, { align: "right" });
      y += 8;
      
      pdf.setFont("helvetica", "normal");
      stockData.forEach((product) => {
        pdf.text(product.name, 18, y + 5.5);
        pdf.text(product.product_code || '-', 80, y + 5.5);
        pdf.text(`${Number(product.totalReceived).toFixed(2)} ${product.pricing_unit}`, 145, y + 5.5, { align: "right" });
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(184, 115, 51);
        pdf.text(`${Number(product.totalRemaining).toFixed(2)} ${product.pricing_unit}`, 192, y + 5.5, { align: "right" });
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        y += 8;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(15, y, 195, y);
      });
    }
    
    y += 10;
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("End of Report", 105, y, { align: "center" });
    
    pdf.save(`Quba_Dates_${activeTab}_Statement.pdf`);
  } catch (error) {
    console.error('Error generating PDF statement:', error);
  }
}
