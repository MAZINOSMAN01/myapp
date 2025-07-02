/******************************************************************
 *  CorrectiveMaintenanceLogger.tsx
 *  يُستخدم لتسجيل أعمال الصيانة التصحيحية (CM)
 *  آخر تحديث: أُضيف حقل systems إلى Props   ★
 ******************************************************************/

import React, { useState } from 'react';
import {
  Input
} from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, FilePlus } from 'lucide-react';

import { MaintenanceTask, User } from './MaintenanceManagement'; // تأكّد من المسار الصحيح

/* ---------------------------------------------------------------- */
/* واجهة الخصائص                                                    */
/* ---------------------------------------------------------------- */
interface Props {
  /** أنظمة الموقع (يُستخدم لاختيار النظام الذى حدثت فيه الصيانة) ★ */
  systems: { id: string; name: string }[];

  /** جميع المستخدمين (لاختيار الفنى أو المسؤول) */
  users: User[];

  /** حفظ السجل – يجب أن تُرجِع Promise<void> */
  onSave: (data: Partial<MaintenanceTask>) => Promise<void>;

  /** إغلاق النموذج */
  onClose: () => void;

  /** قيم افتراضية عند التعديل (اختيارى) */
  defaultValues?: Partial<MaintenanceTask>;
}

/* ---------------------------------------------------------------- */
/* المكوّن                                                           */
/* ---------------------------------------------------------------- */
const CorrectiveMaintenanceLogger: React.FC<Props> = ({
  systems,
  users,
  onSave,
  onClose,
  defaultValues
}) => {
  /* ------------------------ Local State ----------------------- */
  const [systemId, setSystemId] = useState(
    defaultValues?.systemId ?? (systems[0]?.id ?? '')
  );
  const [assetName, setAssetName] = useState(
    defaultValues?.assetName ?? ''
  );
  const [description, setDescription] = useState(
    defaultValues?.notes ?? ''
  );
  const [cost, setCost] = useState(
    defaultValues?.estimatedCost?.toString() ?? ''
  );
  const [assignedTo, setAssignedTo] = useState(
    defaultValues?.assignedTo ?? (users[0]?.id ?? '')
  );
  const [isSaving, setIsSaving] = useState(false);

  /* ------------------------ Handlers -------------------------- */
  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('Please enter a description of the corrective work.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        systemId,
        maintenanceType: 'CM',
        taskName: assetName,
        notes: description,
        estimatedCost: parseFloat(cost || '0'),
        assignedTo,
        status: 'Completed'
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save the corrective maintenance log.');
    } finally {
      setIsSaving(false);
    }
  };

  /* -------------------------- UI ------------------------------ */
  return (
    <div className="space-y-6">
      {/* نظام الصيانة */}
      <div>
        <label className="block font-medium mb-1">System *</label>
        <Select value={systemId} onValueChange={setSystemId}>
          <SelectTrigger>
            <SelectValue placeholder="Select System" />
          </SelectTrigger>
          <SelectContent>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* اسم المعدة / الأصل (اختيارى) */}
      <div>
        <label className="block font-medium mb-1">Asset / Task Name</label>
        <Input
          placeholder="e.g. AHU-01 belt replacement"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
        />
      </div>

      {/* الوصف */}
      <div>
        <label className="block font-medium mb-1">Description *</label>
        <Textarea
          rows={4}
          placeholder="Describe what was fixed / replaced / adjusted…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* تكلفة تقديرية */}
      <div className="relative">
        <label className="block font-medium mb-1">Cost (SAR)</label>
        <DollarSign className="absolute left-3 top-10 h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          className="pl-8"
          placeholder="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>

      {/* المكلَّف */}
      <div>
        <label className="block font-medium mb-1">Performed By *</label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger>
            <SelectValue placeholder="Select Technician" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* أزرار */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <FilePlus className="h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save Log'}
        </Button>
      </div>
    </div>
  );
};

export default CorrectiveMaintenanceLogger;
