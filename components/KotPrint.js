// components/KotPrint.js

import React from 'react';

function toDisplayItems(order) {
  if (Array.isArray(order.items) && order.items.length) {
    return order.items;
  }
  if (Array.isArray(order.order_items) && order.order_items.length) {
    return order.order_items.map((oi) => ({
      name: oi.menu_items?.name || oi.item_name || 'Item',
      quantity: oi.quantity,
      price: oi.price,
    }));
  }
  return [];
}

export default function KotPrint({ order, onClose, onPrint }) {
  const isPersistent = false;

  const handlePrint = () => {
    const kotContent = document.getElementById('kot-printable');
    if (!kotContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kitchen Order Ticket</title>
          <style>
            @media print {
              @page { size: 58mm auto; margin: 2mm; }
              body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              padding: 8px;
              width: 58mm;
              max-width: 58mm;
            }
            .kot-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .label { font-weight: bold; }
            .kot-divider { text-align: center; margin: 8px 0; font-weight: bold; }
            .kot-item { display: flex; margin-bottom: 6px; gap: 8px; }
            .item-qty { font-weight: bold; min-width: 30px; }
            .item-name { flex: 1; word-wrap: break-word; }
            .kot-notes { margin-top: 12px; }
            .notes-text { font-style: italic; padding-left: 8px; }
            .kot-footer { margin-top: 12px; text-align: center; }
            .timestamp { font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          ${kotContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      if (onPrint) onPrint();
      else onClose?.();
    }, 250);
  };

  const handleClose = () => {
    if (!isPersistent) {
      onClose?.();
      return;
    }
    const confirmed = confirm(
      'This KOT needs to be printed for the kitchen. Are you sure you want to close it?'
    );
    if (confirmed) onClose?.();
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const items = toDisplayItems(order);

  return (
    <>
      <div className="kot-print-overlay">
        <div className="kot-print-modal">
          <div className="kot-print-content">
            <div className="kot-header">
              <h2>Kitchen Order Ticket</h2>
              {!isPersistent && (
                <button className="close-btn" onClick={handleClose}>×</button>
              )}
            </div>

            <div className="kot-ticket" id="kot-printable">
              <div className="kot-info">
                <div className="kot-row">
                  <span className="label">Table:</span>
                  <span>{order.table_number}</span>
                </div>
                <div className="kot-row">
                  <span className="label">Order ID:</span>
                  <span>#{order.id?.slice(0, 8)?.toUpperCase()}</span>
                </div>
                <div className="kot-row">
                  <span className="label">Time:</span>
                  <span>{formatTime(order.created_at)}</span>
                </div>
              </div>

              <div className="kot-divider">----------------------------</div>

              <div className="kot-items">
                {items.length === 0 ? (
                  <div style={{ fontStyle: 'italic', color: '#888' }}>No items found</div>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="kot-item">
                      <div className="item-qty">{item.quantity}x</div>
                      <div className="item-name">{item.name}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="kot-divider">----------------------------</div>

              {order.special_instructions && (
                <div className="kot-notes">
                  <div className="label">Special Instructions:</div>
                  <div className="notes-text">{order.special_instructions}</div>
                </div>
              )}

              <div className="kot-footer">
                <div className="timestamp">
                  Printed: {new Date().toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="kot-actions">
              <button className="print-btn" onClick={handlePrint}>
                🖨️ Print KOT
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .kot-print-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000;
        }
        .kot-print-modal {
          background: white;
          border-radius: 8px;
          width: 90%; max-width: 400px; max-height: 90vh;
          overflow: auto; border: 3px solid #10b981;
        }
        .kot-print-content { padding: 20px; }
        .kot-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px;
        }
        .close-btn {
          background: none; border: none; font-size: 24px;
          cursor: pointer; color: #666;
        }
        .kot-ticket {
          font-family: 'Courier New', monospace;
          font-size: 12px; line-height: 1.4; color: #000;
          background: #fff; padding: 16px; border: 2px dashed #333;
          margin-bottom: 20px;
        }
        .kot-info { margin-bottom: 12px; }
        .kot-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .label { font-weight: bold; }
        .kot-divider { text-align: center; margin: 8px 0; font-weight: bold; }
        .kot-items { margin: 12px 0; }
        .kot-item { display: flex; margin-bottom: 6px; gap: 8px; }
        .item-qty { font-weight: bold; min-width: 30px; }
        .item-name { flex: 1; word-wrap: break-word; }
        .kot-notes { margin-top: 12px; }
        .notes-text { font-style: italic; padding-left: 8px; }
        .kot-footer { margin-top: 12px; text-align: center; }
        .timestamp { font-size: 10px; color: #666; }
        .kot-actions { text-align: center; margin-top: 10px; }
        .print-btn {
          background: #10b981; color: white; border: none;
          padding: 12px 24px; border-radius: 6px;
          cursor: pointer; font-size: 16px;
        }
        .print-btn:hover { background: #059669; }
      `}</style>
    </>
  );
}
