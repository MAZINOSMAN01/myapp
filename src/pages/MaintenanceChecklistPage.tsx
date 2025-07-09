import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { MaintenancePlan } from '@/types/maintenance'
import { MaintenanceChecklist } from '@/components/MaintenanceChecklist'
import { Button } from '@/components/ui/button'

export default function MaintenanceChecklistPage() {
  const { planId } = useParams<{ planId: string }>()
  const [plan, setPlan] = useState<MaintenancePlan | null>(null)

  useEffect(() => {
    if (!planId) return
    getDoc(doc(db, 'maintenance_plans', planId)).then(d => {
      if (d.exists()) {
        setPlan({ id: d.id, ...(d.data() as any) } as MaintenancePlan)
      }
    })
  }, [planId])

  if (!plan) return <div className="p-4">Loading...</div>

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{plan.planName}</h1>
        <Button asChild variant="outline">
          <Link to="/maintenance-management">Back</Link>
        </Button>
      </div>
      <MaintenanceChecklist plan={plan} />
    </div>
  )
}