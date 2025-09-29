export async function signOutAndRedirect(supabase, pushOrReplace) {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  // prefer replace to avoid back button returning to protected page
  pushOrReplace('/login')
}
