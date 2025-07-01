// src/components/IssueLogReport.tsx

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function IssueLogReport({ data }: { data: any[] }) {
  const formatDate = (date: any) => !date?.seconds ? 'N/A' : new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  return (
    <Table>
      <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {data.map(issue => (
          <TableRow key={issue.id}>
            <TableCell>{issue.issueId}</TableCell>
            <TableCell>{formatDate(issue.dateReported)}</TableCell>
            <TableCell>{issue.issueDescription}</TableCell>
            <TableCell><Badge>{issue.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}