// src/components/UpcomingTasks.tsx

import React, { useState, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

// Define the interface locally to avoid circular dependencies
interface Task {
    id: string;
    assetName?: string;
    taskDescription: string;
    status: string;
    dueDate: Timestamp;
    frequency?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
}

interface UpcomingTasksProps {
  allTasks: Task[];
}

export function UpcomingTasks({ allTasks }: UpcomingTasksProps) {
  const [filter, setFilter] = useState('next7days');

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const upcoming = allTasks
      .filter(task => task.status === 'Pending' && task.dueDate.toDate() >= now)
      .sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);

    if (filter === 'weekly') {
      return upcoming.filter(task => task.frequency === 'Weekly');
    }
    
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return upcoming.filter(task => task.dueDate.toDate() <= next7Days);

  }, [allTasks, filter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>A look at what's next on the schedule.</CardDescription>
            </div>
            <div className="w-[220px]">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select View" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="next7days">Due in Next 7 Days</SelectItem>
                        <SelectItem value="weekly">All Upcoming Weekly Tasks</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
          {filteredTasks.length > 0 ? (
            <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <div>
                    <p className="font-semibold">{task.taskDescription}</p>
                    <p className="text-sm text-muted-foreground">{task.assetName}</p>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{task.dueDate.toDate().toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-center text-gray-500 mt-6">No tasks match the selected view.</p>}
      </CardContent>
    </Card>
  );
}