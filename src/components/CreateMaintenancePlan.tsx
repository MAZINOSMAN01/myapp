import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PlusCircle, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";

/*───────────────────────────────────────────────────────────────
 * Interfaces & Types
 *──────────────────────────────────────────────────────────────*/
interface AssetType {
  name: string;
  location?: string;
}

interface Asset {
  id: string;
  /** System name, e.g. "HVAC" */
  name: string;
  /** Optional nested types; kept for backward‑compat */
  types?: AssetType[];
  /** Primary location; authoritative */
  location?: string;
}

interface User {
  id: string;
  name: string;
}

type Frequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Semi-annually"
  | "Annually";

export interface NewMaintenancePlan {
  assetId: string;
  planName: string;
  frequency: Frequency;
  firstDueDate: Timestamp;
  tasks: string[];
  assignedTo?: string;
}

interface MaintenancePlan extends NewMaintenancePlan {
  id: string;
}

export interface CreateMaintenancePlanProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  users?: User[];
  onPlanCreated: (plan: NewMaintenancePlan) => Promise<void>;
  editingPlan?: MaintenancePlan;
}

/*───────────────────────────────────────────────────────────────
 * Component
 *──────────────────────────────────────────────────────────────*/
export function CreateMaintenancePlan({
  isOpen,
  onClose,
  assets,
  users = [],
  onPlanCreated,
  editingPlan,
}: CreateMaintenancePlanProps) {
  /*───────────────────────────
   * Local state
   *──────────────────────────*/
  const { toast } = useToast();
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [assetId, setAssetId] = useState<string>("");
  const [planName, setPlanName] = useState<string>("");
  const [frequency, setFrequency] = useState<Frequency>("Weekly");
  const [firstDue, setFirstDue] = useState<string>("");
  const [tasks, setTasks] = useState<string[]>([""]);
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");

  /*───────────────────────────
   * Derived data
   *──────────────────────────*/
  const systemOptions = useMemo(
    () => Array.from(new Set(assets.map((a) => a.name))).sort(),
    [assets]
  );

  const availableAssets = useMemo(() => {
    if (!selectedSystem) return [] as Asset[];
    return assets.filter((a) => a.name === selectedSystem);
  }, [selectedSystem, assets]);

  const selectedAsset = useMemo(
    () => availableAssets.find((a) => a.id === assetId),
    [availableAssets, assetId]
  );

  const assetLocation = useMemo(() => {
    if (!selectedAsset) return "";
    // 1) Prefer asset.location field
    if (selectedAsset.location?.trim()) return selectedAsset.location.trim();
    // 2) Fallback to first type with location
    const locFromType = selectedAsset.types?.find((t) => t.location)?.location;
    return locFromType ?? "";
  }, [selectedAsset]);

  /*───────────────────────────
   * Helpers
   *──────────────────────────*/
  const resetForm = useCallback(() => {
    setSelectedSystem("");
    setAssetId("");
    setPlanName("");
    setFrequency("Weekly");
    setFirstDue("");
    setTasks([""]);
    setAssignedTo("unassigned");
  }, []);

  /*───────────────────────────
   * Populate when editing
   *──────────────────────────*/
  useEffect(() => {
    if (!editingPlan) {
      resetForm();
      return;
    }
    const asset = assets.find((a) => a.id === editingPlan.assetId);
    setSelectedSystem(asset?.name ?? "");
    setAssetId(editingPlan.assetId);
    setPlanName(editingPlan.planName);
    setFrequency(editingPlan.frequency);
    setFirstDue(editingPlan.firstDueDate.toDate().toISOString().slice(0, 10));
    setTasks([...editingPlan.tasks]);
    setAssignedTo(editingPlan.assignedTo ?? "unassigned");
  }, [editingPlan, assets, resetForm]);

  /*───────────────────────────
   * Save handler
   *──────────────────────────*/
  const handleSave = async () => {
    if (!selectedSystem || !assetId || !planName || !firstDue) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields.",
        variant: "destructive",
      });
      return;
    }
    const cleanedTasks = tasks.map((t) => t.trim()).filter(Boolean);
    if (cleanedTasks.length === 0) {
      toast({
        title: "No Tasks Added",
        description: "Please add at least one task.",
        variant: "destructive",
      });
      return;
    }
    const newPlan: NewMaintenancePlan = {
      assetId,
      planName,
      frequency,
      firstDueDate: Timestamp.fromDate(new Date(firstDue)),
      tasks: cleanedTasks,
      assignedTo: assignedTo !== "unassigned" ? assignedTo : undefined,
    };
    try {
      await onPlanCreated(newPlan);
      onClose();
      resetForm();
    } catch (err) {
      console.error("Error saving plan", err);
      toast({
        title: "Save Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  /*───────────────────────────
   * JSX
   *──────────────────────────*/
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? "Edit Preventive Maintenance Plan" : "Create New PM Plan"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* System */}
          <div>
            <Label>System</Label>
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger>
                <SelectValue placeholder="Select a system…" />
              </SelectTrigger>
              <SelectContent>
                {systemOptions.map((sys) => (
                  <SelectItem key={sys} value={sys}>
                    {sys}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asset */}
          {selectedSystem && (
            <div>
              <Label>Asset</Label>
              <Select value={assetId} onValueChange={(v) => setAssetId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset…" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.id} — {a.location ?? a.types?.find((t) => t.location)?.location ?? "No location"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location (read‑only) */}
          {assetId && (
            <div>
              <Label>Location</Label>
              <Input value={assetLocation} readOnly className="bg-muted/50 cursor-not-allowed" />
            </div>
          )}

          {/* Plan Name */}
          <div>
            <Label>Plan Name</Label>
            <Input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Quarterly Check‑up"
            />
          </div>

          {/* Frequency */}
          <div>
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Daily",
                  "Weekly",
                  "Monthly",
                  "Quarterly",
                  "Semi-annually",
                  "Annually",
                ].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* First Due Date */}
          <div>
            <Label>First Due Date</Label>
            <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            <Label>Tasks</Label>
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t}
                  onChange={(e) =>
                    setTasks((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder={`Task #${i + 1}`}
                />
                {tasks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTasks((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setTasks((prev) => [...prev, ""]) }>
              <PlusCircle className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>

          {/* Assign To */}
          <div>
            <Label>Assigned To (optional)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave}>{editingPlan ? "Save Changes" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
