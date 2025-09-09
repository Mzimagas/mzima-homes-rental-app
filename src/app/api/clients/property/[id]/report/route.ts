import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const propertyId = params.id

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify client has access to this property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, status')
      .eq('client_id', user.id)
      .eq('property_id', propertyId)
      .eq('status', 'ACTIVE')
      .single()

    if (interestError || !interest) {
      return NextResponse.json(
        { error: 'You do not have access to this property' },
        { status: 403 }
      )
    }

    // Get comprehensive property data
    const propertyData = await getPropertyReportData(supabase, propertyId, user.id)
    
    if (!propertyData) {
      return NextResponse.json(
        { error: 'Property data not found' },
        { status: 404 }
      )
    }

    // Generate PDF report
    const pdfBuffer = await generatePropertyReport(propertyData)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${propertyData.property.name}-progress-report.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('PDF report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function getPropertyReportData(supabase: any, propertyId: string, clientId: string) {
  try {
    // Get property details
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (!property) return null

    // Get client details
    const { data: client } = await supabase
      .from('enhanced_users')
      .select('full_name, email, phone')
      .eq('id', clientId)
      .single()

    // Get handover pipeline data
    const { data: handover } = await supabase
      .from('handover_pipeline')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    // Get property images
    const { data: images } = await supabase
      .from('property_images')
      .select('image_url, alt_text, is_primary')
      .eq('property_id', propertyId)
      .order('is_primary', { ascending: false })

    // Get acquisition costs
    const { data: costs } = await supabase
      .from('property_acquisition_costs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })

    // Get payment installments
    const { data: payments } = await supabase
      .from('property_payment_installments')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })

    return {
      property,
      client: client || { full_name: 'Unknown Client', email: '', phone: '' },
      handover: handover || null,
      images: images || [],
      costs: costs || [],
      payments: payments || [],
      generated_at: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error fetching property report data:', error)
    return null
  }
}

async function generatePropertyReport(data: any): Promise<Buffer> {
  const doc = new jsPDF()
  let yPosition = 20

  // Helper function to add text with automatic page breaks
  const addText = (text: string, x: number, y: number, options?: any) => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    doc.text(text, x, y, options)
    return y
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  yPosition = addText('Property Purchase Progress Report', 20, yPosition)
  yPosition += 10

  // Property Information
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  yPosition = addText('Property Information', 20, yPosition)
  yPosition += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  yPosition = addText(`Property Name: ${data.property.name}`, 20, yPosition)
  yPosition += 6
  yPosition = addText(`Location: ${data.property.location || 'Not specified'}`, 20, yPosition)
  yPosition += 6
  yPosition = addText(`Property Type: ${data.property.property_type || 'Not specified'}`, 20, yPosition)
  yPosition += 6
  yPosition = addText(`Purchase Price: ${formatCurrency(data.property.asking_price_kes || 0)}`, 20, yPosition)
  yPosition += 6
  if (data.property.size_sqm) {
    yPosition = addText(`Size: ${data.property.size_sqm} sqm`, 20, yPosition)
    yPosition += 6
  }
  yPosition += 5

  // Client Information
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  yPosition = addText('Client Information', 20, yPosition)
  yPosition += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  yPosition = addText(`Client Name: ${data.client.full_name}`, 20, yPosition)
  yPosition += 6
  yPosition = addText(`Email: ${data.client.email}`, 20, yPosition)
  yPosition += 6
  if (data.client.phone) {
    yPosition = addText(`Phone: ${data.client.phone}`, 20, yPosition)
    yPosition += 6
  }
  yPosition += 5

  // Handover Progress
  if (data.handover) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Handover Progress', 20, yPosition)
    yPosition += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    yPosition = addText(`Status: ${data.handover.handover_status}`, 20, yPosition)
    yPosition += 6
    yPosition = addText(`Current Stage: ${data.handover.current_stage}`, 20, yPosition)
    yPosition += 6
    yPosition = addText(`Overall Progress: ${data.handover.overall_progress || 0}%`, 20, yPosition)
    yPosition += 6
    yPosition = addText(`Started: ${new Date(data.handover.created_at).toLocaleDateString()}`, 20, yPosition)
    yPosition += 6
    if (data.handover.expected_completion_date) {
      yPosition = addText(`Expected Completion: ${new Date(data.handover.expected_completion_date).toLocaleDateString()}`, 20, yPosition)
      yPosition += 6
    }
    yPosition += 5

    // Pipeline Stages
    if (data.handover.pipeline_stages && data.handover.pipeline_stages.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      yPosition = addText('Pipeline Stages', 20, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const stageData = data.handover.pipeline_stages.map((stage: any) => [
        stage.name || 'Unnamed Stage',
        stage.status || 'Unknown',
        stage.completed ? 'Yes' : 'No',
        stage.started_at ? new Date(stage.started_at).toLocaleDateString() : 'Not started'
      ])

      ;(doc as any).autoTable({
        startY: yPosition,
        head: [['Stage', 'Status', 'Completed', 'Started']],
        body: stageData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }
  }

  // Financial Summary
  if (data.costs.length > 0 || data.payments.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Financial Summary', 20, yPosition)
    yPosition += 8

    const totalCosts = data.costs.reduce((sum: number, cost: any) => sum + (cost.amount_kes || 0), 0)
    const totalPayments = data.payments.reduce((sum: number, payment: any) => sum + (payment.amount_kes || 0), 0)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    yPosition = addText(`Total Costs: ${formatCurrency(totalCosts)}`, 20, yPosition)
    yPosition += 6
    yPosition = addText(`Total Payments: ${formatCurrency(totalPayments)}`, 20, yPosition)
    yPosition += 6
    yPosition = addText(`Balance: ${formatCurrency(totalPayments - totalCosts)}`, 20, yPosition)
    yPosition += 10

    // Costs Table
    if (data.costs.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      yPosition = addText('Acquisition Costs', 20, yPosition)
      yPosition += 5

      const costData = data.costs.map((cost: any) => [
        cost.cost_type_id || 'Unknown',
        formatCurrency(cost.amount_kes || 0),
        cost.payment_date ? new Date(cost.payment_date).toLocaleDateString() : 'Not set',
        cost.notes || ''
      ])

      ;(doc as any).autoTable({
        startY: yPosition,
        head: [['Type', 'Amount', 'Date', 'Notes']],
        body: costData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 53, 69] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    // Payments Table
    if (data.payments.length > 0) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      yPosition = addText('Payment Installments', 20, yPosition)
      yPosition += 5

      const paymentData = data.payments.map((payment: any) => [
        `Installment #${payment.installment_number || 'N/A'}`,
        formatCurrency(payment.amount_kes || 0),
        payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Not set',
        payment.notes || ''
      ])

      ;(doc as any).autoTable({
        startY: yPosition,
        head: [['Installment', 'Amount', 'Date', 'Notes']],
        body: paymentData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [40, 167, 69] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }
  }

  // Footer
  doc.addPage()
  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  doc.text('Report generated by Mzima Homes Property Management System', 20, 20)
  doc.text(`Generated on: ${new Date(data.generated_at).toLocaleString()}`, 20, 30)
  doc.text('This report contains confidential information. Please keep it secure.', 20, 40)

  return Buffer.from(doc.output('arraybuffer'))
}
