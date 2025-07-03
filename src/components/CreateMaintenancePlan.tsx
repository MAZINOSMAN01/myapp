import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { PlusCircle, Trash2 } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { Asset, Frequency, NewMaintenancePlan, MaintenancePlan } from './PreventiveMaintenance'

export interface CreateMaintenancePlanProps {
  isOpen: boolean
  onClose: () => void
  assets: Asset[]
  onPlanCreated: (plan: NewMaintenancePlan) => Promise<void>
  editingPlan?: MaintenancePlan
}

export function CreateMaintenancePlan({
  isOpen,
  onClose,
  assets,
  onPlanCreated,
  editingPlan,
}: CreateMaintenancePlanProps) {
  const [assetId, setAssetId] = useState<string>('')
  const [planName, setPlanName] = useState<string>('')
  const [frequency, setFrequency] = useState<Frequency>('Weekly')
  const [firstDue, setFirstDue] = useState<string>('')
  const [tasks, setTasks] = useState<string[]>([''])

  // When editing, populate the form
  useEffect(() => {
    if (editingPlan) {
      setAssetId(editingPlan.assetId)
      setPlanName(editingPlan.planName)
      setFrequency(editingPlan.frequency)
      setFirstDue(
        editingPlan.firstDueDate
          .toDate()
          .toISOString()
          .substring(0, 10)
      )
      setTasks([...editingPlan.tasks])
    } else {
      setAssetId('')
      setPlanName('')
      setFrequency('Weekly')
      setFirstDue('')
      setTasks([''])
    }
  }, [editingPlan])

  // whenever asset changes, default planName → first available type
  useEffect(() => {
    if (!editingPlan && assetId) {
      const a = assets.find((a) => a.id === assetId)
      if (a?.types?.length) {
        setPlanName(a.types[0])
      }
    }
  }, [assetId, assets, editingPlan])

  const handleSave = async () => {
    if (!assetId || !planName || !firstDue) {
      alert('Asset, plan name and first due date are required.')
      return
    }

    const newPlan: NewMaintenancePlan = {
      assetId,
      planName,
      frequency,
      firstDueDate: Timestamp.fromDate(new Date(firstDue)),
      tasks: tasks.filter((t) => t.trim()),
    }

    await onPlanCreated(newPlan)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger asChild>
        {/* not used; parent controls open */}
        <></>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'Edit PM Plan' : 'Create New PM Plan'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset / system */}
          <div>
            <Label>Asset / System</Label>
            <Select
              value={assetId}
              onValueChange={setAssetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an asset…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan name = the “type” */}
          <div>
            <Label>Plan Name (asset type)</Label>
            <Select
              value={planName}
              onValueChange={setPlanName}
              disabled={!assetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset first…" />
              </SelectTrigger>
              <SelectContent>
                {assets
                  .find((a) => a.id === assetId)
                  ?.types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency + first due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) =>
                  setFrequency(v as Frequency)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency…" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'Daily',
                      'Weekly',
                      'Monthly',
                      'Quarterly',
                      'Semi-annually',
                      'Annually',
                    ] as Frequency[]
                  ).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Task Due Date</Label>
              <Input
                type="date"
                value={firstDue}
                onChange={(e) => setFirstDue(e.target.value)}
              />
            </div>
          </div>

          {/* Task checklist */}
          <div className="space-y-2">
            <Label>Task Checklist</Label>
            {tasks.map((t, i) => (
              <div
                key={i}
                className="flex items-center space-x-2"
              >
                <Input
                  placeholder={`Task #${i + 1}`}
                  value={t}
                  onChange={(e) => {
                    const arr = [...tasks]
                    arr[i] = e.target.value
                    setTasks(arr)
                  }}
                />
                {tasks.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() =>
                      setTasks(tasks.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTasks([...tasks, ''])}
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Another Task
            </Button>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingPlan
              ? 'Save Changes'
              : 'Save Plan & Generate Tasks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
