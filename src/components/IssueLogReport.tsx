// src/components/IssueLogReport.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/config.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Issue {
  id: string;
  issueId: string;
  dateReported: any;
  equipmentType: string;
  issueDescription: string;
  status: string;
}

export function IssueLogReport() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "issue_logs"));
                const issuesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
                setIssues(issuesData);
            } catch (error) {
                console.error("Error fetching issue log for report:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchIssues();
    }, []);

    const formatDate = (date: any) => {
        if (!date?.seconds) return 'N/A';
        return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Issue ID</TableHead>
                    <TableHead>Date Reported</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center">Loading report...</TableCell></TableRow>
                ) : issues.length > 0 ? (
                    issues.map(issue => (
                        <TableRow key={issue.id}>
                            <TableCell>{issue.issueId}</TableCell>
                            <TableCell>{formatDate(issue.dateReported)}</TableCell>
                            <TableCell>{issue.equipmentType}</TableCell>
                            <TableCell>{issue.issueDescription}</TableCell>
                            <TableCell><Badge>{issue.status}</Badge></TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={5} className="text-center">No issues found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );
}