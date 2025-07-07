import React from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DocumentData, Timestamp } from 'firebase/firestore'; // Import Timestamp

// Helper functions for styling remain the same
const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-800";
    case "In Progress": return "bg-blue-100 text-blue-800";
    case "Pending": return "bg-yellow-100 text-yellow-800";
    case "Scheduled": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High": return "bg-red-100 text-red-800";
    case "Medium": return "bg-orange-100 text-orange-800";
    case "Low": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export function WorkOrderSummaryReport({ data: workOrders }: { data: DocumentData[] }) {

  const handleDownloadCSV = () => {
    if (workOrders.length === 0) {
      alert("No data to download.");
      return;
    }
    
    // Format the data for CSV export
    const dataToExport = workOrders.map(order => {
        const assignedToText = Array.isArray(order.assignedTo) ? order.assignedTo.join(', ') : order.assignedTo;
        
        return {
            title: order.title,
            status: order.status,
            priority: order.priority,
            assignedTo: assignedToText,
            // Ensure dueDate is correctly formatted
            dueDate: order.dueDate && order.dueDate.toDate ? order.dueDate.toDate().toLocaleDateString('en-US') : 'Not set'
        };
    });

    const csv = Papa.unparse(dataToExport, {
        columns: ['title', 'status', 'priority', 'assignedTo', 'dueDate'],
        header: true,
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); // Removed BOM for standard CSV
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = `work_order_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to format the date
  const formatDate = (date: any) => {
    if (date && date instanceof Timestamp) {
      return date.toDate().toLocaleDateString('en-US'); // US date format
    }
    if(date && typeof date === 'string') {
        return new Date(date).toLocaleDateString('en-US');
    }
    return 'Not set'; // Default value
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Work Order Summary</CardTitle>
        <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
          <Download className="h-4 w-4 mr-2" />
          Download as CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length > 0 ? (
                workOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.title}</TableCell>
                    <TableCell><Badge className={`${getStatusColor(order.status)} hover:bg-opacity-80`}>{order.status}</Badge></TableCell>
                    <TableCell><Badge className={`${getPriorityColor(order.priority)} hover:bg-opacity-80`}>{order.priority}</Badge></TableCell>
                    {/* Handle array or string for assignedTo */}
                    <TableCell>{Array.isArray(order.assignedTo) ? order.assignedTo.join(', ') : order.assignedTo}</TableCell>
                    {/* Use the helper function to display the date */}
                    <TableCell>{formatDate(order.dueDate)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center">No work orders found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}