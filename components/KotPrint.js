// components/KotPrint.js

import React from 'react';

function toDisplayItems(order) {
  console.log('toDisplayItems called with order:', order);
  
  if (Array.isArray(order.items) && order.items.length) {
    console.log('Found order.items:', order.items);
    return order.items;
  }
  
  if (Array.isArray(order.order_items) && order.order_items.length) {
    console.log('Found order.order_items:', order.order_items);
    const mapped = order.order_items.map((oi) => ({
      name: oi.menu_items?.name || oi.item_name || 'Item',
      quantity: oi.quantity,
      price: oi.price,
    }));
    console.log('Mapped items:', mapped);
    return mapped;
  }
  
  console.log('No items found, returning empty array');
  return [];
}

export default function KotPrint({ 
  order, 
  onClose, 
  onPrint, 
  isPersistent = false, 
  queueInfo = null 
}) {
  console.log('KotPrint rendered with order:', order);
  
  const handlePrint = () => {
    window.print();
    if (onPrint) {
      onPrint();
    } else {
      onClose?.();
    }
  };

  const handleClose = () => {
    if (isPersistent) {
      const confirmed = confirm(
        'This KOT needs to be printed for the kitchen. Are you sure you want to close it?'
      );
      if (!confirmed) return;
    }
    onClose?.();
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const items = toDisplayItems(order);
  console.log('Items to display in KOT:', items);

  return (
    <>
      <div className="kot-print-overlay" onClick={isPersistent ? null : onClose}>
        <div className="kot-print-modal" onClick={e => e.stopPropagation()}>
          <div className="kot-print-content">
            <div className="kot-header">
              <div>
                <h2>Kitchen Order Ticket</h2>
                {queueInfo && (
                  <div className="queue-info">
                    Order {queueInfo.current} of {queueInfo.total}
                  </div>
                )}
              </div>
              {!isPersistent && (
                <button className="close-btn" onClick={handleClose}>×</button>
              )}
            </div>
            <div className="kot-ticket" id="kot-printable">
              <div className="kot-info">
                <div className="kot-row">
                  <span className="label">Table:</span>
                  <span className="value">{order.table_number}</span>
                </div>
                <div className="kot-row">
                  <span className="label">Order ID:</span>
                  <span className="value">#{order.id?.slice(0, 8)?.toUpperCase()}</span>
                </div>
                <div className="kot-row">
                  <span className="label">Time:</span>
                  <span className="value">{formatTime(order.created_at)}</span>
                </div>
              </div>
              <div className="kot-divider">----------------------------</div>
              <div className="kot-items">
                {items.length === 0 && (
                  <div style={{ fontStyle: 'italic', color: '#888' }}>No items found</div>
                )}
                {items.map((item, idx) => (
                  <div key={idx} className="kot-item">
                    <div className="item-qty">{item.quantity}x</div>
                    <div className="item-name">{item.name}</div>
                  </div>
                ))}
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
                🖨️ Print KOT {queueInfo ? `(${queueInfo.current}/${queueInfo.total})` : ''}
              </button>
              {isPersistent && queueInfo && queueInfo.current < queueInfo.total && (
                <button className="skip-btn" onClick={onPrint}>
                  Skip to Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .kot-print-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          pointer-events: auto;
        }
        .kot-print-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow: auto;
          border: 3px solid #10b981;
        }
        .kot-print-content {
          padding: 20px;
        }
        .kot-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .kot-header h2 {
          margin: 0;
          color: #333;
        }
        .queue-info {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        .kot-ticket {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: #fff;
          padding: 16px;
          border: 2px dashed #333;
          margin-bottom: 20px;
        }
        .kot-info {
          margin-bottom: 12px;
        }
        .kot-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .label {
          font-weight: bold;
        }
        .kot-divider {
          text-align: center;
          margin: 8px 0;
          font-weight: bold;
        }
        .kot-items {
          margin: 12px 0;
        }
        .kot-item {
          display: flex;
          margin-bottom: 6px;
          gap: 8px;
        }
        .item-qty {
          font-weight: bold;
          min-width: 30px;
        }
        .item-name {
          flex: 1;
          word-wrap: break-word;
        }
        .kot-notes {
          margin-top: 12px;
        }
        .kot-notes .label {
          margin-bottom: 4px;
        }
        .notes-text {
          font-style: italic;
          padding-left: 8px;
        }
        .kot-footer {
          margin-top: 12px;
          text-align: center;
        }
        .timestamp {
          font-size: 10px;
          color: #666;
        }
        .kot-actions {
          text-align: center;
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .print-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          flex: 1;
        }
        .print-btn:hover {
          background: #059669;
        }
        .skip-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        .skip-btn:hover {
          background: #4b5563;
        }

        /* Enhanced print styles for thermal paper */
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          .kot-ticket, .kot-ticket * {
            visibility: visible !important;
            font-size: 11px !important;
            box-shadow: none !important;
            color: #111 !important;
          }
          .kot-ticket {
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: #fff !important;
          }
          .kot-print-overlay,
          .kot-print-modal,
          .kot-header,
          .kot-actions {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
