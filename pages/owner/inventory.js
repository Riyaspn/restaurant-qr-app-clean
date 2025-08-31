// pages/owner/inventory.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import Alert from '../../components/Alert'
import Button from '../../components/ui/Button'

export default function InventoryPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: restLoading } = useRestaurant()
  const restaurantId = restaurant?.id

  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: '', current_stock: 0, reorder_threshold: 0 })
  const [recipeForm, setRecipeForm] = useState({ menu_item_id: '', items: [] })
  const [showRecipeEditor, setShowRecipeEditor] = useState(false)

  useEffect(() => {
    if (checking || restLoading || !restaurantId) return
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
  }, [checking, restLoading, restaurantId])

  const startEdit = ing => {
    setEditingIngredient(ing.id)
    setIngredientForm({
      name: ing.name, unit: ing.unit,
      current_stock: ing.current_stock, reorder_threshold: ing.reorder_threshold
    })
  }
  const resetForm = () => {
    setEditingIngredient(null)
    setIngredientForm({ name:'', unit:'', current_stock:0, reorder_threshold:0 })
  }

  const saveIngredient = async () => {
    try {
      setError('')
      const body = {
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
          .update({ current_stock: body.current_stock, reorder_threshold: body.reorder_threshold, name: body.name, unit: body.unit })
          .eq('id', editingIngredient)
      } else {
        res = await supabase.from('ingredients').insert([body])
      }
      if (res.error) throw res.error
      const { data, error: fetchErr } = await supabase.from('ingredients').select('*').eq('restaurant_id', restaurantId)
      if (fetchErr) throw fetchErr
      setIngredients(data || [])
      resetForm()
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteIngredient = async id => {
    if (!confirm('Delete this ingredient?')) return
    await supabase.from('ingredients').delete().eq('id', id)
    setIngredients(prev => prev.filter(i => i.id !== id))
  }

  const openRecipe = recipe => {
    setShowRecipeEditor(true)
    const rec = recipe || { menu_item_id: '', recipe_items: [] }
    setRecipeForm({
      menu_item_id: rec.menu_item_id,
      items: (rec.recipe_items || []).map(ri => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity
      }))
    })
  }

  const changeRecipe = (index, field, value) => {
    setRecipeForm(prev => {
      const items = [...prev.items]
      items[index][field] = value
      return { ...prev, items }
    })
  }
  const addRecipeItem = () => {
    setRecipeForm(prev => ({ ...prev, items: [...prev.items, { ingredient_id:'', quantity:0 }] }))
  }
  const removeRecipeItem = idx => {
    setRecipeForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  const saveRecipe = async () => {
    try {
      setError('')
      const payload = {
        menu_item_id: recipeForm.menu_item_id,
        items: recipeForm.items.filter(i => i.ingredient_id && i.quantity > 0)
      }
      const { error: recErr } = await supabase
        .from('recipes')
        .upsert({ restaurant_id: restaurantId, menu_item_id: payload.menu_item_id }, { onConflict:['restaurant_id','menu_item_id'] })
      if (recErr) throw recErr

      const { data: rec } = await supabase
        .from('recipes').select('id').eq('restaurant_id', restaurantId).eq('menu_item_id', payload.menu_item_id).single()

      await supabase.from('recipe_items').delete().eq('recipe_id', rec.id)
      if (payload.items.length) {
        await supabase.from('recipe_items').insert(
          payload.items.map(i => ({ recipe_id: rec.id, ingredient_id: i.ingredient_id, quantity: i.quantity }))
        )
      }

      const { data, error: fetchErr } = await supabase
        .from('recipes').select('id,menu_item_id,recipe_items(*,ingredients(name))').eq('restaurant_id', restaurantId)
      if (fetchErr) throw fetchErr
      setRecipes(data || [])
      setShowRecipeEditor(false)
    } catch (e) {
      setError(e.message)
    }
  }

  if (checking || restLoading) return <div style={{ padding: 16 }}>Loading…</div>

  return (
    <div className="inventory-page">
      <h1>Inventory Management</h1>
      {error && <Alert type="error">{error}</Alert>}

      {/* Ingredients Section */}
      <section>
        <h2>Ingredients</h2>
        <div className="form-row">
          <input placeholder="Name" value={ingredientForm.name}
            onChange={e => setIngredientForm({...ingredientForm, name:e.target.value})} style={{ fontSize: 16 }} /> {/* iOS zoom guard [web:199][web:198][web:208] */}
          <input placeholder="Unit" value={ingredientForm.unit}
            onChange={e => setIngredientForm({...ingredientForm, unit:e.target.value})} style={{ fontSize: 16 }} />
          <input type="number" placeholder="Stock" value={ingredientForm.current_stock}
            onChange={e => setIngredientForm({...ingredientForm, current_stock:e.target.value})} style={{ fontSize: 16 }} />
          <input type="number" placeholder="Reorder @ ≤" value={ingredientForm.reorder_threshold}
            onChange={e => setIngredientForm({...ingredientForm, reorder_threshold:e.target.value})} style={{ fontSize: 16 }} />
          <Button onClick={saveIngredient}>
            {editingIngredient ? 'Update' : 'Add'} Ingredient
          </Button>
        </div>

        {loading ? (
          <div>Loading ingredients…</div>
        ) : (
          <div className="table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Name</th><th>Unit</th><th>Stock</th><th>Reorder Threshold</th><th>Low Stock</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(i => (
                  <tr key={i.id} className={i.low_stock ? 'low-stock' : ''}>
                    <td>{i.name}</td>
                    <td>{i.unit}</td>
                    <td>{i.current_stock}</td>
                    <td>{i.reorder_threshold}</td>
                    <td>{i.low_stock ? '⚠️' : ''}</td>
                    <td className="actions">
                      <button onClick={() => startEdit(i)}>Edit</button>
                      <button onClick={() => deleteIngredient(i.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recipes Section */}
      <section>
        <h2>Recipes</h2>
        <div className="recipes-list">
          {menuItems.map(mi => {
            const rec = recipes.find(r => r.menu_item_id === mi.id)
            return (
              <div key={mi.id} className="recipe-card">
                <strong style={{ overflowWrap: 'anywhere' }}>{mi.name}</strong>
                <div className="muted" style={{ margin: '6px 0' }}>
                  {rec?.recipe_items?.length
                    ? rec.recipe_items.map(ri => (
                        <div key={`${ri.ingredient_id}-${ri.quantity}`}>{ri.quantity} × {ri.ingredients?.name || '—'}</div>
                      ))
                    : <em>No recipe</em>}
                </div>
                <Button onClick={() => openRecipe(rec)}>Edit Recipe</Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recipe Editor Modal */}
      {showRecipeEditor && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setShowRecipeEditor(false)}>
          <div className="modal-content">
            <h3>Edit Recipe</h3>

            <select value={recipeForm.menu_item_id}
              onChange={e => setRecipeForm({...recipeForm, menu_item_id: e.target.value})} style={{ fontSize: 16 }}>
              <option value="">Select Menu Item</option>
              {menuItems.map(mi => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
            </select>

            {recipeForm.items.map((it, idx) => (
              <div key={idx} className="form-row">
                <select value={it.ingredient_id}
                  onChange={e => changeRecipe(idx, 'ingredient_id', e.target.value)} style={{ fontSize: 16 }}>
                  <option value="">Select Ingredient</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
                <input type="number" placeholder="Qty per item" value={it.quantity}
                  onChange={e => changeRecipe(idx, 'quantity', e.target.value)} style={{ fontSize: 16 }} />
                <button onClick={() => removeRecipeItem(idx)}>Remove</button>
              </div>
            ))}

            <Button onClick={addRecipeItem}>Add Ingredient</Button>

            <div className="modal-actions">
              <Button onClick={saveRecipe}>Save Recipe</Button>
              <Button variant="secondary" onClick={() => setShowRecipeEditor(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inventory-page { max-width: 1200px; margin: auto; padding: 16px 8px 32px; }
        section { margin-bottom: 24px; }
        .form-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        input, select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
        .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .inventory-table { width: 100%; border-collapse: collapse; background: #fff; }
        .inventory-table th, .inventory-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        .inventory-table th { background: #f9fafb; position: sticky; top: 0; z-index: 1; }
        .inventory-table .actions { white-space: nowrap; }
        .low-stock { background: #fef2f2; }
        .recipes-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 12px; }
        .recipe-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; display: grid; gap: 8px; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; padding: 12px; }
        .modal-content { background: #fff; padding: 16px; border-radius: 8px; width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; }
        .modal-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; justify-content: flex-end; }
        @media (max-width: 560px) {
          .inventory-table th, .inventory-table td { padding: 8px 6px; font-size: 14px; }
        }
      `}</style>
    </div>
  )
}
