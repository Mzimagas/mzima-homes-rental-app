/**
 * Quick test to verify dashboard provides real value
 * Run this to see if your database has actual data
 */

const testDashboardValue = async () => {
  try {
    console.log('🔍 Testing Dashboard Value...\n')
    
    const response = await fetch('http://localhost:3001/api/batch/dashboard?include=properties,tenants,payments,stats')
    
    if (!response.ok) {
      console.log('❌ API Failed:', response.status, response.statusText)
      return false
    }
    
    const data = await response.json()
    
    console.log('📊 Raw Data Received:')
    console.log('Properties:', data.properties?.length || 0)
    console.log('Tenants:', data.tenants?.length || 0) 
    console.log('Payments:', data.payments?.length || 0)
    console.log('')
    
    // Calculate real value
    const hasProperties = data.properties && data.properties.length > 0
    const hasTenants = data.tenants && data.tenants.length > 0
    const hasPayments = data.payments && data.payments.length > 0
    
    if (!hasProperties && !hasTenants && !hasPayments) {
      console.log('❌ VERDICT: NO VALUE')
      console.log('   - No properties, tenants, or payments in database')
      console.log('   - Dashboard shows empty data')
      console.log('   - Time/credits were wasted on empty system')
      return false
    }
    
    if (hasProperties || hasTenants || hasPayments) {
      console.log('✅ VERDICT: HAS VALUE')
      console.log('   - Real data exists in your system')
      console.log('   - Dashboard provides actual business insights')
      console.log('   - Time/credits were well spent')
      
      if (hasProperties) {
        console.log(`   - Managing ${data.properties.length} properties`)
      }
      if (hasTenants) {
        console.log(`   - Tracking ${data.tenants.length} tenants`)
      }
      if (hasPayments) {
        console.log(`   - ${data.payments.length} payment records`)
      }
      
      return true
    }
    
  } catch (error) {
    console.log('❌ Test Failed:', error.message)
    return false
  }
}

// Run the test
testDashboardValue()
