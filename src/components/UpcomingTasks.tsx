import React, { useState, useMemo } from 'react';
import { MaintenanceTask } from './MaintenanceManagement';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Filter } from "lucide-react";

interface UpcomingTasksProps {
  tasks: MaintenanceTask[];
  systems: { id: string, name: string }[];
  maintenanceTypes: { id: string, name: string }[];
}

// دالة حساب التواريخ المستقبلية
const generateUpcomingOccurrences = (tasks: MaintenanceTask[]): MaintenanceTask[] => {
  const upcomingTasks: MaintenanceTask[] = [];
  const now = new Date();
  
  tasks.forEach(task => {
    if (task.frequency === 'One-Off' || !task.nextDueDate) {
      return;
    }
    
    let nextDate = new Date(task.nextDueDate);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    while (nextDate <= oneYearFromNow) {
      if (nextDate > now) {
        upcomingTasks.push({
          ...task,
          id: `${task.id}-${nextDate.toISOString()}`, 
          displayDueDate: nextDate.toISOString().split('T')[0],
        });
      }
      
      switch (task.frequency) {
        case 'Weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'Semi-Annual': nextDate.setMonth(nextDate.getMonth() + 6); break;
        case 'Annual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        default: return;
      }
    }
  });

  return upcomingTasks.sort((a, b) => 
    new Date(a.displayDueDate!).getTime() - new Date(b.displayDueDate!).getTime()
  );
};


export function UpcomingTasks({ tasks, systems, maintenanceTypes }: UpcomingTasksProps) {
  const [systemFilter, setSystemFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');

  const filteredTasks = useMemo(() => {
    // لا تقم بالفلترة إذا لم يتم تحديد النظام
    if (systemFilter === 'all') return [];

    return tasks.filter(task => {
      const systemMatch = task.systemId === systemFilter;
      const frequencyMatch = frequencyFilter === 'all' || task.frequency === frequencyFilter;
      return systemMatch && frequencyMatch;
    });
  }, [tasks, systemFilter, frequencyFilter]);

  const allUpcoming = generateUpcomingOccurrences(filteredTasks);
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const tasksNextWeek = allUpcoming.filter(t => new Date(t.displayDueDate!) <= nextWeek);
  const tasksNextMonth = allUpcoming.filter(t => new Date(t.displayDueDate!) > nextWeek && new Date(t.displayDueDate!) <= nextMonth);
  const tasksFuture = allUpcoming.filter(t => new Date(t.displayDueDate!) > nextMonth);

  const renderTaskList = (taskList: MaintenanceTask[], title: string) => (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title} ({taskList.length})</h3>
      {taskList.length > 0 ? (
        <div className="space-y-2">
          {taskList.map(task => (
            <div key={task.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
              <span className="font-medium">{task.taskName} ({task.systemId})</span>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {task.displayDueDate}
              </span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-gray-500">No upcoming tasks match the current filters for this period.</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Maintenance Schedule</CardTitle>
        <div className="flex items-center gap-4 pt-4">
            <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by System" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">-- Select a System --</SelectItem>
                    {systems.map(sys => <SelectItem key={sys.id} value={sys.name}>{sys.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter} disabled={systemFilter === 'all'}>
                <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by Frequency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    {['Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual'].map(freq => (
                        <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {systemFilter !== 'all' ? (
          <>
            {renderTaskList(tasksNextWeek, "Next 7 Days")}
            {renderTaskList(tasksNextMonth, "Next 30 Days")}
            {renderTaskList(tasksFuture, "Future Tasks")}
          </>
        ) : (
          <div className="text-center text-gray-500 p-8">
            <p>Please select a system to view its upcoming tasks.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}