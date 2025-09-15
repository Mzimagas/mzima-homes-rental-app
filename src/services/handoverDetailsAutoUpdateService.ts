/**
 * Handover Details Auto-Update Service
 * Automatically updates handover pipeline details when clients submit
 * agreement signatures, deposit payments, and other client portal data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface ClientSubmissionData {
  propertyId: string
  clientId: string
  interestId?: string
  // Agreement data
  agreementSigned?: boolean
  agreementSignedAt?: string
  signature?: string
  // Deposit data
  depositAmount?: number
  depositPaidAt?: string
  paymentReference?: string
  paymentMethod?: string
  // Client details
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
}

export interface HandoverUpdateResult {
  success: boolean
  handoverId?: string
  updatedFields?: string[]
  error?: string
  message?: string
}

/**
 * Auto-update handover pipeline details from client portal submissions
 */
export async function autoUpdateHandoverDetails(
  submissionData: ClientSubmissionData
): Promise<HandoverUpdateResult> {
  try {
    console.log('🔄 Auto-updating handover details:', {
      propertyId: submissionData.propertyId,
      clientId: submissionData.clientId,
      hasAgreement: !!submissionData.agreementSigned,
      hasDeposit: !!submissionData.depositAmount,
    })

    const supabase = createClient(supabaseUrl, serviceKey)

    // Find existing handover pipeline record
    const { data: handover, error: handoverError } = await supabase
      .from('handover_pipeline')
      .select('*')
      .eq('property_id', submissionData.propertyId)
      .single()

    if (handoverError || !handover) {
      console.log('❌ No handover pipeline record found for property:', submissionData.propertyId)
      return {
        success: false,
        error: 'Handover pipeline record not found',
        message: 'Cannot update handover details - no pipeline record exists'
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    const updatedFields: string[] = []

    // Update client details if provided
    if (submissionData.clientName && submissionData.clientName !== handover.buyer_name) {
      updateData.buyer_name = submissionData.clientName
      updatedFields.push('buyer_name')
    }

    if (submissionData.clientEmail && submissionData.clientEmail !== handover.buyer_email) {
      updateData.buyer_email = submissionData.clientEmail
      updatedFields.push('buyer_email')
    }

    if (submissionData.clientPhone && submissionData.clientPhone !== handover.buyer_contact) {
      updateData.buyer_contact = submissionData.clientPhone
      updatedFields.push('buyer_contact')
    }

    if (submissionData.clientAddress && submissionData.clientAddress !== handover.buyer_address) {
      updateData.buyer_address = submissionData.clientAddress
      updatedFields.push('buyer_address')
    }

    // Update agreement details if provided
    if (submissionData.agreementSigned && submissionData.agreementSignedAt) {
      updateData.agreement_signed_at = submissionData.agreementSignedAt
      updatedFields.push('agreement_signed_at')

      if (submissionData.signature) {
        updateData.agreement_signature = submissionData.signature
        updatedFields.push('agreement_signature')
      }

      // Update legal status
      updateData.legal_representative = updateData.legal_representative || 'Agreement signed - legal processing'
      updatedFields.push('legal_representative')
    }

    // Update deposit details if provided
    if (submissionData.depositAmount && submissionData.depositAmount > 0) {
      // Only update if new deposit amount is different or higher
      if (!handover.deposit_received_kes || submissionData.depositAmount > handover.deposit_received_kes) {
        updateData.deposit_received_kes = submissionData.depositAmount
        updatedFields.push('deposit_received_kes')
      }

      if (submissionData.depositPaidAt) {
        updateData.deposit_paid_at = submissionData.depositPaidAt
        updatedFields.push('deposit_paid_at')
      }

      if (submissionData.paymentReference) {
        updateData.payment_reference = submissionData.paymentReference
        updatedFields.push('payment_reference')
      }

      if (submissionData.paymentMethod) {
        updateData.payment_method = submissionData.paymentMethod
        updatedFields.push('payment_method')
      }
    }

    // Only update if there are changes
    if (updatedFields.length === 0) {
      console.log('✅ No handover details need updating - all data is current')
      return {
        success: true,
        handoverId: handover.id,
        updatedFields: [],
        message: 'Handover details are already up to date'
      }
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from('handover_pipeline')
      .update(updateData)
      .eq('id', handover.id)

    if (updateError) {
      console.error('❌ Failed to update handover details:', updateError)
      return {
        success: false,
        error: updateError.message,
        message: 'Failed to update handover pipeline details'
      }
    }

    console.log('✅ Handover details updated successfully:', {
      handoverId: handover.id,
      updatedFields,
    })

    return {
      success: true,
      handoverId: handover.id,
      updatedFields,
      message: `Updated handover details: ${updatedFields.join(', ')}`
    }

  } catch (error) {
    console.error('❌ Auto-update handover details error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to auto-update handover details'
    }
  }
}

/**
 * Extract client data from client portal submission for handover updates
 */
export function extractClientDataForHandover(
  clientRecord: any,
  interestRecord: any,
  submissionType: 'agreement' | 'deposit',
  additionalData?: any
): ClientSubmissionData {
  const baseData: ClientSubmissionData = {
    propertyId: interestRecord.property_id,
    clientId: clientRecord.id,
    interestId: interestRecord.id,
    clientName: clientRecord.full_name,
    clientEmail: clientRecord.email,
    clientPhone: clientRecord.phone,
    clientAddress: clientRecord.address,
  }

  if (submissionType === 'agreement' && additionalData) {
    return {
      ...baseData,
      agreementSigned: true,
      agreementSignedAt: additionalData.signedAt || new Date().toISOString(),
      signature: additionalData.signature,
    }
  }

  if (submissionType === 'deposit' && additionalData) {
    return {
      ...baseData,
      depositAmount: additionalData.amount,
      depositPaidAt: additionalData.paidAt || new Date().toISOString(),
      paymentReference: additionalData.paymentReference,
      paymentMethod: additionalData.paymentMethod,
    }
  }

  return baseData
}

/**
 * Auto-update handover details when agreement is signed
 */
export async function onAgreementSignedUpdateHandover(
  clientRecord: any,
  interestRecord: any,
  signatureData: any
): Promise<HandoverUpdateResult> {
  const submissionData = extractClientDataForHandover(
    clientRecord,
    interestRecord,
    'agreement',
    signatureData
  )

  return autoUpdateHandoverDetails(submissionData)
}

/**
 * Auto-update handover details when deposit is paid
 */
export async function onDepositPaidUpdateHandover(
  clientRecord: any,
  interestRecord: any,
  depositData: any
): Promise<HandoverUpdateResult> {
  const submissionData = extractClientDataForHandover(
    clientRecord,
    interestRecord,
    'deposit',
    depositData
  )

  return autoUpdateHandoverDetails(submissionData)
}
