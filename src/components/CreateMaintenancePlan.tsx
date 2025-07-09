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
import { Timestamp, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { SpaceLocation } from "@/types/space-management";
import {
  type Asset,
  type AssetType,
  type NewMaintenancePlan,
  type MaintenancePlan,
  type Frequency,
} from "@/types/maintenance";
import { useToast } from "@/components/ui/use-toast";

/*───────────────────────────────────────────────────────────────
 * Interfaces & Types
 *──────────────────────────────────────────────────────────────*/


interface User {
  id: string;
  name: string;
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
  const [selectedType, setSelectedType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [spaceId, setSpaceId] = useState<string>("");
  const [spaces, setSpaces] = useState<SpaceLocation[]>([]);
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

  const availableTypes = useMemo(() => {
    if (!selectedSystem) return [] as { assetId: string; type: AssetType }[];
    return assets
      .filter((a) => a.name === selectedSystem)
      .flatMap((a) =>
        (a.types || []).map((t) => ({ assetId: a.id, type: t }))
      );
  }, [selectedSystem, assets]);

   const locationOptions = useMemo(() => {
    const fromAssets = assets.flatMap((a) => [
      a.location,
      ...(a.types?.map((t) => t.location).filter(Boolean) as string[] || [])
    ]);
    const fromSpaces = spaces.map((s) => s.displayName);
    return Array.from(new Set([...fromAssets, ...fromSpaces].filter(Boolean))).sort();
  }, [assets, spaces]);
  /*───────────────────────────
   * Helpers
   *──────────────────────────*/
  const resetForm = useCallback(() => {
    setSelectedSystem("");
    setAssetId("");
    setSelectedType("");
    setLocation("");
    setSpaceId("");
    setPlanName("");
    setFrequency("Weekly");
    setFirstDue("");
    setTasks([""]);
    setAssignedTo("unassigned");
  }, []);
  /*───────────────────────────
   * Load spaces for location selection
   *──────────────────────────*/
  useEffect(() => {
    getDocs(collection(db, 'space_locations'))
      .then((snap) => {
        setSpaces(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SpaceLocation[]
        );
      })
      .catch((err) => {
        console.error(err);
        toast({ title: 'Error', description: 'Failed loading spaces.', variant: 'destructive' });
      });
  }, [toast]);


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
      setSelectedType((editingPlan as any).assetType ?? "");
    const loc = (editingPlan as any).location ?? asset?.location ?? "";
    setLocation(loc);
    const spaceMatch = spaces.find((s) => s.displayName === loc);
    setSpaceId(spaceMatch ? spaceMatch.id : (editingPlan as any).spaceId ?? "");
    setPlanName(editingPlan.planName);
    setFrequency(editingPlan.frequency);
    setFirstDue(editingPlan.firstDueDate.toDate().toISOString().slice(0, 10));
    setTasks([...editingPlan.tasks]);
    setAssignedTo(editingPlan.assignedTo ?? "unassigned");
  }, [editingPlan, assets, spaces, resetForm]);

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
      assetType: selectedType || undefined,
      location: location || undefined,
      spaceId: spaceId || undefined,
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

           {/* Asset Type */}
          {selectedSystem && (
            <div>
              <Label>Asset Type</Label>
              <Select
                value={selectedType ? `${assetId}|${selectedType}` : ""}
                onValueChange={(val) => {
                  const [id, typeName] = val.split("|");
                  setAssetId(id);
                  setSelectedType(typeName);
                  const asset = assets.find((a) => a.id === id);
                  const t = asset?.types?.find((t) => t.name === typeName);
                  const loc = t?.location || asset?.location || "";
                  setLocation(loc);
                  const match = spaces.find((s) =>
                    t?.spaceId ? s.id === t.spaceId : s.displayName === loc
                  );
                  setSpaceId(match ? match.id : t?.spaceId || "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset type…" />
                </SelectTrigger>
                <SelectContent>
                   {availableTypes.map((opt, idx) => (
                    <SelectItem key={`${opt.assetId}-${idx}`} value={`${opt.assetId}|${opt.type.name}`}> 
                      {opt.type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

           {/* Location */}
          {(selectedType || locationOptions.length) && (
            <div>
              <Label>Location</Label>
              <Input
                list="pm-location-options"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  const match = spaces.find((s) => s.displayName === e.target.value);
                  setSpaceId(match ? match.id : "");
                }}
                placeholder="Select or type location"
              />
              <datalist id="pm-location-options">
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
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
