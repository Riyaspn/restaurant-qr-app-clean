// components/customer/MenuDisplay.js
import { useState, useMemo } from 'react'
import Image from 'next/image'

export default function MenuDisplay({ items, categories, onAddToCart, cart }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [vegOnly, setVegOnly] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (vegOnly && !item.veg) return false
      if (selectedCategory && item.category !== selectedCategory) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return item.name.toLowerCase().includes(query) ||
               item.description?.toLowerCase().includes(query)
      }
      return true
    })
  }, [items, searchQuery, selectedCategory, vegOnly])

  const itemsInCart = useMemo(() => {
    return cart.reduce((acc, item) => {
      acc[item.id] = item.quantity
      return acc
    }, {})
  }, [cart])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const category = item.category || 'Others'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})
  }, [filteredItems])

  return (
    <div className="menu-display">
      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="category-tabs">
          <button 
            className={`category-tab ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat.name}
              className={`category-tab ${selectedCategory === cat.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <label className="veg-filter">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            <span className="checkmark">🟢</span>
            Veg Only
          </label>
          <div className="results-count">
            {filteredItems.length} items
          </div>
        </div>
      </div>

      {/* Menu Items by Category */}
      <div className="menu-content">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <section key={category} className="category-section">
            <div className="category-header">
              <h2 className="category-title">{category}</h2>
              <span className="item-count">({categoryItems.length})</span>
              <button className="collapse-btn">^</button>
            </div>
            
            <div className="items-list">
              {categoryItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantityInCart={itemsInCart[item.id] || 0}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <style jsx>{`
        .menu-display { padding: 0; }
        
        .filters-section { 
          background: #fff; padding: 1rem; border-bottom: 1px solid #f3f4f6;
          position: sticky; top: 76px; z-index: 30;
        }
        
        .search-container { 
          position: relative; margin-bottom: 1rem; 
        }
        .search-input {
          width: 100%; padding: 12px 16px 12px 44px; border: 1px solid #e5e7eb;
          border-radius: 12px; font-size: 16px; background: #f9fafb;
        }
        .search-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #6b7280; font-size: 18px;
        }
        
        .category-tabs {
          display: flex; gap: 8px; overflow-x: auto; 
          padding-bottom: 4px; margin-bottom: 1rem; scrollbar-width: none;
        }
        .category-tabs::-webkit-scrollbar { display: none; }
        .category-tab {
          white-space: nowrap; padding: 8px 16px; border: 1px solid #e5e7eb;
          background: #fff; border-radius: 20px; cursor: pointer; font-size: 14px;
          transition: all 0.2s;
        }
        .category-tab.active {
          background: var(--brand-color, #f59e0b); color: #fff; border-color: var(--brand-color, #f59e0b);
        }
        
        .filter-row {
          display: flex; justify-content: space-between; align-items: center;
        }
        .veg-filter {
          display: flex; align-items: center; gap: 8px; cursor: pointer;
          font-size: 14px; color: #374151;
        }
        .veg-filter input { display: none; }
        .checkmark { 
          opacity: 0.3; transition: opacity 0.2s;
        }
        .veg-filter input:checked + .checkmark { opacity: 1; }
        
        .results-count { 
          font-size: 14px; color: #6b7280; font-weight: 500;
        }

        .menu-content { background: #f8f9fa; }
        
        .category-section { 
          background: #fff; margin-bottom: 8px; 
        }
        
        .category-header {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 20px 12px; border-bottom: 1px solid #f3f4f6;
        }
        .category-title {
          font-size: 18px; font-weight: 600; color: #111827; margin: 0; flex: 1;
        }
        .item-count { 
          color: #6b7280; font-size: 14px; 
        }
        .collapse-btn {
          background: none; border: none; color: #6b7280; cursor: pointer;
          width: 32px; height: 32px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center;
        }
        
        .items-list {
          display: flex; flex-direction: column;
        }
      `}</style>
    </div>
  )
}

function MenuItemCard({ item, quantityInCart, onAddToCart }) {
  const [showFullDescription, setShowFullDescription] = useState(false)

  const truncateDescription = (text, limit = 80) => {
    if (!text) return ''
    return text.length > limit ? text.substring(0, limit) + '...' : text
  }

  return (
    <div className="menu-item">
      {item.veg && <div className="veg-indicator">🟢</div>}
      
      <div className="item-content">
        <div className="item-info">
          <h3 className="item-name">{item.name}</h3>
          <div className="item-price">₹{item.price}</div>
          {item.description && (
            <p className="item-description">
              {showFullDescription ? item.description : truncateDescription(item.description)}
              {item.description.length > 80 && (
                <button 
                  className="read-more"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? ' Read Less' : ' Read More'}
                </button>
              )}
            </p>
          )}
        </div>

        {item.image_url && (
          <div className="item-image">
            <img src={item.image_url} alt={item.name} />
          </div>
        )}
      </div>

      <div className="item-actions">
        {quantityInCart > 0 ? (
          <div className="quantity-selector">
            <button 
              onClick={() => onAddToCart(item, -1)}
              className="qty-btn minus"
            >
              −
            </button>
            <span className="qty-count">{quantityInCart}</span>
            <button 
              onClick={() => onAddToCart(item, 1)}
              className="qty-btn plus"
            >
              +
            </button>
          </div>
        ) : (
          <button 
            onClick={() => onAddToCart(item, 1)}
            className="add-btn"
          >
            + Add
          </button>
        )}
      </div>

      <style jsx>{`
        .menu-item {
          position: relative; background: #fff; padding: 20px;
          border-bottom: 1px solid #f3f4f6;
        }
        .menu-item:last-child { border-bottom: none; }
        
        .veg-indicator {
          position: absolute; top: 16px; right: 16px; font-size: 12px;
        }
        
        .item-content {
          display: flex; gap: 16px; margin-bottom: 12px;
        }
        
        .item-info { flex: 1; }
        .item-name { 
          margin: 0 0 4px 0; font-size: 16px; font-weight: 600; 
          color: #111827; line-height: 1.3;
        }
        .item-price { 
          font-size: 15px; font-weight: 700; color: var(--brand-color, #f59e0b);
          margin-bottom: 8px;
        }
        .item-description { 
          margin: 0; color: #6b7280; font-size: 14px; line-height: 1.4;
        }
        .read-more {
          background: none; border: none; color: var(--brand-color, #f59e0b);
          cursor: pointer; font-size: 14px; font-weight: 500;
        }
        
        .item-image { 
          width: 80px; height: 80px; border-radius: 8px; overflow: hidden;
          flex-shrink: 0;
        }
        .item-image img {
          width: 100%; height: 100%; object-fit: cover;
        }
        
        .item-actions { 
          display: flex; justify-content: flex-end; 
        }
        
        .add-btn {
          background: var(--brand-color, #f59e0b); color: #fff; border: none;
          padding: 8px 20px; border-radius: 8px; font-weight: 600;
          cursor: pointer; font-size: 14px;
        }
        
        .quantity-selector {
          display: flex; align-items: center; background: var(--brand-color, #f59e0b);
          border-radius: 8px; overflow: hidden;
        }
        .qty-btn {
          background: none; border: none; color: #fff; 
          width: 36px; height: 36px; cursor: pointer; font-size: 18px;
          font-weight: 600; display: flex; align-items: center; justify-content: center;
        }
        .qty-count {
          background: #fff; color: var(--brand-color, #f59e0b); 
          min-width: 40px; height: 36px; display: flex;
          align-items: center; justify-content: center; font-weight: 600;
        }
      `}</style>
    </div>
  )
}
