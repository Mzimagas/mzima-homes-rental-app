import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase, getServiceSupabase } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Processing deposit payment...')

    const supabase = await getServerSupabase()

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get client data - first try from clients table, create if doesn't exist
    let client: any = null;
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('auth_user_id', user.id)
      .single()

    if (clientRecord) {
      client = clientRecord;
    } else {
      // Create client record if it doesn't exist
      console.log('No client record found, creating one for user:', user.id);
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([{
          auth_user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          phone: user.user_metadata?.phone || null,
          registration_source: 'marketplace',
          status: 'ACTIVE',
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false
        }])
        .select('id, full_name, email, phone')
        .single();

      if (createError) {
        console.error('Failed to create client record:', createError);
        return NextResponse.json({ error: 'Failed to create client profile' }, { status: 500 });
      }

      client = newClient;
    }

    // Parse request body
    const { propertyId, paymentMethod, phoneNumber, amount } = await request.json()

    if (!propertyId || !paymentMethod || amount === undefined || amount === null) {
      return NextResponse.json({
        error: 'Property ID, payment method, and amount are required'
      }, { status: 400 })
    }

    if (paymentMethod === 'mpesa' && !phoneNumber) {
      return NextResponse.json({
        error: 'Phone number is required for M-Pesa payments'
      }, { status: 400 })
    }

    // Validate deposit amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
    }

    console.log('Processing deposit:', { propertyId, amount, paymentMethod, clientId: client.id })

    // Get property details for validation
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, sale_price_kes, handover_price_agreement_kes, purchase_price_agreement_kes')
      .eq('id', propertyId)
      .single()

    console.log('Property lookup result:', { property, propertyError })

    if (propertyError || !property) {
      console.error('Property lookup error:', propertyError)
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check if client has a COMMITTED interest with signed agreement for this property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, property_id, status, notes')
      .eq('client_id', client.id)
      .eq('property_id', propertyId)
      .eq('status', 'COMMITTED')
      .maybeSingle()

    if (interestError) {
      console.error('Interest lookup error:', interestError)
      return NextResponse.json({ error: 'Failed to check reservation' }, { status: 500 })
    }

    if (!interest) {
      return NextResponse.json(
        { error: 'Property not reserved by this client' },
        { status: 403 }
      )
    }

    // Check if agreement was signed (COMMITTED status means agreement is signed)
    // Since we already filtered for COMMITTED status above, if we have an interest, agreement is signed
    console.log('Interest status:', interest.status, 'notes:', interest.notes)

    // COMMITTED status indicates the agreement has been signed
    // No need to check notes field since status is the source of truth

    // Validate deposit amount (should be 10% of property price)
    // Use same price logic as public properties API
    const propertyPrice = property.handover_price_agreement_kes || property.purchase_price_agreement_kes || property.sale_price_kes || 0
    const expectedDeposit = propertyPrice * 0.1

    console.log('Deposit validation:', {
      propertyPrice,
      expectedDeposit,
      providedAmount: amount,
      difference: Math.abs(amount - expectedDeposit)
    })

    if (Math.abs(amount - expectedDeposit) > 1) { // Allow for small rounding differences
      console.log('Deposit amount validation failed')
      return NextResponse.json({
        error: `Invalid deposit amount. Expected: KES ${expectedDeposit.toLocaleString()}`
      }, { status: 400 })
    }

    // Generate payment reference
    const paymentReference = `DEP-${propertyId.slice(-6)}-${client.id.slice(-6)}-${Date.now()}`

    // Create payment data
    const paymentData = {
      propertyId,
      clientId: client.id,
      amount,
      paymentMethod,
      phoneNumber: paymentMethod === 'mpesa' ? phoneNumber : null,
      reference: paymentReference,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      propertyPrice,
      depositPercentage: 10
    }

    // TODO: Integrate with actual payment gateway
    // For now, simulate payment processing
    let paymentResult
    if (paymentMethod === 'mpesa') {
      // Simulate M-Pesa STK push
      paymentResult = {
        success: true,
        transactionId: `MP${Date.now()}`,
        status: 'COMPLETED',
        message: 'M-Pesa payment completed successfully'
      }
    } else if (paymentMethod === 'bank') {
      // Bank transfer requires manual verification
      paymentResult = {
        success: true,
        transactionId: `BT${Date.now()}`,
        status: 'PENDING_VERIFICATION',
        message: 'Bank transfer initiated. Awaiting verification.'
      }
    }

    // Update payment status based on result
    paymentData.status = paymentResult.status
    paymentData.transactionId = paymentResult.transactionId

    // Start transaction: Update interest with payment data
    try {
      // 1. Update interest with payment information
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          deposit_amount_kes: amount,
          deposit_paid_at: (paymentResult.status === 'COMPLETED' || paymentResult.status === 'PENDING_VERIFICATION') ? new Date().toISOString() : null,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_data: paymentData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', interest.id)

      if (interestUpdateError) {
        throw new Error(`Failed to update interest: ${interestUpdateError.message}`)
      }

      // 2. Create payment installment record for admin portal tracking using service role
      if (paymentResult.status === 'COMPLETED' || paymentResult.status === 'PENDING_VERIFICATION') {
        const adminSupabase = getServiceSupabase()

        // Get the next installment number for this property
        const { data: lastPayment } = await adminSupabase
          .from('property_payment_installments')
          .select('installment_number')
          .eq('property_id', propertyId)
          .order('installment_number', { ascending: false })
          .limit(1)
          .single()

        const nextInstallmentNumber = (lastPayment?.installment_number || 0) + 1

        // Create payment installment record using service role to bypass RLS
        const { error: paymentInstallmentError } = await adminSupabase
          .from('property_payment_installments')
          .insert({
            property_id: propertyId,
            installment_number: nextInstallmentNumber,
            amount_kes: amount,
            payment_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
            payment_reference: paymentReference,
            payment_method: paymentMethod === 'mpesa' ? 'MOBILE_MONEY' : 'BANK_TRANSFER',
            notes: `Deposit payment from client portal - ${client.full_name || client.email}`,
            created_by: user.id,
          })

        if (paymentInstallmentError) {
          console.error('Failed to create payment installment record:', paymentInstallmentError)
          // Don't fail the transaction, but log the error
        } else {
          console.log('✅ Payment installment record created for admin portal')
        }

        // Update property status to move to handover
        const { error: propertyUpdateError } = await supabase
          .from('properties')
          .update({
            handover_status: 'IN_PROGRESS', // Move from AWAITING_START to IN_PROGRESS
            updated_at: new Date().toISOString(),
          })
          .eq('id', propertyId)

        if (propertyUpdateError) {
          console.warn('Property update failed:', propertyUpdateError)
          // Don't fail the transaction for property update issues
        }

        // Update client interest status to CONVERTED (payment completed)
        const { error: statusUpdateError } = await supabase
          .from('client_property_interests')
          .update({
            status: 'CONVERTED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', interest.id)

        if (statusUpdateError) {
          console.warn('Interest status update failed:', statusUpdateError)
        }

        // TODO: Create handover pipeline record
        // TODO: Send notifications to client and admin
      }

      console.log('✅ Deposit payment processed successfully')

      return NextResponse.json({
        success: true,
        payment: paymentData,
        paymentResult,
        message: paymentResult.message,
        nextSteps: (paymentResult.status === 'COMPLETED' || paymentResult.status === 'PENDING_VERIFICATION')
          ? 'Your deposit has been processed. The property will now move to My Properties and handover process will begin.'
          : 'Your payment is being processed. You will receive confirmation once verified.'
      })
    } catch (error) {
      console.error('Transaction error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to process deposit' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Deposit processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
