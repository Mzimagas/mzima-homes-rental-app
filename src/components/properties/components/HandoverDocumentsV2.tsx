'use client'

import DirectAdditionDocumentsV2 from './DirectAdditionDocumentsV2'

interface HandoverDocumentsV2Props {
  propertyId: string
  propertyName: string
}

export default function HandoverDocumentsV2({ propertyId, propertyName }: HandoverDocumentsV2Props) {
  // Mirror image of DirectAdditionDocumentsV2, with handover pipeline and stage filtering
  return (
    <DirectAdditionDocumentsV2
      propertyId={propertyId}
      propertyName={propertyName}
      pipeline="handover"
      stageFilter="stages_1_10"
    />
  )
}

