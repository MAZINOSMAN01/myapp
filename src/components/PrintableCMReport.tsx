// src/components/PrintableCMReport.tsx

import React from 'react';
import { MaintenanceTask, User } from './MaintenanceManagement';

interface PrintableCMReportProps {
  tasks: MaintenanceTask[];
  users: User[];
  system: string;
}

export const PrintableCMReport = React.forwardRef<HTMLDivElement, PrintableCMReportProps>(({ tasks, users, system }, ref) => {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div ref={ref} className="p-10 font-sans">
      <header className="flex justify-between items-center border-b-2 pb-4">
        <div>
          <h1 className="text-3xl font-bold">Corrective Maintenance Report</h1>
          <p className="text-gray-600">System: <span className="font-semibold">{system === 'all' ? 'All Systems' : system}</span></p>
        </div>
        <div className="text-right">
          <p className="text-sm">Report Generated On:</p>
          <p className="font-semibold">{today}</p>
        </div>
      </header>
      
      <main className="mt-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Task/Asset Name</th>
              <th className="p-2 border">System</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Assigned To</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Notes</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td className="p-2 border font-medium">{task.taskName || task.assetName}</td>
                <td className="p-2 border">{task.systemId}</td>
                <td className="p-2 border">{task.nextDueDate}</td>
                <td className="p-2 border">{users.find(u => u.id === task.assignedTo)?.name || task.assignedTo}</td>
                <td className="p-2 border">{task.status}</td>
                <td className="p-2 border max-w-xs whitespace-pre-wrap">{task.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No corrective maintenance tasks match the selected filters.</p>
        )}
      </main>

      <footer className="mt-16 pt-4 text-center text-xs text-gray-500 border-t">
        <p>Facility Flow Nexus - Confidential Report</p>
      </footer>
    </div>
  );
});