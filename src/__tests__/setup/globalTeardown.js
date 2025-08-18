// Global test teardown
const { createClient } = require('@supabase/supabase-js')

module.exports = async () => {
  console.log('Cleaning up test environment...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Clean up test data in reverse order of dependencies
    
    // Delete test receipts
    await supabase
      .from('receipts')
      .delete()
      .ilike('receipt_no', 'TEST%')
    
    // Delete test sale agreements
    await supabase
      .from('sale_agreements')
      .delete()
      .ilike('agreement_no', 'TEST%')
    
    // Delete test offers/reservations
    await supabase
      .from('offers_reservations')
      .delete()
      .eq('plots.plot_no', 'ilike', 'TEST%')
    
    // Delete test listings
    await supabase
      .from('listings')
      .delete()
      .eq('plots.plot_no', 'ilike', 'TEST%')
    
    // Delete test clients
    await supabase
      .from('clients')
      .delete()
      .ilike('full_name', '%Test%')
    
    // Delete test plots
    await supabase
      .from('plots')
      .delete()
      .ilike('plot_no', 'TEST%')
    
    // Delete test subdivisions
    await supabase
      .from('subdivisions')
      .delete()
      .eq('name', 'Test Subdivision')
    
    // Delete test parcels
    await supabase
      .from('parcels')
      .delete()
      .eq('lr_number', 'TEST/BLOCK1/001')
    
    console.log('Test data cleanup complete')
    
  } catch (error) {
    console.error('Test cleanup failed:', error)
    // Don't throw error to avoid failing the test suite
  }
}
