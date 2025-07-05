// src/components/IssueLog.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase/config.js';
import Papa from 'papaparse';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Download } from "lucide-react";

interface Issue {
  id: string;
  issueId: string;
  dateReported: Timestamp | null;
  equipmentType: string;
  location: string;
  issueDescription: string;
  actionTaken: string;
  status: string;
  resolvedBy?: string;
  resolutionDate?: Timestamp | null;
}

const initialFormState = {
    issueId: '', dateReported: '', equipmentType: '', location: '', issueDescription: '',
    actionTaken: '', status: 'Pending', resolvedBy: '', resolutionDate: ''
};

export function IssueLog() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [formState, setFormState] = useState(initialFormState);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "issue_logs"));
      const issuesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
      setIssues(issuesData);
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast({
        title: "Error Fetching Data",
        description: "Could not load the issue log. Please try again later.",
        variant: "destructive",
      });
    }
    finally { setIsLoading(false); }
  }, [toast]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectChange = (value: string) => {
    setFormState(prev => ({ ...prev, status: value }));
  };

  const openForm = (issue: Issue | null = null) => {
    if (issue) {
      setEditingIssue(issue);
      const formatDateForInput = (date: Timestamp | null | undefined): string => {
        // Safely convert Firestore Timestamp to a string for date inputs (YYYY-MM-DD).
        // This handles null, undefined, and even Timestamp objects where seconds might be 0.
        if (date instanceof Timestamp) {
          return date.toDate().toISOString().split('T')[0];
        }
        return ''; // Return an empty string for null, undefined, or other non-Timestamp types.
      };
    } else {
      setEditingIssue(null);
      setFormState(initialFormState);
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formState.issueId || !formState.issueDescription) {
        toast({
          title: "Missing Information",
          description: "Issue ID and Description are required.",
          variant: "destructive",
        });
        return;
    }
    try {
        const dataToSave = {
          ...formState,
          // Convert date strings from the form back to Firestore Timestamps before saving
          dateReported: formState.dateReported ? Timestamp.fromDate(new Date(formState.dateReported)) : null,
          resolutionDate: formState.resolutionDate ? Timestamp.fromDate(new Date(formState.resolutionDate)) : null,
        };
        setIsFormOpen(false);
        fetchIssues();
    } catch (error) {
      console.error("Error saving issue:", error);
      toast({
        title: "Save Failed",
        description: "There was a problem saving the issue.",
        variant: "destructive",
      });
    }
  };

  const promptDelete = (issueId: string) => {
    setIssueToDelete(issueId);
  };

  const handleConfirmDelete = async () => {
    if (!issueToDelete) return;
    try {
        await deleteDoc(doc(db, "issue_logs", issueToDelete));
        toast({ title: "Success", description: "Issue deleted successfully." });
        fetchIssues();
    } catch(e) {
      console.error("Error deleting issue:", e);
      toast({ title: "Error", description: "Could not delete the issue.", variant: "destructive" });
    }
    setIssueToDelete(null); // Close the dialog
  };
  
  const formatDate = (date: Timestamp | null | undefined) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };

  const handleDownloadCSV = () => {
    if (issues.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data available to download.",
      });
      return;
    }
    const csvData = issues.map(issue => ({
        'Issue ID': issue.issueId,
        'Date Reported': formatDate(issue.dateReported),
        'Equipment Type': issue.equipmentType,
        'Location': issue.location,
        'Description': issue.issueDescription,
        'Action Taken': issue.actionTaken,
        'Status': issue.status,
        'Resolved By': issue.resolvedBy || 'N/A',
        'Resolution Date': formatDate(issue.resolutionDate),
    }));
    const csv = Papa.unparse(csvData, { header: true, delimiter: ';' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `issue_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Issue Log</h1>
          <p className="text-gray-500">Track and manage all reported issues.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Add New Issue
            </Button>
            <Button variant="outline" onClick={handleDownloadCSV}>
                <Download className="h-4 w-4 mr-2" /> Download as CSV
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All Issues</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue ID</TableHead><TableHead>Date Reported</TableHead><TableHead>Equipment</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? ( <TableRow><TableCell colSpan={6} className="text-center">Loading issues...</TableCell></TableRow> ) 
              : issues.length > 0 ? ( issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>{issue.issueId}</TableCell><TableCell>{formatDate(issue.dateReported)}</TableCell><TableCell>{issue.equipmentType}</TableCell><TableCell>{issue.issueDescription}</TableCell><TableCell><Badge>{issue.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openForm(issue)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="destructive" size="sm" onClick={() => promptDelete(issue.id)}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))) 
              : ( <TableRow><TableCell colSpan={6} className="text-center">No issues found.</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingIssue ? 'Edit Issue' : 'Create New Issue'}</DialogTitle><DialogDescription>Fill in the details for the issue log entry.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input name="issueId" placeholder="Issue ID (e.g., C-002)" value={formState.issueId} onChange={handleFormChange}/>
            <Input name="dateReported" type="date" value={formState.dateReported} onChange={handleFormChange}/>
            <Input name="equipmentType" placeholder="Equipment Type" value={formState.equipmentType} onChange={handleFormChange}/>
            <Input name="location" placeholder="Location" value={formState.location} onChange={handleFormChange}/>
            <Textarea name="issueDescription" placeholder="Issue Description" value={formState.issueDescription} onChange={handleFormChange}/>
            <Textarea name="actionTaken" placeholder="Action Taken" value={formState.actionTaken} onChange={handleFormChange}/>
            <Input name="resolvedBy" placeholder="Resolved By" value={formState.resolvedBy} onChange={handleFormChange}/>
            <Input name="resolutionDate" type="date" value={formState.resolutionDate} onChange={handleFormChange}/>
            <Select value={formState.status} onValueChange={handleSelectChange}>
              <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
              <SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!issueToDelete} onOpenChange={(open) => !open && setIssueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the issue log entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
