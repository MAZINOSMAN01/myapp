// src/components/MaintenanceCalendar.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Calendar as RBC, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { localizer } from '@/lib/localizer'
import { db } from '@/firebase/config'
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore'

import { TaskDialog } from './TaskDialog'
import { WorkOrderDialog } from './WorkOrderDialog'

/* ---------- أنواع ---------- */
type Status = 'Pending' | 'Completed' | 'Skipped'
type Task = {
  id: string
  assetId: string
  planId: string
  taskDescription: string
  status: Status
  dueDate: Timestamp
}
type Asset = { id: string; name: string }
type Plan  = { id: string; planName: string }

/* ---------- الألوان ---------- */
const statusColor: Record<Status, string> = {
  Pending: '#2563eb',
  Completed: '#16a34a',
  Skipped: '#dc2626',
}

const DragCalendar = withDragAndDrop(RBC as any)

export function MaintenanceCalendar() {
  /* بيانات Firestore */
  const [tasks,  setTasks]  = useState<Task[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [plans,  setPlans]  = useState<Plan[]>([])

  /* فلاتر */
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL')
  const [systemFilter, setSystemFilter] = useState<'ALL' | string>('ALL')
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)
  const [fromDate, setFromDate] = useState(startOfMonth.toISOString().split('T')[0])
  const [toDate,   setToDate]   = useState(endOfMonth.toISOString().split('T')[0])
 const systemOptions = useMemo(() => Array.from(new Set(assets.map(a => a.name))), [assets])
  /* حوار التفاصيل + حوار WO */
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newSlot, setNewSlot] = useState<null | { start: Date; end: Date }>(null)

  /* 1) الأصول */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'assets'), snap =>
      setAssets(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
    )
    return unsub
  }, [])

  /* 2) الخطط */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'maintenance_plans'), snap =>
      setPlans(snap.docs.map(d => ({ id: d.id, planName: (d.data() as any).planName }))),
    )
    return unsub
  }, [])

  /* 3) المهام */
  useEffect(() => {
    const fromTS = Timestamp.fromDate(new Date(fromDate))
    const toTS   = Timestamp.fromDate(new Date(new Date(toDate).setHours(23,59,59,999)))

    const q = query(
      collection(db, 'maintenance_tasks'),
      where('dueDate', '>=', fromTS),
      where('dueDate', '<=', toTS),
    )
    const unsub = onSnapshot(q, snap =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))),
    )
    return unsub
  }, [fromDate, toDate])

  /* 4) events بعد الفلاتر */
  const events = useMemo(() =>
    tasks
      .filter(t => (statusFilter === 'ALL' ? true : t.status === statusFilter))
      .  filter(t =>
        systemFilter === 'ALL'
          ? true
          : assets.find(a => a.id === t.assetId)?.name === systemFilter
      )
      .map(t => ({
        id: t.id,
        title: t.taskDescription,
        start: t.dueDate.toDate(),
        end:   t.dueDate.toDate(),
        allDay: true,
        resource: t,
       })), [tasks, statusFilter, systemFilter, assets])

  /* 5) لون الحدث */
  const eventPropGetter = (event: any) => ({
    style: {
      backgroundColor: statusColor[event.resource.status as Status],
      borderRadius: 6,
      color: '#fff',
      border: 'none',
      padding: '0 4px',
    },
  })

  /* 6) Drag & Drop لتعديل التاريخ */
  const handleEventDrop = async ({ event, start }: any) => {
    const task = event.resource as Task
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, dueDate: Timestamp.fromDate(start) } : t,
    ))
    await updateDoc(doc(db, 'maintenance_tasks', task.id), {
      dueDate: Timestamp.fromDate(start),
    })
  }

  /* Helpers لأسماء النظام والخطة */
  const assetName = (id: string) => assets.find(a => a.id === id)?.name ?? '—'
  const planName  = (id: string) => plans .find(p => p.id === id)?.planName ?? '—'

  /* JSX */
  return (
    <div className="space-y-4">
      {/* شريط الفلاتر (كما هو) */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col">
          <label className="font-medium mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="border p-2 rounded-md">
            <option value="ALL">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Skipped">Skipped</option>
          </select>
        </div>
        <div className="flex flex-col">
            <label className="font-medium mb-1">System</label>
          <select value={systemFilter} onChange={e => setSystemFilter(e.target.value)}
            className="border p-2 rounded-md min-w-[180px]">
            <option value="ALL">All Systems</option>
            {systemOptions.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="font-medium mb-1">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border p-2 rounded-md" />
        </div>
        <div className="flex flex-col">
          <label className="font-medium mb-1">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border p-2 rounded-md" />
        </div>
      </div>

      {/* التقويم */}
      <DndProvider backend={HTML5Backend}>
        <DragCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={['month','week','day','agenda']}
          style={{ height: '75vh' }}
          eventPropGetter={eventPropGetter}
          onEventDrop={handleEventDrop}
          draggableAccessor={() => true}
          selectable                    // ← يفعّل السحب/النقر لإنشاء slot
          onSelectSlot={slot => setNewSlot({ start: slot.start, end: slot.end })}
          onSelectEvent={e => setSelectedTask(e.resource as Task)}
        />
      </DndProvider>

      {/* حوار تفاصيل المهمة */}
      <TaskDialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        assetName={selectedTask ? assetName(selectedTask.assetId) : undefined}
        planName ={selectedTask ? planName (selectedTask.planId) : undefined}
      />

      {/* حوار إنشاء Work Order */}
      <WorkOrderDialog
        open={!!newSlot}
        onClose={() => setNewSlot(null)}
        slot={newSlot}
        assets={assets}
      />
    </div>
  )
}
