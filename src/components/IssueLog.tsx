// src/components/IssueLog.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/config.js';
import Papa from 'papaparse';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Download } from "lucide-react";

interface Issue {
  id: string;
  issueId: string;
  dateReported: any;
  equipmentType: string;
  location: string;
  issueDescription: string;
  actionTaken: string;
  status: string;
  resolvedBy?: string;
  resolutionDate?: any;
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

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "issue_logs"));
      const issuesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
      setIssues(issuesData);
    } catch (error) { console.error("Error fetching issues:", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchIssues(); }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectChange = (value: string) => {
    setFormState(prev => ({ ...prev, status: value }));
  };

  const openForm = (issue: Issue | null = null) => {
    if (issue) {
      setEditingIssue(issue);
      const formatDateForInput = (date: any) => date?.seconds ? new Date(date.seconds * 1000).toISOString().split('T')[0] : (date || '');
      setFormState({
        issueId: issue.issueId,
        dateReported: formatDateForInput(issue.dateReported),
        equipmentType: issue.equipmentType,
        location: issue.location,
        issueDescription: issue.issueDescription,
        actionTaken: issue.actionTaken,
        status: issue.status,
        resolvedBy: issue.resolvedBy || '',
        resolutionDate: formatDateForInput(issue.resolutionDate),
      });
    } else {
      setEditingIssue(null);
      setFormState(initialFormState);
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formState.issueId || !formState.issueDescription) {
        alert('Issue ID and Description are required.');
        return;
    }
    try {
        const dataToSave = { ...formState };
        if (editingIssue) {
            await updateDoc(doc(db, "issue_logs", editingIssue.id), dataToSave);
        } else {
            await addDoc(collection(db, "issue_logs"), dataToSave);
        }
        setIsFormOpen(false);
        fetchIssues();
    } catch (error) { console.error("Error saving issue:", error); }
  };

  const handleDelete = async (issueId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
        await deleteDoc(doc(db, "issue_logs", issueId));
        fetchIssues();
    } catch(e) { console.error("Error deleting issue:", e); }
  };
  
  const formatDate = (date: any) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };

  const handleDownloadCSV = () => {
    if (issues.length === 0) return alert("No data to download.");
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
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(issue.id)}><Trash2 className="h-4 w-4"/></Button>
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
    </div>
  );
}