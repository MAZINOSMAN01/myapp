// src/components/IssueLog.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from '../firebase/config'; // ⭐ إصلاح المسار
import Papa from 'papaparse';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Download, Loader2 } from "lucide-react";

// ⭐ تعريف Interface محسّن
interface Issue {
  id: string;
  issueId: string;
  dateReported: Timestamp | null;
  equipmentType: string;
  location: string;
  issueDescription: string;
  actionTaken: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
  resolvedBy?: string;
  resolutionDate?: Timestamp | null;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  reportedBy?: string;
}

// ⭐ نموذج البيانات الأولي مع أنواع مرنة
type FormState = {
  issueId: string;
  dateReported: string;
  equipmentType: string;
  location: string;
  issueDescription: string;
  actionTaken: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
  resolvedBy: string;
  resolutionDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  reportedBy: string;
};

const initialFormState: FormState = {
  issueId: '',
  dateReported: '',
  equipmentType: '',
  location: '',
  issueDescription: '',
  actionTaken: '',
  status: 'Pending',
  resolvedBy: '',
  resolutionDate: '',
  priority: 'Medium',
  reportedBy: ''
};

export function IssueLog() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // ⭐ جلب البيانات من Firebase
  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "issue_logs"));
      const issuesData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Issue));
      setIssues(issuesData.sort((a, b) => 
        (b.dateReported?.seconds || 0) - (a.dateReported?.seconds || 0)
      ));
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast({
        title: "Error Fetching Data",
        description: "Could not load the issue log. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // ⭐ تحميل البيانات عند بدء المكون
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // ⭐ فتح نموذج إضافة/تعديل
  const openForm = (issue?: Issue) => {
    if (issue) {
      setEditingIssue(issue);
      setFormState({
        issueId: issue.issueId,
        dateReported: issue.dateReported ? 
          new Date(issue.dateReported.seconds * 1000).toISOString().substring(0, 10) : '',
        equipmentType: issue.equipmentType,
        location: issue.location,
        issueDescription: issue.issueDescription,
        actionTaken: issue.actionTaken,
        status: issue.status,
        resolvedBy: issue.resolvedBy || '',
        resolutionDate: issue.resolutionDate ? 
          new Date(issue.resolutionDate.seconds * 1000).toISOString().substring(0, 10) : '',
        priority: issue.priority || 'Medium',
        reportedBy: issue.reportedBy || ''
      });
    } else {
      setEditingIssue(null);
      setFormState({
        ...initialFormState,
        issueId: `ISS-${Date.now()}`, // Auto-generate ID
        dateReported: new Date().toISOString().substring(0, 10) // Today's date
      });
    }
    setIsFormOpen(true);
  };

  // ⭐ إغلاق النموذج
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingIssue(null);
    setFormState(initialFormState);
  };

  // ⭐ تحديث قيم النموذج
  const updateFormState = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // ⭐ حفظ البيانات
  const handleSave = async () => {
    // التحقق من البيانات المطلوبة
    if (!formState.issueId || !formState.equipmentType || !formState.issueDescription) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const issueData = {
        issueId: formState.issueId,
        dateReported: formState.dateReported ? 
          Timestamp.fromDate(new Date(formState.dateReported)) : Timestamp.now(),
        equipmentType: formState.equipmentType,
        location: formState.location,
        issueDescription: formState.issueDescription,
        actionTaken: formState.actionTaken,
        status: formState.status,
        resolvedBy: formState.resolvedBy,
        resolutionDate: formState.resolutionDate ? 
          Timestamp.fromDate(new Date(formState.resolutionDate)) : null,
        priority: formState.priority,
        reportedBy: formState.reportedBy,
        updatedAt: Timestamp.now()
      };

      if (editingIssue) {
        // تحديث قضية موجودة
        await updateDoc(doc(db, "issue_logs", editingIssue.id), issueData);
        toast({
          title: "Success",
          description: "Issue updated successfully.",
        });
      } else {
        // إضافة قضية جديدة
        await addDoc(collection(db, "issue_logs"), {
          ...issueData,
          createdAt: Timestamp.now()
        });
        toast({
          title: "Success",
          description: "Issue added successfully.",
        });
      }

      closeForm();
      fetchIssues();
    } catch (error) {
      console.error("Error saving issue:", error);
      toast({
        title: "Error",
        description: "Could not save the issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ⭐ طلب حذف قضية
  const promptDelete = (issueId: string) => {
    setIssueToDelete(issueId);
  };

  // ⭐ تأكيد الحذف
  const handleConfirmDelete = async () => {
    if (!issueToDelete) return;
    
    try {
      await deleteDoc(doc(db, "issue_logs", issueToDelete));
      toast({
        title: "Success",
        description: "Issue deleted successfully.",
      });
      fetchIssues();
    } catch (error) {
      console.error("Error deleting issue:", error);
      toast({
        title: "Error",
        description: "Could not delete the issue.",
        variant: "destructive",
      });
    } finally {
      setIssueToDelete(null);
    }
  };

  // ⭐ تنسيق التاريخ
  const formatDate = (date: Timestamp | null | undefined) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };

  // ⭐ تحميل ملف CSV
  const handleDownloadCSV = () => {
    if (issues.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data available to download.",
        variant: "destructive",
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
      'Priority': issue.priority || 'N/A',
      'Reported By': issue.reportedBy || 'N/A',
      'Resolved By': issue.resolvedBy || 'N/A',
      'Resolution Date': formatDate(issue.resolutionDate),
    }));

    const csv = Papa.unparse(csvData, { header: true, delimiter: ',' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `issue_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({
      title: "Download Started",
      description: `Downloaded ${issues.length} issues to CSV file.`,
    });
  };

  // ⭐ لون Badge حسب الحالة
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ⭐ لون Badge حسب الأولوية
  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Issue Log</h1>
          <p className="text-gray-500">Track and manage all reported issues.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add New Issue
          </Button>
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Issues ({issues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue ID</TableHead>
                  <TableHead>Date Reported</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-2">Loading issues...</p>
                    </TableCell>
                  </TableRow>
                ) : issues.length > 0 ? (
                  issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.issueId}</TableCell>
                      <TableCell>{formatDate(issue.dateReported)}</TableCell>
                      <TableCell>{issue.equipmentType}</TableCell>
                      <TableCell>{issue.location}</TableCell>
                      <TableCell className="max-w-xs truncate" title={issue.issueDescription}>
                        {issue.issueDescription}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(issue.status)}>
                          {issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeColor(issue.priority || 'Medium')}>
                          {issue.priority || 'Medium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openForm(issue)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => promptDelete(issue.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">No issues found.</p>
                      <Button onClick={() => openForm()} className="mt-2">
                        Add First Issue
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Issue Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingIssue ? 'Edit Issue' : 'Add New Issue'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issueId">Issue ID *</Label>
              <Input
                id="issueId"
                value={formState.issueId}
                onChange={(e) => updateFormState('issueId', e.target.value)}
                placeholder="ISS-001"
                disabled={!!editingIssue}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReported">Date Reported *</Label>
              <Input
                id="dateReported"
                type="date"
                value={formState.dateReported}
                onChange={(e) => updateFormState('dateReported', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipmentType">Equipment Type *</Label>
              <Input
                id="equipmentType"
                value={formState.equipmentType}
                onChange={(e) => updateFormState('equipmentType', e.target.value)}
                placeholder="e.g., HVAC System"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formState.location}
                onChange={(e) => updateFormState('location', e.target.value)}
                placeholder="e.g., Building A, Floor 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formState.status} onValueChange={(value) => updateFormState('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formState.priority} onValueChange={(value) => updateFormState('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By</Label>
              <Input
                id="reportedBy"
                value={formState.reportedBy}
                onChange={(e) => updateFormState('reportedBy', e.target.value)}
                placeholder="Reporter name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolvedBy">Resolved By</Label>
              <Input
                id="resolvedBy"
                value={formState.resolvedBy}
                onChange={(e) => updateFormState('resolvedBy', e.target.value)}
                placeholder="Resolver name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="issueDescription">Issue Description *</Label>
              <Textarea
                id="issueDescription"
                value={formState.issueDescription}
                onChange={(e) => updateFormState('issueDescription', e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Textarea
                id="actionTaken"
                value={formState.actionTaken}
                onChange={(e) => updateFormState('actionTaken', e.target.value)}
                placeholder="Describe the actions taken to resolve this issue..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolutionDate">Resolution Date</Label>
              <Input
                id="resolutionDate"
                type="date"
                value={formState.resolutionDate}
                onChange={(e) => updateFormState('resolutionDate', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingIssue ? 'Update Issue' : 'Add Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!issueToDelete} onOpenChange={() => setIssueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the issue
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}