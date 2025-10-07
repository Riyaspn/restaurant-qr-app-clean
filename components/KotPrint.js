// components/KotPrint.js
import React from 'react';

export default function KotPrint({ order, onClose }) {
  const handlePrint = () => {
    window.print();
    onClose?.();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatItems = (items) => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(order.order_items)) {
      return order.order_items.map(oi => ({
        name: oi.menu_items?.name || oi.item_name || 'Item',
        quantity: oi.quantity,
        price: oi.price
      }));
    }
    return [];
  };

  const items = formatItems(order.items);

  return (
    <>
      <div className="kot-print-overlay" onClick={onClose}>
        <div className="kot-print-modal" onClick={(e) => e.stopPropagation()}>
          <div className="kot-print-content">
            <div className="kot-header">
              <h2>Kitchen Order Ticket</h2>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            {/* KOT Content */}
            <div className="kot-ticket" id="kot-printable">
              <div className="kot-info">
                <div className="kot-row">
                  <span className="label">Table:</span>
                  <span className="value">{order.table_number}</span>
                </div>
                <div className="kot-row">
                  <span className="label">Order ID:</span>
                  <span className="value">#{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="kot-row">
                  <span className="label">Time:</span>
                  <span className="value">{formatTime(order.created_at)}</span>
                </div>
              </div>

              <div className="kot-divider">----------------------------</div>

              <div className="kot-items">
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
                🖨️ Print KOT
              </button>
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
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .kot-print-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow: auto;
        }
        .kot-print-content {
          padding: 20px;
        }
        .kot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .kot-header h2 {
          margin: 0;
          color: #333;
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
        }
        .print-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        }
        .print-btn:hover {
          background: #059669;
        }

        /* Print styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .kot-ticket, .kot-ticket * {
            visibility: visible;
          }
          .kot-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
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
