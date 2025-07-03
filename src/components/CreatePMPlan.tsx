// src/components/CreatePMPlan.tsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";

// ✅ التصحيح هنا: كل كومبوننت من ملفه المناسب
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

type Asset = {
  id: string;
  name: string;
  type: string;
  location: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPlanCreated?: () => void;
};

export function CreatePMPlan({ open, onOpenChange, onPlanCreated }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [taskList, setTaskList] = useState<string[]>([""]);
  const [frequency, setFrequency] = useState<
    "Weekly" | "Monthly" | "Quarterly" | "Semi-annually" | "Annually" | ""
  >("");
  const [firstDate, setFirstDate] = useState<string>("");

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "assets"));
      setAssets(
        snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Asset, "id">) }) as Asset
        )
      );
    }
    load();
  }, []);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const planName = selectedAsset ? selectedAsset.type : "";

  const addTaskField = () => setTaskList((l) => [...l, ""]);

  async function handleSave() {
    if (!selectedAsset || !frequency || !firstDate) {
      alert("اختر الأصل، التكرار، وتاريخ البدء.");
      return;
    }

    const slug =
      frequency.toLowerCase().split(" ")[0] + " " +
      selectedAsset.type.toLowerCase() + " " +
      selectedAsset.name;

    await addDoc(collection(db, "maintenance_plans"), {
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      assetType: selectedAsset.type,
      location: selectedAsset.location,
      planName,
      planSlug: slug,
      tasks: taskList.filter((t) => t.trim() !== ""),
      frequency,
      firstDueDate: Timestamp.fromDate(new Date(firstDate)),
      createdAt: Timestamp.now(),
    });

    onOpenChange(false);
    onPlanCreated?.();
    setSelectedAssetId("");
    setTaskList([""]);
    setFrequency("");
    setFirstDate("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New PM Plan</DialogTitle>
        </DialogHeader>

        {/* اختيار الأصل */}
        <div className="space-y-2">
          <Label>Asset / System</Label>
          <Select
            value={selectedAssetId}
            onValueChange={(v) => setSelectedAssetId(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an asset…" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} — {a.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plan Name */}
        <div className="space-y-2">
          <Label>Plan Name (auto)</Label>
          <Input value={planName} readOnly />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={selectedAsset?.location ?? ""} readOnly />
        </div>

        {/* Task Checklist */}
        <div className="space-y-2">
          <Label>Task Checklist</Label>
          {taskList.map((val, idx) => (
            <Input
              key={idx}
              placeholder={`Task #${idx + 1}`}
              value={val}
              onChange={(e) =>
                setTaskList((list) =>
                  list.map((v, i) => (i === idx ? e.target.value : v))
                )
              }
              className="mb-2"
            />
          ))}
          <Button variant="secondary" onClick={addTaskField}>
            + Add Another Task
          </Button>
        </div>

        {/* Frequency and First Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency…" />
              </SelectTrigger>
              <SelectContent>
                {["Weekly", "Monthly", "Quarterly", "Semi-annually", "Annually"].map(
                  (f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>First Task Due Date</Label>
            <div className="relative">
              <CalendarDays className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-8"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Plan &amp; Generate Tasks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
