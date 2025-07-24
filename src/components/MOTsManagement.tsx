// src/components/MOTsManagement.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/config';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Printer, Save, Download } from "lucide-react";
import { MOTPrintable } from './MOTPrintable';
import { MOTReportPDF } from './MOTReportPDF';
import { MOTAllReportPDF } from './MOTAllReportPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';

interface MOT {
  id: string;
  workOrderNumber: string;
  station: string;
  technicianName: string;
  totalCost: number;
  issueDate: any;
  status: 'Pending' | 'Completed' | 'Invoiced';
  description: string;
  invoiceNumber: string;
  cargoWiseCw: string;
}

type FormState = {
  workOrderNumber: string;
  station: string;
  technicianName: string;
  totalCost: string;
  issueDate: string;
  status: 'Pending' | 'Completed' | 'Invoiced';
  description: string;
  invoiceNumber: string;
  cargoWiseCw: string;
};

const initialFormState: FormState = {
    workOrderNumber: '', station: 'RUH', technicianName: '', totalCost: '', 
    issueDate: '', status: 'Pending', description: '', invoiceNumber: '', cargoWiseCw: ''
};

export function MOTsManagement() {
  const [mots, setMots] = useState<MOT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMot, setEditingMot] = useState<MOT | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [motToPrint, setMotToPrint] = useState<MOT | null>(null);

  const componentToPrintRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
  contentRef: componentToPrintRef,              // ✅ الصحيح
  documentTitle: `MOT-${motToPrint?.workOrderNumber ?? "report"}`,
  onAfterPrint: () => setMotToPrint(null),
});


  const fetchMots = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "mots"));
      const motsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          workOrderNumber: data.workOrderNumber || '',
          station: data.station || 'RUH',
          technicianName: data.technicianName || '',
          totalCost: Number(data.totalCost) || 0,
          issueDate: data.issueDate,
          status: data.status || 'Pending',
          description: data.description || '',
          invoiceNumber: data.invoiceNumber || '',
          cargoWiseCw: data.cargoWiseCw || '',
        } as MOT;
      });
      
      // Sort MOTs by work order number (ascending: 1, 2, 3, ...)
      const sortedMots = motsData.sort((a, b) => {
        const woA = parseInt(a.workOrderNumber) || 999999;
        const woB = parseInt(b.workOrderNumber) || 999999;
        return woA - woB; // Ascending order: 1, 2, 3, 4, ...
      });
      
      setMots(sortedMots);
    } catch (error) { console.error("Error fetching MOTs:", error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchMots(); }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectChange = (name: string, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const openForm = (mot: MOT | null = null) => {
    if (mot) {
      setEditingMot(mot);
      const dateString = mot.issueDate?.seconds ? new Date(mot.issueDate.seconds * 1000).toISOString().split('T')[0] : mot.issueDate;
      setFormState({
        workOrderNumber: mot.workOrderNumber || '',
        station: mot.station || 'RUH',
        technicianName: mot.technicianName || '',
        totalCost: String(mot.totalCost || ''),
        issueDate: dateString,
        status: mot.status || 'Pending',
        description: mot.description || '',
        invoiceNumber: mot.invoiceNumber || '',
        cargoWiseCw: mot.cargoWiseCw || '',
      });
    } else {
      setEditingMot(null);
      setFormState(initialFormState);
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formState.workOrderNumber || !formState.issueDate) {
        alert('MOT/WO# and Issue Date are required.');
        return;
    }
    const dataToSave = { ...formState, totalCost: parseFloat(formState.totalCost) || 0 };
    try {
        if (editingMot) {
            await updateDoc(doc(db, "mots", editingMot.id), dataToSave);
        } else {
            await addDoc(collection(db, "mots"), dataToSave);
        }
        setIsFormOpen(false);
        fetchMots();
    } catch (error) { console.error("Error saving MOT:", error); }
  };

  const handleDelete = async (motId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
        await deleteDoc(doc(db, "mots", motId));
        fetchMots();
    } catch(e) { console.error("Error deleting MOT:", e); }
  };

  const triggerPrint = (mot: MOT) => {
    setMotToPrint(mot);
  };

  useEffect(() => {
  if (motToPrint && componentToPrintRef.current) {
    handlePrint();
  }
}, [motToPrint, handlePrint]);

  

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
    return new Date(date).toLocaleDateString('en-CA');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Order Tickets</h1>
          <p className="text-gray-500">Manage all MOTs and linked invoices.</p>
        </div>
        <div className="flex gap-2">
          <PDFDownloadLink
            document={<MOTAllReportPDF mots={mots} />}
            fileName={`All-MOTs-Report-${new Date().toISOString().split('T')[0]}.pdf`}
          >
            {({ loading }) => (
              <Button 
                variant="outline" 
                disabled={loading || mots.length === 0}
                className="bg-green-50 hover:bg-green-100 border-green-200"
              >
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Generating...' : 'Download All MOTs PDF'}
              </Button>
            )}
          </PDFDownloadLink>
          <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create New MOT
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All MOTs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MOT / WO#</TableHead><TableHead>Description</TableHead><TableHead>Technician</TableHead><TableHead>Issue Date</TableHead><TableHead>Invoice #</TableHead><TableHead>Cargo Wise CW</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? ( <TableRow><TableCell colSpan={9} className="text-center">Loading...</TableCell></TableRow> ) 
              : mots.length > 0 ? ( mots.map((mot) => (
                  <TableRow key={mot.id}>
                    <TableCell>{mot.workOrderNumber}</TableCell><TableCell>{mot.description || 'N/A'}</TableCell><TableCell>{mot.technicianName}</TableCell><TableCell>{formatDate(mot.issueDate)}</TableCell><TableCell>{mot.invoiceNumber || 'N/A'}</TableCell><TableCell>{mot.cargoWiseCw || 'N/A'}</TableCell><TableCell className="text-right">${mot.totalCost.toLocaleString()}</TableCell><TableCell className="text-center"><Badge>{mot.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => openForm(mot)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="outline" size="sm" onClick={() => triggerPrint(mot)}><Printer className="h-4 w-4"/></Button>
                        <PDFDownloadLink
                          document={<MOTReportPDF mot={mot} />}
                          fileName={`MOT-${mot.workOrderNumber}-Report.pdf`}
                        >
                          {({ loading }) => (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={loading}
                              className="bg-green-50 hover:bg-green-100"
                            >
                              <Download className="h-4 w-4"/>
                            </Button>
                          )}
                        </PDFDownloadLink>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(mot.id)}><Trash2 className="h-4 w-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))) 
              : ( <TableRow><TableCell colSpan={9} className="text-center">No MOTs found.</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMot ? 'Edit MOT' : 'Create New MOT'}</DialogTitle><DialogDescription>Fill in the details for the maintenance order ticket.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input name="workOrderNumber" placeholder="MOT / WO #" value={formState.workOrderNumber} onChange={handleFormChange}/>
            <Input name="description" placeholder="Description" value={formState.description} onChange={handleFormChange}/>
            <Input name="technicianName" placeholder="Technician Name" value={formState.technicianName} onChange={handleFormChange}/>
            <Input name="issueDate" type="date" value={formState.issueDate} onChange={handleFormChange}/>
            <Input name="invoiceNumber" placeholder="Invoice #" value={formState.invoiceNumber} onChange={handleFormChange}/>
            <Input name="cargoWiseCw" placeholder="Cargo Wise CW" value={formState.cargoWiseCw} onChange={handleFormChange}/>
            <Input name="totalCost" type="number" placeholder="Total Cost" value={formState.totalCost} onChange={handleFormChange}/>
            <Select value={formState.status} onValueChange={v => handleSelectChange('status', v)}><SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger><SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Invoiced">Invoiced</SelectItem></SelectContent></Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button><Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div style={{ display: "none" }}>
        {motToPrint && <MOTPrintable ref={componentToPrintRef} mot={motToPrint} />}
      </div>
    </div>
  );
}