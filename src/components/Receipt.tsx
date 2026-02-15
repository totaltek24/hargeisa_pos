import React, { useRef } from 'react';
import { Printer, X, Mail, MessageSquare, Download } from 'lucide-react';
import type { Transaction, TransactionItem, PaymentSplit, Customer, Settings } from '../types';

interface ReceiptProps {
  transaction: Transaction;
  items: TransactionItem[];
  payments: PaymentSplit[];
  customer?: Customer;
  settings: Settings;
  onClose: () => void;
  language: 'en' | 'so';
}

export function Receipt({ transaction, items, payments, customer, settings, onClose, language }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Use browser's print-to-PDF feature
    window.print();
  };

  const formatCurrency = (amountUsd: number) => {
    const slshAmount = amountUsd * transaction.exchangeRateUsed;
    return {
      usd: `$${amountUsd.toFixed(2)}`,
      slsh: `${slshAmount.toLocaleString()} SLSH`,
    };
  };

  const generateWhatsAppMessage = () => {
    const itemsText = items.map(item =>
      `${item.quantity}x ${item.productName} - ${formatCurrency(item.subtotalUsd).usd}`
    ).join('\n');

    const subtotal = formatCurrency(transaction.subtotalUsd);
    const tax = formatCurrency(transaction.taxUsd);
    const total = formatCurrency(transaction.totalUsd);

    const paymentText = payments.map(p => {
      const method = p.method === 'mobile_money' ? 'Mobile Money' : p.method;
      return `${method}: ${formatCurrency(p.amountUsd).usd}`;
    }).join('\n');

    return encodeURIComponent(
      `*${settings.businessName}*\n\nReceipt #${transaction.transactionNumber}\n${new Date(transaction.createdAt).toLocaleString()}\n\n${itemsText}\n\nSubtotal: ${subtotal.usd}\nTax: ${tax.usd}\n*Total: ${total.usd}* (${total.slsh})\n\n*Payment Methods:*\n${paymentText}\n\nThank you for your purchase!`
    );
  };

  const generateEmailBody = () => {
    const itemsText = items.map(item =>
      `${item.quantity}x ${item.productName} - ${formatCurrency(item.subtotalUsd).usd}`
    ).join('\n');

    const subtotal = formatCurrency(transaction.subtotalUsd);
    const tax = formatCurrency(transaction.taxUsd);
    const total = formatCurrency(transaction.totalUsd);

    const paymentText = payments.map(p => {
      const method = p.method === 'mobile_money' ? 'Mobile Money' : p.method;
      return `${method}: ${formatCurrency(p.amountUsd).usd}`;
    }).join('\n');

    return encodeURIComponent(
      `Receipt #${transaction.transactionNumber}\n\n${itemsText}\n\nSubtotal: ${subtotal.usd}\nTax: ${tax.usd}\nTotal: ${total.usd} (${total.slsh})\n\nPayment Methods:\n${paymentText}\n\nThank you for your purchase!\n\n${settings.businessName}`
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-hidden">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between print-hidden">
            <h2 className="text-xl font-bold text-slate-800">Receipt</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6" ref={receiptRef}>
            <div className="receipt-content">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">{settings.businessName}</h1>
                <p className="text-sm text-slate-600 mt-1">Tax ID: 123-456-789</p>
                <p className="text-sm text-slate-600">Hargeisa, Somaliland</p>
              </div>

              <div className="border-t border-b border-slate-300 py-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">Receipt #:</span>
                    <span className="font-semibold ml-2">{transaction.transactionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Date:</span>
                    <span className="font-semibold ml-2">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Time:</span>
                    <span className="font-semibold ml-2">
                      {new Date(transaction.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {transaction.cashier && (
                    <div>
                      <span className="text-slate-600">Cashier:</span>
                      <span className="font-semibold ml-2">{transaction.cashier}</span>
                    </div>
                  )}
                  {customer && (
                    <div className="col-span-2">
                      <span className="text-slate-600">Customer:</span>
                      <span className="font-semibold ml-2">{customer.name} ({customer.phone})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th className="text-left py-2">Item</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="py-2">{item.productName}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{formatCurrency(item.unitPriceUsd).usd}</td>
                        <td className="text-right font-semibold">{formatCurrency(item.subtotalUsd).usd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-300 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(transaction.subtotalUsd).usd}</span>
                </div>
                {transaction.taxUsd > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax ({settings.taxRate}%):</span>
                    <span className="font-semibold">{formatCurrency(transaction.taxUsd).usd}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-slate-300 pt-2">
                  <span>Total:</span>
                  <div className="text-right">
                    <div>{formatCurrency(transaction.totalUsd).usd}</div>
                    <div className="text-sm text-slate-600 font-normal">{formatCurrency(transaction.totalUsd).slsh}</div>
                  </div>
                </div>
              </div>

              {payments.length > 0 && (
                <div className="mt-4 border-t-2 border-slate-400 pt-4">
                  <h3 className="font-bold text-base mb-3 text-slate-800">Payment Methods Used:</h3>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
                    {payments.map(payment => (
                      <div key={payment.id} className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                        <div>
                          <span className="font-semibold text-slate-800 capitalize">
                            {payment.method === 'mobile_money' ? 'Mobile Money' : payment.method}
                          </span>
                          {payment.phoneNumber && (
                            <div className="text-xs text-slate-600 mt-0.5">{payment.phoneNumber}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-800">{formatCurrency(payment.amountUsd).usd}</div>
                          <div className="text-xs text-slate-600">{formatCurrency(payment.amountUsd).slsh}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-slate-600">
                <p>Thank you for your business!</p>
                <p className="mt-1">Exchange Rate: 1 USD = {transaction.exchangeRateUsed.toLocaleString()} SLSH</p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 space-y-2 print-hidden">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>

              <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Save as PDF
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${generateWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Text
              </a>

              <a
                href={`mailto:?subject=Receipt ${transaction.transactionNumber}&body=${generateEmailBody()}`}
                className="flex items-center justify-center gap-2 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            </div>

            <p className="text-xs text-center text-slate-500 mt-2">
              Tip: Use "Save as PDF" to print or save the receipt as a PDF file
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          /* Hide everything on the page */
          body * {
            visibility: hidden;
          }

          /* Show only the receipt content and its parents */
          .receipt-content,
          .receipt-content * {
            visibility: visible;
          }

          /* Position receipt at top of page */
          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 20px;
          }

          /* Hide modal overlay and controls */
          .print-hidden {
            display: none !important;
          }

          /* Reset body and page settings */
          body {
            margin: 0;
            padding: 0;
          }

          @page {
            margin: 1cm;
            size: auto;
          }
        }
      `}</style>
    </>
  );
}
