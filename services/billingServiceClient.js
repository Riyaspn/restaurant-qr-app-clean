// services/billingServiceClient.js
import { supabase } from '../services/supabase'

export class BillingServiceClient {
  static async getBillsByDateRange(restaurantId, startDate, endDate) {
    try {
      console.log('Fetching bills for:', { restaurantId, startDate, endDate })
      
      const { data, error } = await supabase
        .from('bills')
        .select('*, orders(table_number)')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Billing query error:', error)
        throw error
      }
      
      console.log('Bills fetched:', data)
      return data || []
    } catch (error) {
      console.error('getBillsByDateRange error:', error)
      throw error
    }
  }

  static groupByPaymentMethod(bills) {
    return bills.reduce((acc, bill) => {
      const method = bill.payment_method || 'unknown'
      if (!acc[method]) acc[method] = { count: 0, amount: 0 }
      acc[method].count += 1
      acc[method].amount += Number(bill.amount || bill.grand_total || 0)
      return acc
    }, {})
  }
}
