// src/components/SystemReportView.tsx

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// --- Interfaces to define data shapes ---
interface MaintenanceTask {
  id: string;
  taskName?: string;
  frequency?: string;
  progress?: { [key: string]: boolean[] };
  [key: string]: any;
}

interface SystemReportViewProps {
  tasks: MaintenanceTask[];
  systems: { id: string, name: string }[];
  selectedSystem: string;
  onSystemChange: (systemId: string) => void;
}


// --- Helper function to render progress checkboxes ---
const renderProgressTracker = (task: MaintenanceTask) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const yearMonthKey = `${currentYear}-${currentMonth}`;
  
  const progressData = task.progress?.[yearMonthKey] || [];

  switch (task.frequency) {
    case 'Weekly':
      return <div className="text-sm text-gray-500">Weekly task - status updated directly.</div>;
    
    case 'Monthly':
      return (
        <div className="flex items-center gap-4 pt-2">
          <Label>Weeks:</Label>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox id={`${task.id}-w${i+1}`} checked={progressData[i] || false} />
              <Label htmlFor={`${task.id}-w${i+1}`}>W{i+1}</Label>
            </div>
          ))}
        </div>
      );
      
    case 'Quarterly':
    case 'Semi-Annual':
    case 'Annual':
       // A more advanced timeline can be added here later
      return <div className="text-sm text-gray-500">Progress for long-term tasks is tracked via status.</div>;

    case 'One-Off':
       return <div className="text-sm text-gray-500">One-Off task, no progress tracking needed.</div>;

    default:
      return null;
  }
};


// --- Main Component ---
export function SystemReportView({ tasks, systems, selectedSystem, onSystemChange }: SystemReportViewProps) {
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => {
    if (t.frequency === 'Monthly') {
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const yearMonthKey = `${currentYear}-${currentMonth}`;
      const progressData = t.progress?.[yearMonthKey] || [];
      return progressData.every(p => p === true);
    }
    return t.status === 'Completed';
  }).length;
  
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label htmlFor="system-select" className="font-semibold">Select a System to Report:</Label>
        <Select value={selectedSystem} onValueChange={onSystemChange}>
            <SelectTrigger id="system-select" className="w-[300px]">
                <SelectValue placeholder="Select System" />
            </SelectTrigger>
            <SelectContent>
                {systems.map(sys => <SelectItem key={sys.id} value={sys.name}>{sys.name}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report for: {selectedSystem}</CardTitle>
          <div className="flex items-center gap-4 pt-2">
            <Label className="text-sm">Overall Completion:</Label>
            <Progress value={completionPercentage} className="w-1/2" />
            <span className="text-sm font-bold">{Math.round(completionPercentage)}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {tasks.map(task => (
              <AccordionItem key={task.id} value={task.id}>
                <AccordionTrigger>{task.taskName}</AccordionTrigger>
                <AccordionContent>
                  {renderProgressTracker(task)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}