// src/components/LessonsLearned.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/config';
import Papa from 'papaparse';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Download } from "lucide-react";

interface Lesson {
  id: string;
  problemDescription: string;
  rootCause: string;
  correctiveAction: string;
  futureRecommendations: string;
  registrationDate: any;
}

const initialFormState = {
    problemDescription: '', rootCause: '', correctiveAction: '', futureRecommendations: '', registrationDate: ''
};

export function LessonsLearned() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formState, setFormState] = useState(initialFormState);

  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "lessons_learned"));
      const lessonsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
      setLessons(lessonsData);
    } catch (error) { console.error("Error fetching lessons:", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchLessons(); }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openForm = (lesson: Lesson | null = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      const formattedDate = lesson.registrationDate?.seconds ? new Date(lesson.registrationDate.seconds * 1000).toISOString().split('T')[0] : '';
      setFormState({
        problemDescription: lesson.problemDescription,
        rootCause: lesson.rootCause,
        correctiveAction: lesson.correctiveAction,
        futureRecommendations: lesson.futureRecommendations,
        registrationDate: formattedDate,
      });
    } else {
      setEditingLesson(null);
      setFormState(initialFormState);
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formState.problemDescription) {
        alert('Problem Description is required.');
        return;
    }
    try {
        const dataToSave = { ...formState };
        if (editingLesson) {
            await updateDoc(doc(db, "lessons_learned", editingLesson.id), dataToSave);
        } else {
            await addDoc(collection(db, "lessons_learned"), dataToSave);
        }
        setIsFormOpen(false);
        fetchLessons();
    } catch (error) { console.error("Error saving lesson:", error); }
  };
  
  const handleDelete = async (lessonId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
        await deleteDoc(doc(db, "lessons_learned", lessonId));
        fetchLessons();
    } catch(e) { console.error("Error deleting lesson:", e); }
  };

  const formatDate = (date: any) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };

  const handleDownloadCSV = () => {
    if (lessons.length === 0) return alert("No data to download.");
    const csvData = lessons.map(lesson => ({
      'Registration Date': formatDate(lesson.registrationDate),
      'Problem Description': lesson.problemDescription,
      'Root Cause': lesson.rootCause,
      'Corrective Action': lesson.correctiveAction,
      'Future Recommendations': lesson.futureRecommendations,
    }));
    const csv = Papa.unparse(csvData, { header: true, delimiter: ';' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lessons_learned_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lessons Learned</h1>
          <p className="text-gray-500">A log for continuous improvement.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Add New Lesson
            </Button>
            <Button variant="outline" onClick={handleDownloadCSV}>
                <Download className="h-4 w-4 mr-2" /> Download as CSV
            </Button>
        </div>
      </div>
      <div className="space-y-4">
        {isLoading ? ( <p className="text-center">Loading...</p> ) 
        : lessons.length > 0 ? ( lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>Lesson from: {formatDate(lesson.registrationDate)}</CardTitle>
                    <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openForm(lesson)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(lesson.id)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><h4 className="font-semibold">Problem Description</h4><p>{lesson.problemDescription}</p></div>
                <div><h4 className="font-semibold">Root Cause</h4><p>{lesson.rootCause}</p></div>
                <div><h4 className="font-semibold">Corrective Action</h4><p>{lesson.correctiveAction}</p></div>
                <div><h4 className="font-semibold">Future Recommendations</h4><p>{lesson.futureRecommendations}</p></div>
              </CardContent>
            </Card>
          ))) 
        : ( <p className="text-center text-gray-500">No lessons learned found.</p> )}
      </div>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea name="problemDescription" placeholder="Problem Description" value={formState.problemDescription} onChange={handleFormChange} />
            <Textarea name="rootCause" placeholder="Root Cause" value={formState.rootCause} onChange={handleFormChange} />
            <Textarea name="correctiveAction" placeholder="Corrective Action" value={formState.correctiveAction} onChange={handleFormChange} />
            <Textarea name="futureRecommendations" placeholder="Future Recommendations" value={formState.futureRecommendations} onChange={handleFormChange} />
            <Input name="registrationDate" type="date" value={formState.registrationDate} onChange={handleFormChange} />
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