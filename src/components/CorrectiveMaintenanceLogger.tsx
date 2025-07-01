import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MaintenanceTask, User } from './MaintenanceManagement';

/* ---------- Printable ---------- */
interface PrintableProps {
  logData: {
    systemId: string; subSystem: string; description: string;
    assignedTo: string; logDate: string; users: User[];
  };
}
const PrintableContent = React.forwardRef<HTMLDivElement, PrintableProps>(
  ({ logData }, ref) => {
    const { systemId, subSystem, description, assignedTo, logDate, users } = logData;
    const techName = users.find((u) => u.id === assignedTo)?.name ?? 'N/A';
    return (
      <div ref={ref} className="p-8 font-sans">
        <h1 className="text-2xl font-bold border-b pb-2 mb-6">Corrective Maintenance Report</h1>
        <div className="grid grid-cols-2 gap-4 text-base">
          <div><strong>Date:</strong> {logDate}</div>
          <div><strong>System:</strong> {systemId}</div>
          <div><strong>Sub-System:</strong> {subSystem || 'N/A'}</div>
          <div><strong>Technician:</strong> {techName}</div>
        </div>
        <div className="mt-6">
          <strong className="block border-b pb-1 mb-2">Description of Work</strong>
          <p className="whitespace-pre-wrap">{description}</p>
        </div>
        <div className="mt-12 text-center">
          <div className="inline-block border-t-2 pt-2 px-4">Technician’s Signature</div>
        </div>
      </div>
    );
  },
);
PrintableContent.displayName = 'PrintableContent';

/* ---------- Main ---------- */
interface Props {
  systems: { id: string; name: string }[];
  users: User[];
  onSave: (data: Partial<MaintenanceTask>) => Promise<void>;   // ← void
  onClose: () => void;
}

export const CorrectiveMaintenanceLogger: React.FC<Props> = ({
  systems, users, onSave, onClose,
}) => {
  const [systemId, setSystemId] = useState('');
  const [subSystem, setSubSystem] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const printRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    if (!systemId || !description.trim() || !assignedTo) {
      alert('Please fill all required fields.');
      throw new Error('validation-failed');
    }
    await onSave({
      systemId,
      taskName: `Corrective: ${subSystem || description.slice(0, 30)}`,
      maintenanceType: 'CM',
      frequency: 'One-Off',
      description: `Location/Sub-System: ${subSystem}\n\nDetails: ${description}`,
      assignedTo,
      status: 'Completed',
      nextDueDate: logDate,
    });
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current as HTMLDivElement,
    documentTitle: `Corrective-Maintenance-${systemId || 'NA'}-${logDate}`,
    onBeforeGetContent: handleSave,   // يحفظ أولاً
    onAfterPrint: onClose,
  });

  return (
    <div className="space-y-4">
      {/* منطقة الطباعة المخفيّة */}
      <div className="hidden">
        <PrintableContent
          ref={printRef}
          logData={{ systemId, subSystem, description, assignedTo, logDate, users }}
        />
      </div>

      {/* الحقول */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>System *</Label>
          <Select value={systemId} onValueChange={setSystemId}>
            <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
            <SelectContent>
              {systems.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Sub-System / Location (optional)</Label>
          <Input value={subSystem} onChange={e => setSubSystem(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Description of Work *</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Technician *</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date of Action</Label>
          <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
        </div>
      </div>

      {/* الأزرار */}
      <div className="flex justify-end pt-4 gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handlePrint}>Save &amp; Print Report</Button>
      </div>
    </div>
  );
};
