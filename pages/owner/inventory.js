//pages/owner/inventory.js

import React, { useEffect, useState } from 'react'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import Alert from '../../components/Alert'
import Button from '../../components/ui/Button'
import { getSupabase } from '../../services/supabase'; // 1. IMPORT ADDED

export default function InventoryPage() {
  // 2. & 3. APPLY SINGLETON PATTERN
  const supabase = getSupabase();
  const { checking } = useRequireAuth(supabase)
  
  const { restaurant, loading: restLoading } = useRestaurant()
  const restaurantId = restaurant?.id

  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: '', current_stock: 0, reorder_threshold: 0 })
  const [recipeForm, setRecipeForm] = useState({ menuItemId: '', items: [] })
  const [showRecipeEditor, setShowRecipeEditor] = useState(false)

  useEffect(() => {
    if (checking || restLoading || !restaurantId || !supabase) return
    setLoading(true)
    Promise.all([
      supabase.from('ingredients').select('*').eq('restaurant_id', restaurantId),
      supabase.from('recipes').select('id,menu_item_id,recipe_items(*,ingredients(name))').eq('restaurant_id', restaurantId),
      supabase.from('menu_items').select('id,name').eq('restaurant_id', restaurantId)
    ]).then(([ingRes, recRes, menuRes]) => {
      if (ingRes.error || recRes.error || menuRes.error) {
        setError(ingRes.error?.message || recRes.error?.message || menuRes.error?.message)
      } else {
        setIngredients(ingRes.data || [])
        setRecipes(recRes.data || [])
        setMenuItems(menuRes.data || [])
      }
      setLoading(false)
    })
  }, [checking, restLoading, restaurantId, supabase])

  const startEdit = (ing) => {
    setEditingIngredient(ing.id)
    setIngredientForm({
      name: ing.name,
      unit: ing.unit,
      current_stock: ing.current_stock,
      reorder_threshold: ing.reorder_threshold
    })
  }
  const resetForm = () => {
    setEditingIngredient(null)
    setIngredientForm({ name: '', unit: '', current_stock: 0, reorder_threshold: 0 })
  }

  const saveIngredient = async () => {
    if (!supabase) return
    try {
      setError('')
      const payload = {
        restaurant_id: restaurantId,
        name: ingredientForm.name,
        unit: ingredientForm.unit,
        current_stock: Number(ingredientForm.current_stock),
        reorder_threshold: Number(ingredientForm.reorder_threshold)
      }
      let res
      if (editingIngredient) {
        res = await supabase
          .from('ingredients')
          .update({
            name: payload.name,
            unit: payload.unit,
            current_stock: payload.current_stock,
            reorder_threshold: payload.reorder_threshold
          })
          .eq('id', editingIngredient)
      } else {
        res = await supabase.from('ingredients').insert([payload])
      }
      if (res.error) throw res.error
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', restaurantId)
      if (error) throw error
      setIngredients(data || [])
      resetForm()
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteIngredient = async (id) => {
    if (!supabase) return
    if (!confirm('Delete this ingredient?')) return
    const { error } = await supabase.from('ingredients').delete().eq('id', id)
    if (error) setError(error.message)
    else setIngredients((prev) => prev.filter((i) => i.id !== id))
  }

  const openRecipe = (recipe) => {
    setShowRecipeEditor(true)
    const rec = recipe || { menu_item_id: '', recipe_items: [] }
    setRecipeForm({
      menuItemId: rec.menu_item_id,
      items: (rec.recipe_items || []).map((ri) => ({
        ingredientId: ri.ingredient_id,
        quantity: ri.quantity
      }))
    })
  }

  const changeRecipe = (index, field, value) => {
    setRecipeForm((prev) => {
      const items = [...prev.items]
      items[index][field] = value
      return { ...prev, items }
    })
  }
  const addRecipeItem = () => {
    setRecipeForm((prev) => ({ ...prev, items: [...prev.items, { ingredientId: '', quantity: 0 }] }))
  }
  const removeRecipeItem = (idx) => {
    setRecipeForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  const saveRecipe = async () => {
    if (!supabase) return
    try {
      setError('')
      const payload = {
        menu_item_id: recipeForm.menuItemId,
        items: recipeForm.items.filter((item) => item.ingredientId && item.quantity > 0)
      }
      const { error: recErr } = await supabase
        .from('recipes')
        .upsert(
          { menu_item_id: payload.menu_item_id, restaurant_id: restaurantId },
          { onConflict: ['menu_item_id', 'restaurant_id'] })
      if (recErr) throw recErr
      const { data, error } = await supabase
        .from('recipes')
        .select('id')
        .eq('menu_item_id', payload.menu_item_id)
        .eq('restaurant_id', restaurantId)
        .single()
      if (error) throw error

      await supabase.from('recipe_items').delete().eq('recipe_id', data.id)

      if (payload.items.length > 0) {
        const itemsToInsert = payload.items.map((item) => ({
          recipe_id: data.id,
          ingredient_id: item.ingredientId,
          quantity: item.quantity
        }))
        await supabase.from('recipe_items').insert(itemsToInsert)
      }

      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('id,menu_item_id,recipe_items(*,ingredients(name))')
        .eq('restaurant_id', restaurantId)
      if (recipesError) throw recipesError
      setRecipes(recipesData || [])
      setShowRecipeEditor(false)
    } catch (e) {
      setError(e.message)
    }
  }

  if (checking || restLoading) return <div style={{ padding: 16 }}>Loading…</div>
  if (!restaurantId) return <div style={{ padding: 16 }}>No restaurant found.</div>

  return (
    <div className="inventory-page">
      <h1>Inventory Management</h1>
      {error && <Alert type="error">{error}</Alert>}

      <section>
        <h2>Ingredients</h2>
        <div className="form-row">
          <input
            placeholder="Name"
            value={ingredientForm.name}
            onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
            style={{ fontSize: 16 }}
          />
          <input
            placeholder="Unit"
            value={ingredientForm.unit}
            onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
            style={{ fontSize: 16 }}
          />
          <input
            type="number"
            placeholder="Stock"
            value={ingredientForm.current_stock}
            onChange={(e) => setIngredientForm({ ...ingredientForm, current_stock: e.target.value })}
            style={{ fontSize: 16 }}
          />
          <input
            type="number"
            placeholder="Reorder @"
            value={ingredientForm.reorder_threshold}
            onChange={(e) => setIngredientForm({ ...ingredientForm, reorder_threshold: e.target.value })}
            style={{ fontSize: 16 }}
          />
          <Button onClick={saveIngredient}>{editingIngredient ? 'Update' : 'Add'} Ingredient</Button>
          {editingIngredient && <Button onClick={() => resetForm()}>Cancel</Button>}
        </div>
        {loading ? (
          <div>Loading ingredients…</div>
        ) : (
          <div className="table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Reorder Threshold</th>
                  <th>Low Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => (
                  <tr key={ing.id} className={ing.low_stock ? 'low-stock' : ''}>
                    <td>{ing.name}</td>
                    <td>{ing.unit}</td>
                    <td>{ing.current_stock}</td>
                    <td>{ing.reorder_threshold}</td>
                    <td>{ing.low_stock ? '⚠️' : ''}</td>
                    <td className="actions">
                      <button onClick={() => startEdit(ing)}>Edit</button>
                      <button onClick={() => deleteIngredient(ing.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Recipes</h2>
        <div className="recipes-list">
          {menuItems.map((menuItem) => {
            const recipe = recipes.find((r) => r.menu_item_id === menuItem.id)
            return (
              <div key={menuItem.id} className="recipe-card">
                <strong style={{ overflowWrap: 'anywhere' }}>{menuItem.name}</strong>
                <div className="muted" style={{ margin: '6px 0' }}>
                  {recipe?.recipe_items?.length ? (
                    recipe.recipe_items.map((ri) => (
                      <div key={`${ri.ingredient_id}-${ri.quantity}`}>
                        {ri.quantity} × {ri.ingredients?.name || '–'}
                      </div>
                    ))
                  ) : (
                    <em>No recipe</em>
                  )}
                </div>
                <Button onClick={() => openRecipe(recipe)}>Edit Recipe</Button>
              </div>
            )
          })}
        </div>
      </section>

      {showRecipeEditor && (
        <div
          className="modal"
          onClick={(e) => e.target === e.currentTarget && setShowRecipeEditor(false)}
        >
          <div className="modal-content">
            <h3>Edit Recipe</h3>
            <select
              value={recipeForm.menuItemId}
              onChange={(e) => setRecipeForm({ ...recipeForm, menuItemId: e.target.value })}
            >
              <option value="">Select Menu Item</option>
              {menuItems.map((mi) => (
                <option key={mi.id} value={mi.id}>
                  {mi.name}
                </option>
              ))}
            </select>
            {recipeForm.items.map((item, idx) => (
              <div className="form-row" key={idx}>
                <select
                  value={item.ingredientId}
                  onChange={(e) => changeRecipe(idx, 'ingredientId', e.target.value)}
                >
                  <option value="">Select Ingredient</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => changeRecipe(idx, 'quantity', e.target.value)}
                />
                <button onClick={() => removeRecipeItem(idx)}>Remove</button>
              </div>
            ))}
            <Button onClick={addRecipeItem}>Add Ingredient</Button>
            <div className="modal-actions">
              <Button onClick={saveRecipe}>Save</Button>
              <Button onClick={() => setShowRecipeEditor(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inventory-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
        }
        section {
          margin-bottom: 24px;
        }
        .form-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        input,
        select {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 16px;
        }
        .table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
        }
        .inventory-table th,
        .inventory-table td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .low-stock {
          background-color: #fffbe6;
        }
        .actions button {
          margin-right: 8px;
        }
        .recipes-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        .recipe-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          background: #fff;
        }
        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }
        .modal-content {
          background: #fff;
          padding: 1rem;
          max-width: 500px;
          width: 100%;
          border-radius: 8px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .muted { color: #6b7280; font-size: 14px; }
      `}</style>
    </div>
  )
}
