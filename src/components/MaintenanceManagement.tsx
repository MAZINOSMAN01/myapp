import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../firebase/config.js';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit, Trash2, Search, Settings, DollarSign, Filter, ClipboardCheck, Wrench, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SystemReportView } from './SystemReportView';
import { QuickUpdateDrawer } from './QuickUpdateDrawer';
import { UpcomingTasks } from './UpcomingTasks';
import { CorrectiveMaintenanceLogger } from './CorrectiveMaintenanceLogger';
import { PrintableCMReport } from './PrintableCMReport';

// --- Interfaces ---
export interface MaintenanceTask {
  id: string;
  systemId?: string;
  maintenanceType?: string;
  taskName?: string;
  frequency?: string;
  nextDueDate?: string;
  estimatedCost?: number;
  assignedTo?: string;
  status?: string;
  notes?: string;
  progress?: { [key: string]: boolean[] };
  createdAt?: any;
  updatedAt?: any;
  assetName?: string;
  [key: string]: any;
}

export interface User {
    id: string;
    name: string;
    avatar?: string;
}

// --- Main Component ---
export function MaintenanceManagement() {
  // --- States ---
  const [allTasks, setAllTasks] = useState<MaintenanceTask[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [systems, setSystems] = useState<{ id: string, name: string }[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<{ id: string, name: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reportSelectedSystem, setReportSelectedSystem] = useState('');
  const [quickUpdateTask, setQuickUpdateTask] = useState<MaintenanceTask | null>(null);
  const [isCorrectiveLogOpen, setIsCorrectiveLogOpen] = useState(false);

  // --- Filter States ---
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterAssignedTo, setFilterAssignedTo] = useState<string[]>([]);
  const [filterFrequency, setFilterFrequency] = useState<string[]>([]);
  const [filterMinCost, setFilterMinCost] = useState<string>('');
  const [filterMaintType, setFilterMaintType] = useState<string>('all');
  
  // --- Form States ---
  const [currentSystemId, setCurrentSystemId] = useState('');
  const [currentTaskName, setCurrentTaskName] = useState('');
  const [currentFrequency, setCurrentFrequency] = useState('Monthly');
  const [currentNextDueDate, setCurrentNextDueDate] = useState('');
  const [currentEstimatedCost, setCurrentEstimatedCost] = useState('');
  const [currentAssignedTo, setCurrentAssignedTo] = useState('');
  const [currentStatus, setCurrentStatus] = useState('Scheduled');
  const [currentMaintType, setCurrentMaintType] = useState('PM');
  const [isSystemManagementOpen, setIsSystemManagementOpen] = useState(false);
  const [newSystemTypeName, setNewSystemTypeName] = useState('');

  // --- Print Ref and Handler ---
  const printCmRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printCmRef.current,
    documentTitle: `Corrective-Maintenance-Report-${selectedSystem}-${new Date().toISOString().slice(0, 10)}`,
  });

  // --- Data Fetching ---
  const fetchData = async () => {
    try {
      const [tasksSnapshot, systemsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, "tasks")),
        getDocs(collection(db, "system_types")),
        getDocs(collection(db, "users"))
      ]);
      const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceTask));
      setAllTasks(tasksData);
      const systemsData = systemsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setSystems(systemsData);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, ...doc.data() } as User));
      setUsers(usersData);
      if (systemsData.length > 0 && reportSelectedSystem === '') {
        setReportSelectedSystem(systemsData[0].name);
      }
      setMaintenanceTypes([{id: 'PM', name: 'Preventive Maintenance'},{id: 'CM', name: 'Corrective Maintenance'}]);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };
  useEffect(() => { fetchData(); }, []);

  // --- Filtering Logic ---
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const systemMatch = selectedSystem === 'all' || task.systemId === selectedSystem;
      const searchMatch = searchTerm === '' || (task.taskName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = filterStatus.length === 0 || filterStatus.includes(task.status || '');
      const assignedToMatch = filterAssignedTo.length === 0 || filterAssignedTo.includes(task.assignedTo || '');
      const frequencyMatch = filterFrequency.length === 0 || filterFrequency.includes(task.frequency || '');
      const costMatch = filterMinCost === '' || (task.estimatedCost || 0) >= parseFloat(filterMinCost);
      const maintTypeMatch = filterMaintType === 'all' || task.maintenanceType === filterMaintType;

      return systemMatch && searchMatch && statusMatch && assignedToMatch && frequencyMatch && costMatch && maintTypeMatch;
    });
  }, [allTasks, selectedSystem, searchTerm, filterStatus, filterAssignedTo, filterFrequency, filterMinCost, filterMaintType]);

  // --- Handlers ---
  const openTaskForm = (taskToEdit: MaintenanceTask | null = null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setCurrentSystemId(taskToEdit.systemId || '');
      setCurrentTaskName(taskToEdit.taskName || taskToEdit.assetName || '');
      setCurrentFrequency(taskToEdit.frequency || 'Monthly');
      setCurrentNextDueDate(taskToEdit.nextDueDate || '');
      setCurrentEstimatedCost(taskToEdit.estimatedCost ? taskToEdit.estimatedCost.toString() : '');
      setCurrentAssignedTo(taskToEdit.assignedTo || '');
      setCurrentStatus(taskToEdit.status || 'Scheduled');
      setCurrentMaintType(taskToEdit.maintenanceType || 'PM');
    } else {
      setEditingTask(null);
      setCurrentSystemId(systems.length > 0 ? systems[0].name : '');
      setCurrentTaskName('');
      setCurrentFrequency('Monthly');
      setCurrentNextDueDate('');
      setCurrentEstimatedCost('');
      setCurrentAssignedTo(users.length > 0 ? users[0].id : '');
      setCurrentStatus('Scheduled');
      setCurrentMaintType('PM');
    }
    setIsFormOpen(true);
  };
  const closeTaskForm = () => { setIsFormOpen(false); };
  const handleSaveTask = async () => {
    if (!currentTaskName || !currentFrequency || !currentSystemId) {
        alert("Please fill in Task Name, System, and Frequency.");
        return;
    }
    const taskData = {
      systemId: currentSystemId,
      maintenanceType: currentMaintType,
      taskName: currentTaskName,
      frequency: currentFrequency,
      nextDueDate: currentNextDueDate,
      estimatedCost: parseFloat(currentEstimatedCost || '0'),
      assignedTo: currentAssignedTo,
      status: currentStatus,
      notes: editingTask?.notes || "",
      progress: editingTask?.progress || {},
      updatedAt: serverTimestamp(),
    };
    try {
        if (editingTask) {
            const taskRef = doc(db, "tasks", editingTask.id);
            await updateDoc(taskRef, taskData);
        } else {
            await addDoc(collection(db, "tasks"), { ...taskData, createdAt: serverTimestamp() });
        }
        closeTaskForm();
        fetchData();
    } catch (error) {
        console.error("Error saving task: ", error);
        alert("An error occurred while saving the task.");
    }
  };
  const handleDeleteTask = async () => {
    if (!editingTask) return;
    if (window.confirm(`Are you sure you want to delete task: "${editingTask.taskName}"?`)) {
      try {
        await deleteDoc(doc(db, "tasks", editingTask.id));
        closeTaskForm();
        fetchData();
      } catch (error) {
        console.error("Error deleting task: ", error);
      }
    }
  };
  const handleAddSystemType = async () => {
    if (newSystemTypeName.trim() === '') return alert("Please enter a new system name.");
    if (systems.some(type => type.name.toLowerCase() === newSystemTypeName.trim().toLowerCase())) return alert("This system already exists.");
    try {
      await addDoc(collection(db, "system_types"), { name: newSystemTypeName.trim() });
      setNewSystemTypeName('');
      fetchData();
    } catch (e) {
      console.error("Error adding system type: ", e);
    }
  };
  const handleDeleteSystemType = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete system "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "system_types", id));
      fetchData();
    } catch (e) {
      console.error("Error deleting system type: ", e);
    }
  };
  const handleMultiSelectFilterChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Scheduled": return "bg-yellow-100 text-yellow-800";
      case "Delayed": return "bg-red-100 text-red-800";
      case "Skipped": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  const handleQuickUpdateSave = async (taskId: string, newStatus: string, newNotes: string) => {
    try {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, {
            status: newStatus,
            notes: newNotes,
            updatedAt: serverTimestamp()
        });
        setQuickUpdateTask(null);
        fetchData();
    } catch (error) {
        console.error("Error saving quick update:", error);
        alert("An error occurred during the quick update.");
    }
  };
  const handleSaveCorrectiveLog = async (logData: Partial<MaintenanceTask>): Promise<boolean> => {
    try {
        await addDoc(collection(db, "tasks"), { 
            ...logData, 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        fetchData();
        return true;
    } catch (error) {
        console.error("Error saving corrective log: ", error);
        alert("An error occurred while saving the log.");
        return false;
    }
  };

  return (
    <div className="space-y-6">
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Maintenance Management</h1>
                <p className="text-gray-500">Track, schedule, and manage all maintenance tasks.</p>
            </div>
            <div className="flex items-center gap-2">
                <Button size="lg" variant="outline" className="flex items-center gap-2" onClick={() => setIsCorrectiveLogOpen(true)}>
                    <Wrench className="h-5 w-5" /> Log Corrective Maintenance
                </Button>
                <Button size="lg" className="flex items-center gap-2" onClick={() => openTaskForm()}>
                    <PlusCircle className="h-5 w-5" /> Add New Task
                </Button>
                <Button variant="outline" onClick={() => setIsSystemManagementOpen(true)}>
                    <Settings className="h-4 w-4" />
                </Button>
            </div>
        </header>

        <Tabs defaultValue="tasks">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tasks">Task Management</TabsTrigger>
                <TabsTrigger value="reports">System Reports</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                    <aside className="md:col-span-1 bg-gray-50 p-4 rounded-lg border h-fit">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Filter className="h-5 w-5" /> Quick Filters
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <Label className="font-semibold">Status</Label>
                                <div className="space-y-2 mt-2">
                                    {['Scheduled', 'In Progress', 'Completed', 'Delayed', 'Skipped'].map(status => (
                                        <div key={status} className="flex items-center"><Checkbox id={`status-${status}`} checked={filterStatus.includes(status)} onCheckedChange={() => handleMultiSelectFilterChange(setFilterStatus, status)} /><Label htmlFor={`status-${status}`} className="ml-2 font-normal">{status}</Label></div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="font-semibold">Frequency</Label>
                                <div className="space-y-2 mt-2">
                                    {['Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-Off'].map(freq => (
                                        <div key={freq} className="flex items-center"><Checkbox id={`freq-${freq}`} checked={filterFrequency.includes(freq)} onCheckedChange={() => handleMultiSelectFilterChange(setFilterFrequency, freq)} /><Label htmlFor={`freq-${freq}`} className="ml-2 font-normal">{freq}</Label></div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="font-semibold">Assigned To</Label>
                                <div className="space-y-2 mt-2">
                                    {users.map(user => (
                                        <div key={user.id} className="flex items-center"><Checkbox id={`user-${user.id}`} checked={filterAssignedTo.includes(user.id)} onCheckedChange={() => handleMultiSelectFilterChange(setFilterAssignedTo, user.id)} /><Label htmlFor={`user-${user.id}`} className="ml-2 font-normal">{user.name}</Label></div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="min-cost" className="font-semibold">Cost Greater Than</Label>
                                <div className="relative mt-2"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="min-cost" type="number" placeholder="e.g., 50" value={filterMinCost} onChange={(e) => setFilterMinCost(e.target.value)} className="pl-8" /></div>
                            </div>
                        </div>
                    </aside>
                    <main className="md:col-span-3">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                                    <SelectTrigger><SelectValue placeholder="Select System" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Systems</SelectItem>{systems.map(sys => <SelectItem key={sys.id} value={sys.name}>{sys.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={filterMaintType} onValueChange={setFilterMaintType}>
                                    <SelectTrigger className="w-[220px]">
                                        <SelectValue placeholder="Maintenance Type"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="PM">Preventive</SelectItem>
                                        <SelectItem value="CM">Corrective</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filterMaintType === 'CM' && (
                                    <Button onClick={handlePrint} className="flex items-center gap-2">
                                        <Printer className="h-4 w-4" /> Print CM Report
                                    </Button>
                                )}
                                <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search tasks..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                            </div>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                          <TableHead>Task Name</TableHead><TableHead>System</TableHead><TableHead>Frequency</TableHead><TableHead>Next Due Date</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTasks.length > 0 ? (
                                            filteredTasks.map((task) => (
                                                <TableRow key={task.id}>
                                                    <TableCell className="font-medium">{task.taskName || task.assetName}</TableCell>
                                                    <TableCell>{task.systemId}</TableCell>
                                                    <TableCell>{task.frequency}</TableCell>
                                                    <TableCell>{task.nextDueDate}</TableCell>
                                                    <TableCell>{users.find(u => u.id === task.assignedTo)?.name || task.assignedTo}</TableCell>
                                                    <TableCell><Badge className={getStatusColor(task.status || '')}>{task.status}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setQuickUpdateTask(task)} title="Quick Update">
                                                            <ClipboardCheck className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => openTaskForm(task)} title="Edit Full Task">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : ( <TableRow><TableCell colSpan={7} className="text-center h-24">No tasks match the current filters.</TableCell></TableRow> )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </main>
                </div>
            </TabsContent>
            
            <TabsContent value="reports">
                <div className="mt-4">
                    <SystemReportView tasks={allTasks.filter(t => t.systemId === reportSelectedSystem)} systems={systems} selectedSystem={reportSelectedSystem} onSystemChange={setReportSelectedSystem}/>
                </div>
            </TabsContent>

            <TabsContent value="upcoming">
              <div className="mt-4">
                <UpcomingTasks
                    tasks={allTasks}
                    systems={systems}
                    maintenanceTypes={maintenanceTypes}
                />
              </div>
            </TabsContent>
        </Tabs>

        {/* --- Modals, Drawers, and Hidden Printable Component --- */}
        <div className="hidden">
            <PrintableCMReport 
                ref={printCmRef} 
                tasks={filteredTasks} 
                users={users} 
                system={selectedSystem} 
            />
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>{editingTask ? "Edit Maintenance Task" : "Add New Maintenance Task"}</DialogTitle><DialogDescription>Fill in the details below. Required fields are marked with an asterisk (*).</DialogDescription></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <Input placeholder="Task Name *" value={currentTaskName} onChange={(e) => setCurrentTaskName(e.target.value)} className="md:col-span-2" />
                  <Select value={currentSystemId} onValueChange={setCurrentSystemId}><SelectTrigger><SelectValue placeholder="System *" /></SelectTrigger><SelectContent>{systems.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={currentMaintType} onValueChange={setCurrentMaintType}><SelectTrigger><SelectValue placeholder="Maintenance Type *" /></SelectTrigger><SelectContent>{maintenanceTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={currentFrequency} onValueChange={setCurrentFrequency}><SelectTrigger><SelectValue placeholder="Frequency *" /></SelectTrigger><SelectContent><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem><SelectItem value="Semi-Annual">Semi-Annual</SelectItem><SelectItem value="Annual">Annual</SelectItem><SelectItem value="One-Off">One-Off</SelectItem></SelectContent></Select>
                  <Input type="date" value={currentNextDueDate} onChange={(e) => setCurrentNextDueDate(e.target.value)} />
                  <div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="Estimated Cost" value={currentEstimatedCost} onChange={(e) => setCurrentEstimatedCost(e.target.value)} className="pl-8" /></div>
                  <Select value={currentAssignedTo} onValueChange={setCurrentAssignedTo}><SelectTrigger><SelectValue placeholder="Assigned To *" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={currentStatus} onValueChange={setCurrentStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Scheduled">Scheduled</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Delayed">Delayed</SelectItem><SelectItem value="Skipped">Skipped</SelectItem></SelectContent></Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={closeTaskForm}>Cancel</Button>
                  {editingTask && (<Button variant="destructive" onClick={handleDeleteTask} className="mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>)}
                  <Button onClick={handleSaveTask}>{editingTask ? "Save Changes" : "Create Task"}</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isSystemManagementOpen} onOpenChange={setIsSystemManagementOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Manage System Types</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Add New System</h3>
                        <div className="flex gap-2"><Input placeholder="New System Name" value={newSystemTypeName} onChange={(e) => setNewSystemTypeName(e.target.value)} /><Button onClick={handleAddSystemType}>Add</Button></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Current Systems</h3>
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {systems.map((type) => (<li key={type.id} className="flex items-center justify-between p-2 border rounded"><span>{type.name}</span><Button variant="destructive" size="sm" onClick={() => handleDeleteSystemType(type.id, type.name)}><Trash2 className="h-4 w-4" /></Button></li>))}
                        </ul>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsSystemManagementOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        <QuickUpdateDrawer 
            task={quickUpdateTask}
            isOpen={!!quickUpdateTask}
            onClose={() => setQuickUpdateTask(null)}
            onSave={handleQuickUpdateSave}
        />
        <Dialog open={isCorrectiveLogOpen} onOpenChange={setIsCorrectiveLogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Log a New Corrective Maintenance Action</DialogTitle>
                    <DialogDescription>
                        Use this form to log unscheduled, corrective work that has been performed.
                    </DialogDescription>
                </DialogHeader>
                <CorrectiveMaintenanceLogger 
                    systems={systems}
                    users={users}
                    onSave={handleSaveCorrectiveLog}
                    onClose={() => setIsCorrectiveLogOpen(false)}
                />
            </DialogContent>
        </Dialog>
    </div>
  );
}