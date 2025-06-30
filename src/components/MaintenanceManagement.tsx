 import React, { useEffect, useState } from 'react';

import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";



// **This is the ONLY Firebase import. The full Firebase config should be in src/firebase/config.js ONLY.**

import { db } from '../firebase/config.js';





import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";



import { Plus, Edit, Trash2, Search, CalendarDays, DollarSign, ListFilter, SlidersHorizontal, Settings } from "lucide-react";



export function MaintenanceManagement() {

  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState([]); // All fetched records

  const [filteredRecords, setFilteredRecords] = useState([]); // Records after applying type/system filters

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [editingRecord, setEditingRecord] = useState<any>(null);



  // States for internal tabs and filters

  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState('all'); // 'all', 'preventive', 'corrective', 'predictive', 'materials'

  const [activeSystemFilter, setActiveSystemFilter] = useState('all'); // 'all', 'HVAC', 'Electrical, Plumbing, etc.

  // NEW STATE for preventive tab timeframe filter

  const [preventiveTimeframeFilter, setPreventiveTimeframeFilter] = useState('all'); // 'all', 'weekly', 'monthly', 'annual', 'future'



  // States for maintenance record form fields

  const [currentRecordId, setCurrentRecordId] = useState('');

  const [currentAssetName, setCurrentAssetName] = useState('');

  const [currentMaintenanceType, setCurrentMaintenanceType] = useState('Preventive Maintenance'); // Default value (English)

  const [currentDescription, setCurrentDescription] = useState('');

  const [currentDate, setCurrentDate] = useState('');

  const [currentCost, setCurrentCost] = useState('');

  const [currentStatus, setCurrentStatus] = useState('Completed');

  const [currentAssignedTo, setCurrentAssignedTo] = useState('');

  const [currentNextDueDate, setCurrentNextDueDate] = useState('');

  const [currentSystemType, setCurrentSystemType] = useState('HVAC'); // Default for System filter

  const [currentFrequency, setCurrentFrequency] = useState('Annual'); // Default for Frequency

  const [currentMaterials, setCurrentMaterials] = useState(''); // For Materials Needed (comma-separated string)



  // States for managing system types

  const [systemTypes, setSystemTypes] = useState<any[]>([]); // List of system types from Firebase

  const [isSystemManagementOpen, setIsSystemManagementOpen] = useState(false); // To open/close system management dialog

  const [newSystemTypeName, setNewSystemTypeName] = useState(''); // For new system name input



  // Function to fetch maintenance records from Firebase

  const fetchMaintenanceRecords = async () => {

    console.log("Attempting to fetch maintenance records from Firebase...");

    try {

      const querySnapshot = await getDocs(collection(db, "maintenance_records"));

      const records = querySnapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

      }));

      setAllMaintenanceRecords(records);

    } catch (error) {

      console.error("Error fetching maintenance records: ", error);

    }

  };



  // Function to fetch system types from Firebase

  const fetchSystemTypes = async () => {

    console.log("Attempting to fetch system types from Firebase...");

    try {

      const querySnapshot = await getDocs(collection(db, "system_types"));

      const types = querySnapshot.docs.map(doc => ({

        id: doc.id,

        name: doc.data().name

      }));

      setSystemTypes(types);

      if (types.length > 0 && !types.some(type => type.name === currentSystemType)) {

        setCurrentSystemType(types[0].name);

      } else if (types.length === 0) {

        setCurrentSystemType('');

      }

    } catch (error) {

      console.error("Error fetching system types: ", error);

    }

  };



  // Function to fetch maintenance task templates

  const fetchMaintenanceTemplates = async () => {

    console.log("Attempting to fetch maintenance templates from Firebase...");

    try {

      const querySnapshot = await getDocs(collection(db, "maintenance_task_templates"));

      const templates = querySnapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

      }));

      // If you want to store them in state, uncomment:

      // setMaintenanceTemplates(templates);

    } catch (error) {

      console.error("Error fetching maintenance templates: ", error);

    }

  };



  useEffect(() => {

    fetchMaintenanceRecords();

    fetchSystemTypes();

    fetchMaintenanceTemplates();

  }, []);



  useEffect(() => {

    let tempRecords = [...allMaintenanceRecords];



    if (activeMaintenanceTab !== 'all' && activeMaintenanceTab !== 'materials') {

      tempRecords = tempRecords.filter(record => {

        if (activeMaintenanceTab === 'preventive' && record.maintenanceType === 'Preventive Maintenance') return true;

        if (activeMaintenanceTab === 'corrective' && record.maintenanceType === 'Corrective Maintenance (Repair)') return true;

        if (activeMaintenanceTab === 'predictive' && record.maintenanceType === 'Predictive Maintenance (Inspection)') return true;

        return false;

      });

    }



    if (activeSystemFilter !== 'all') {

      tempRecords = tempRecords.filter(record => record.systemType === activeSystemFilter);

    }



    setFilteredRecords(tempRecords);

  }, [allMaintenanceRecords, activeMaintenanceTab, activeSystemFilter]);





  const openRecordForm = (recordToEdit: any = null) => {

    if (recordToEdit) {

      setEditingRecord(recordToEdit);

      setCurrentRecordId(recordToEdit.recordId || '');

      setCurrentAssetName(recordToEdit.assetName || '');

      setCurrentMaintenanceType(recordToEdit.maintenanceType || 'Preventive Maintenance');

      setCurrentDescription(recordToEdit.description || '');

      setCurrentDate(recordToEdit.date || '');

      setCurrentCost(recordToEdit.cost ? recordToEdit.cost.toString() : '');

      setCurrentStatus(recordToEdit.status || 'Completed');

      setCurrentAssignedTo(recordToEdit.assignedTo || '');

      setCurrentNextDueDate(recordToEdit.nextDueDate || '');

      setCurrentSystemType(recordToEdit.systemType || (systemTypes.length > 0 ? systemTypes[0].name : ''));

      setCurrentFrequency(recordToEdit.frequency || 'Annual');

      setCurrentMaterials(recordToEdit.materialsNeeded ? recordToEdit.materialsNeeded.join(', ') : '');

    } else {

      setEditingRecord(null);

      setCurrentRecordId('');

      setCurrentAssetName('');

      setCurrentMaintenanceType('Preventive Maintenance');

      setCurrentDescription('');

      setCurrentDate('');

      setCurrentCost('');

      setCurrentStatus('Completed');

      setCurrentAssignedTo('');

      setCurrentNextDueDate('');

      setCurrentSystemType(systemTypes.length > 0 ? systemTypes[0].name : '');

      setCurrentFrequency('Annual');

      setCurrentMaterials('');

    }

    setIsFormOpen(true);

  };



  const closeRecordForm = () => {

    setIsFormOpen(false);

    setEditingRecord(null);

    setCurrentRecordId('');

    setCurrentAssetName('');

    setCurrentMaintenanceType('Preventive Maintenance');

    setCurrentDescription('');

    setCurrentDate('');

    setCurrentCost('');

    setCurrentStatus('Completed');

    setCurrentAssignedTo('');

    setCurrentNextDueDate('');

    setCurrentSystemType('');

    setCurrentFrequency('');

    setCurrentMaterials('');

  };



  const handleSaveRecord = async () => {

    if (!currentAssetName || !currentDate || !currentMaintenanceType || !currentSystemType || !currentFrequency) {

      alert("Please enter Asset Name, Date, Maintenance Type, System Type, and Frequency.");

      return;

    }



    const recordData = {

      recordId: currentRecordId || `MR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,

      assetName: currentAssetName,

      maintenanceType: currentMaintenanceType,

      description: currentDescription,

      date: currentDate,

      cost: parseFloat(currentCost || '0'),

      status: currentStatus,

      assignedTo: currentAssignedTo,

      nextDueDate: currentNextDueDate,

      systemType: currentSystemType,

      frequency: currentFrequency,

      materialsNeeded: currentMaterials.split(',').map(m => m.trim()).filter(m => m !== ''),

    };



    try {

      if (editingRecord) {

        console.log("Attempting to update record:", editingRecord.id);

        const recordRef = doc(db, "maintenance_records", editingRecord.id);

        await updateDoc(recordRef, recordData);

        console.log("Record updated successfully.");

      } else {

        console.log("Attempting to add new record...");

        const docRef = await addDoc(collection(db, "maintenance_records"), recordData);

        console.log("Record added with ID: ", docRef.id);

      }

      closeRecordForm();

      fetchMaintenanceRecords(); // Update list after save



    } catch (e) {

      console.error("Error saving record: ", e);

      alert("An error occurred while saving the maintenance record. Please check the Console.");

    }

  };



  const handleDeleteRecord = async () => {

    if (!editingRecord || !window.confirm(`Are you sure you want to delete maintenance record: "${editingRecord.recordId}"?`)) {

      return;

    }



    try {

      await deleteDoc(doc(db, "maintenance_records", editingRecord.id));

      console.log("Record deleted successfully.");

      closeRecordForm();

      fetchMaintenanceRecords(); // Update list after delete



    } catch (e) {

      console.error("Error deleting record: ", e);

      alert("An error occurred while deleting the maintenance record. Please check the Console.");

    }

  };



  const getStatusColor = (status: string) => {

    switch (status) {

      case "Completed": return "bg-green-100 text-green-800";

      case "Scheduled": return "bg-purple-100 text-purple-800";

      case "In Progress": return "bg-blue-100 text-blue-800";

      default: return "bg-gray-100 text-gray-800";

    }

  };



  // Calculate top statistics based on allMaintenanceRecords (before filtering)

  const totalPreventive = allMaintenanceRecords.filter((r: any) => r.maintenanceType === 'Preventive Maintenance').length;

  const totalCorrective = allMaintenanceRecords.filter((r: any) => r.maintenanceType === 'Corrective Maintenance (Repair)').length;

  const totalPredictive = allMaintenanceRecords.filter((r: any) => r.maintenanceType === 'Predictive Maintenance (Inspection)').length;





  const calculateNextOccurrence = (startDateStr: string, frequency: string) => {

    const startDate = new Date(startDateStr);

    const nextDate = new Date(startDate);



    switch (frequency) {

      case 'Weekly':

        nextDate.setDate(startDate.getDate() + 7);

        break;

      case 'Monthly':

        nextDate.setMonth(startDate.getMonth() + 1);

        break;

      case 'Quarterly':

        nextDate.setMonth(startDate.getMonth() + 3);

        break;

      case 'Semi-Annual':

        nextDate.setMonth(startDate.getMonth() + 6);

        break;

      case 'Annual':

        nextDate.setFullYear(startDate.getFullYear() + 1);

        break;

      default:

        return null;

    }

    return nextDate.toISOString().split('T')[0];

  };



  const getUpcomingMaintenanceTasks = () => {

    const now = Date.now();

    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const oneYear = 365 * 24 * 60 * 60 * 1000;



    let allUpcomingTasks: any[] = [];



    // Add existing scheduled records (that are not completed)

    filteredRecords.forEach((record: any) => { // NOTE: Changed from allMaintenanceRecords to filteredRecords

      let nextDueDateTimestamp;

      if (record.nextDueDate) {

        if (typeof record.nextDueDate === 'string') {

          nextDueDateTimestamp = new Date(record.nextDueDate).getTime();

        } else if (record.nextDueDate.seconds) {

          nextDueDateTimestamp = record.nextDueDate.seconds * 1000;

        } else {

          nextDueDateTimestamp = record.nextDueDate;

        }

      }



      if (record.status !== 'Completed' && nextDueDateTimestamp && nextDueDateTimestamp > now) {

        allUpcomingTasks.push({

          ...record,

          id: `${record.id}-gen-actual`, // Use a different ID for actual scheduled tasks

          isGenerated: false,

          displayNextDueDate: record.nextDueDate

        });

      }



      // Generate future tasks for recurring preventive maintenance

      if (record.maintenanceType === 'Preventive Maintenance' && record.frequency && record.nextDueDate) {

        let currentGeneratedDate = record.nextDueDate;

        for (let i = 0; i < 24; i++) { // Generate up to 24 occurrences

          const nextGeneratedDate = calculateNextOccurrence(currentGeneratedDate, record.frequency);

          if (nextGeneratedDate) {

            const generatedTimestamp = new Date(nextGeneratedDate).getTime();

            if (generatedTimestamp > now && (generatedTimestamp - now) <= (2 * oneYear)) {

              allUpcomingTasks.push({

                ...record,

                id: `${record.id}-gen-${i}`,

                isGenerated: true,

                displayNextDueDate: nextGeneratedDate,

                status: 'Scheduled'

              });

              currentGeneratedDate = nextGeneratedDate;

            } else {

              break;

            }

          } else {

            break;

          }

        }

      }

    });



    const uniqueUpcomingTasks = Array.from(new Map(allUpcomingTasks.map(item =>

      [`${item.assetName}-${item.displayNextDueDate}-${item.maintenanceType}`, item])).values());





    const sortedTasks = uniqueUpcomingTasks.sort((a: any, b: any) => {

      let dateA = typeof a.displayNextDueDate === 'string' ? new Date(a.displayNextDueDate).getTime() : (a.displayNextDueDate.seconds ? a.displayNextDueDate.seconds * 1000 : a.displayNextDueDate);

      let dateB = typeof b.displayNextDueDate === 'string' ? new Date(b.displayNextDueDate).getTime() : (b.displayNextDueDate.seconds ? b.displayNextDueDate.seconds * 1000 : b.displayNextDueDate);

      return dateA - dateB;

    });



    const weekly = sortedTasks.filter((task: any) => {

        const nextDate = typeof task.displayNextDueDate === 'string' ? new Date(task.displayNextDueDate).getTime() : (task.displayNextDueDate.seconds ? task.displayNextDueDate.seconds * 1000 : task.displayNextDueDate);

        return (nextDate - now) <= oneWeek;

    });

    const monthly = sortedTasks.filter((task: any) => {

        const nextDate = typeof task.displayNextDueDate === 'string' ? new Date(task.displayNextDueDate).getTime() : (task.nextDueDate.seconds ? task.nextDueDate.seconds * 1000 : task.nextDueDate);

        return (nextDate - now) > oneWeek && (nextDate - now) <= oneMonth;

    });

    const annual = sortedTasks.filter((task: any) => {

        const nextDate = typeof task.displayNextDueDate === 'string' ? new Date(task.displayNextDueDate).getTime() : (task.nextDueDate.seconds ? task.nextDueDate.seconds * 1000 : task.nextDueDate);

        return (nextDate - now) > oneMonth && (nextDate - now) <= oneYear;

    });

    const future = sortedTasks.filter((task: any) => {

        const nextDate = typeof task.displayNextDueDate === 'string' ? new Date(task.displayNextDueDate).getTime() : (task.nextDueDate.seconds ? task.nextDueDate.seconds * 1000 : task.nextDueDate);

        return (nextDate - now) > oneYear;

    });



    return { all: sortedTasks, weekly, monthly, annual, future };

  };



  const upcomingTasksCategorized = getUpcomingMaintenanceTasks();



  // Function to gather all unique materials from all records

  const getAllMaterials = () => {

    const materialsMap: { [key: string]: { originalName: string, records: string[], systems: string[] } } = {};



    allMaintenanceRecords.forEach((record: any) => {

      if (record.materialsNeeded && record.materialsNeeded.length > 0) {

        record.materialsNeeded.forEach((material: string) => {

          const matKey = material.toLowerCase().trim();

          if (!materialsMap[matKey]) {

            materialsMap[matKey] = { originalName: material, records: [], systems: [] }; // Storing originalName

          }

          if (!materialsMap[matKey].records.includes(record.recordId)) {

            materialsMap[matKey].records.push(record.recordId);

          }

          if (!materialsMap[matKey].systems.includes(record.systemType)) {

            materialsMap[matKey].systems.push(record.systemType);

          }

        });

      }

    });



    return Object.keys(materialsMap).map(key => ({

      name: materialsMap[key].originalName, // Using the stored originalName

      records: materialsMap[key].records,

      systems: materialsMap[key].systems.sort().join(', ')

    })).sort((a, b) => a.name.localeCompare(b.name));

  };

  const allUniqueMaterials = getAllMaterials();





  // Functions for managing system types

  const handleAddSystemType = async () => {

    if (newSystemTypeName.trim() === '') {

      alert("Please enter a new system name.");

      return;

    }

    if (systemTypes.some(type => type.name.toLowerCase() === newSystemTypeName.trim().toLowerCase())) {

      alert("This system already exists.");

      return;

    }



    try {

      const docRef = await addDoc(collection(db, "system_types"), { name: newSystemTypeName.trim() });

      console.log("System type added with ID: ", docRef.id);

      setNewSystemTypeName('');

      fetchSystemTypes(); // Update the list

    } catch (e) {

      console.error("Error adding system type: ", e);

      alert("An error occurred while adding the system type.");

    }

  };



  const handleDeleteSystemType = async (id: string, name: string) => {

    if (!window.confirm(`Are you sure you want to delete system "${name}"? This will affect maintenance records using this system.`)) {

      return;

    }

    try {

      await deleteDoc(doc(db, "system_types", id));

      console.log("System type deleted successfully.");

      fetchSystemTypes(); // Update the list

      if (activeSystemFilter === name) {

        setActiveSystemFilter('all');

      }

      if (currentSystemType === name) {

        setCurrentSystemType(systemTypes.length > 1 ? systemTypes.filter(s => s.id !== id)[0].name : '');

      }

    } catch (e) {

      console.error("Error deleting system type: ", e);

      alert("An error occurred while deleting the system type.");

    }

  };





  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>

          <p className="text-gray-500">Manage maintenance records and schedules</p>

        </div>

        <div className="flex gap-2">

            <Button onClick={() => openRecordForm()} className="bg-blue-600 hover:bg-blue-700">

            <Plus className="h-4 w-4 mr-2" />

            Add New Record

            </Button>

            <Button variant="outline" onClick={() => setIsSystemManagementOpen(true)}>

                <Settings className="h-4 w-4 mr-2" />

                Manage Systems

            </Button>

        </div>

      </div>



      {/* Form for adding/editing a maintenance record */}

      {isFormOpen && (

        <Card className="p-6 mt-6">

          <CardTitle className="mb-4 text-xl">

            {editingRecord ? "Edit Maintenance Record" : "Add New Maintenance Record"}

          </CardTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            <Input

              placeholder="Asset Name (e.g., HVAC Unit 1)"

              value={currentAssetName}

              onChange={(e) => setCurrentAssetName(e.target.value)}

              className="col-span-full"

            />

             <Select value={currentMaintenanceType} onValueChange={setCurrentMaintenanceType}>

              <SelectTrigger className="w-full">

                <SelectValue placeholder="Maintenance Type" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="Preventive Maintenance">Preventive Maintenance</SelectItem>

                <SelectItem value="Corrective Maintenance (Repair)">Corrective Maintenance (Repair)</SelectItem>

                <SelectItem value="Predictive Maintenance (Inspection)">Predictive Maintenance (Inspection)</SelectItem>

                <SelectItem value="Installation">Installation</SelectItem>

              </SelectContent>

            </Select>

            <Input

              type="date"

              placeholder="Maintenance Date"

              value={currentDate}

              onChange={(e) => setCurrentDate(e.target.value)}

              className="w-full"

            />

            <Input

              type="number"

              placeholder="Cost (in currency)"

              value={currentCost}

              onChange={(e) => setCurrentCost(e.target.value)}

              className="w-full"

            />

            <Select value={currentStatus} onValueChange={setCurrentStatus}>

              <SelectTrigger className="w-full">

                <SelectValue placeholder="Status" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="Completed">Completed</SelectItem>

                <SelectItem value="Scheduled">Scheduled</SelectItem>

                <SelectItem value="In Progress">In Progress</SelectItem>

              </SelectContent>

            </Select>

            <Input

              placeholder="Assigned To (e.g., Team A)"

              value={currentAssignedTo}

              onChange={(e) => setCurrentAssignedTo(e.target.value)}

              className="w-full"

            />

            <Input

              type="date"

              placeholder="Next Due Date"

              value={currentNextDueDate}

              onChange={(e) => setCurrentNextDueDate(e.target.value)}

              className="w-full"

            />

            {/* System and Frequency fields - now dynamic */}

            <Select value={currentSystemType} onValueChange={setCurrentSystemType}>

              <SelectTrigger className="w-full">

                <SelectValue placeholder="System Type" />

              </SelectTrigger>

              <SelectContent>

                {/* No "All Systems" here, only actual systems */}

                {systemTypes.map((type) => (

                  <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>

                ))}

              </SelectContent>

            </Select>

            <Select value={currentFrequency} onValueChange={setCurrentFrequency}>

              <SelectTrigger className="w-full">

                <SelectValue placeholder="Frequency" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="Weekly">Weekly</SelectItem>

                <SelectItem value="Monthly">Monthly</SelectItem>

                <SelectItem value="Quarterly">Quarterly</SelectItem>

                <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>

                <SelectItem value="Annual">Annual</SelectItem>

                <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>

              </SelectContent>

            </Select>

            <Input

              placeholder="Detailed description of maintenance work"

              value={currentDescription}

              onChange={(e) => setCurrentDescription(e.target.value)}

              className="col-span-full"

            />

            <Input

              placeholder="Materials Needed (comma-separated, e.g., air filter, lubricating oil)"

              value={currentMaterials}

              onChange={(e) => setCurrentMaterials(e.target.value)}

              className="col-span-full"

            />

          </div>

          <div className="flex justify-end gap-2">

            <Button variant="outline" onClick={closeRecordForm}>Cancel</Button>

            <Button onClick={handleSaveRecord} className="bg-blue-600 hover:bg-blue-700">

              {editingRecord ? "Save Changes" : "Add Record"}

            </Button>

            {editingRecord && (

              <Button variant="destructive" onClick={handleDeleteRecord}>

                <Trash2 className="h-4 w-4 mr-2" /> Delete Record

              </Button>

            )}

          </div>

        </Card>

      )}



      {/* Tabs and Filters */}

      <div className="flex flex-col md:flex-row gap-4">

        {/* Maintenance Type Tabs */}

        <Tabs value={activeMaintenanceTab} onValueChange={setActiveMaintenanceTab} className="flex-1">

          <TabsList className="grid w-full grid-cols-5">

            <TabsTrigger value="all">All ({allMaintenanceRecords.length})</TabsTrigger>

            <TabsTrigger value="preventive">Preventive ({totalPreventive})</TabsTrigger>

            <TabsTrigger value="corrective">Corrective ({totalCorrective})</TabsTrigger>

            <TabsTrigger value="predictive">Predictive ({totalPredictive})</TabsTrigger>

            <TabsTrigger value="materials">Materials Needed ({allUniqueMaterials.length})</TabsTrigger>

          </TabsList>



          {/* *** START OF CORRECT TABS CONTENT NESTING *** */}

          {/* All TabsContent must be inside this Tabs component */}



          <TabsContent value="all">

            {/* Maintenance Records Cards */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {filteredRecords.length > 0 ? (

                filteredRecords.map((record) => (

                  <Card key={record.id} className="hover:shadow-lg transition-shadow duration-200">

                    <CardHeader>

                      <div className="flex items-start justify-between">

                        <div>

                          <CardTitle className="text-lg">{record.assetName}</CardTitle>

                          <p className="text-sm text-gray-500 mt-1">{record.recordId}</p>

                        </div>

                        <Badge className={getStatusColor(record.status)}>

                          {record.status}

                        </Badge>

                      </div>

                    </CardHeader>

                    <CardContent>

                      <div className="space-y-3 text-sm">

                        <div className="flex justify-between">

                          <span className="text-gray-600">Maintenance Type:</span>

                          <span className="font-medium">{record.maintenanceType}</span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">System:</span>

                          <span className="font-medium">{record.systemType}</span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Maintenance Date:</span>

                          <span className="font-medium flex items-center gap-1">

                            <CalendarDays className="h-3 w-3" />

                            {record.date}

                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Cost:</span>

                          <span className="font-medium flex items-center gap-1">

                            <DollarSign className="h-3 w-3" />

                            {record.cost}

                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Assigned To:</span>

                          <span className="font-medium">{record.assignedTo}</span>

                        </div>

                        {record.materialsNeeded && record.materialsNeeded.length > 0 && (

                          <div className="flex justify-between">

                            <span className="text-gray-600">Materials Needed:</span>

                            <span className="font-medium">{record.materialsNeeded.join(', ')}</span>

                          </div>

                        )}

                        <p className="text-gray-600 mt-2">{record.description}</p>

                        <div className="pt-2 border-t flex justify-between">

                          <span className="text-xs text-gray-500">

                            Next Due Date: {record.nextDueDate} ({record.frequency})

                          </span>

                          <Button variant="outline" size="sm" onClick={() => openRecordForm(record)}>

                            <Edit className="h-4 w-4 mr-2" />

                            Manage Record

                          </Button>

                        </div>

                      </div>

                    </CardContent>

                  </Card>

                ))

              ) : (

                <p className="text-center text-gray-500 col-span-full">

                  Loading maintenance records or no records currently match the selected filters.

                </p>

              )}

            </div>

          </TabsContent>



          <TabsContent value="preventive">

            <div className="flex justify-end mb-4">

              <Select value={preventiveTimeframeFilter} onValueChange={setPreventiveTimeframeFilter}>

                <SelectTrigger className="w-[200px]">

                  <SelectValue placeholder="Select Timeframe" />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="all">All Preventive Tasks</SelectItem>

                  <SelectItem value="weekly">Next 7 Days</SelectItem>

                  <SelectItem value="monthly">Next 30 Days</SelectItem>

                  <SelectItem value="annual">This Year</SelectItem>

                  <SelectItem value="future">Beyond This Year</SelectItem>

                </SelectContent>

              </Select>

            </div>



            {/* Maintenance Records Cards - Preventive (filtered by timeframe) */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {(() => {

                let tasksToDisplay = [];

                if (preventiveTimeframeFilter === 'weekly') {

                  tasksToDisplay = upcomingTasksCategorized.weekly;

                } else if (preventiveTimeframeFilter === 'monthly') {

                  tasksToDisplay = upcomingTasksCategorized.monthly;

                } else if (preventiveTimeframeFilter === 'annual') {

                  tasksToDisplay = upcomingTasksCategorized.annual;

                } else if (preventiveTimeframeFilter === 'future') {

                  tasksToDisplay = upcomingTasksCategorized.future;

                } else {

                  tasksToDisplay = filteredRecords.filter((rec:any) => rec.maintenanceType === 'Preventive Maintenance');

                }



                return tasksToDisplay.length > 0 ? (

                  tasksToDisplay.map((record) => (

                    <Card key={record.id} className="hover:shadow-lg transition-shadow duration-200">

                      <CardHeader>

                        <div className="flex items-start justify-between">

                          <div>

                            <CardTitle className="text-lg">{record.assetName}</CardTitle>

                            <p className="text-sm text-gray-500 mt-1">{record.recordId}</p>

                          </div>

                          <Badge className={getStatusColor(record.status)}>

                            {record.status}

                          </Badge>

                        </div>

                      </CardHeader>

                      <CardContent>

                        <div className="space-y-3 text-sm">

                          <div className="flex justify-between">

                            <span className="text-gray-600">Maintenance Type:</span>

                            <span className="font-medium">{record.maintenanceType}</span>

                          </div>

                          <div className="flex justify-between">

                            <span className="text-gray-600">System:</span>

                            <span className="font-medium">{record.systemType}</span>

                          </div>

                          <div className="flex justify-between">

                            <span className="text-gray-600">Maintenance Date:</span>

                            <span className="font-medium flex items-center gap-1">

                              <CalendarDays className="h-3 w-3" />

                              {record.date}

                            </span>

                          </div>

                          <div className="flex justify-between">

                            <span className="text-gray-600">Cost:</span>

                            <span className="font-medium flex items-center gap-1">

                              <DollarSign className="h-3 w-3" />

                              {record.cost}

                            </span>

                          </div>

                          <div className="flex justify-between">

                            <span className="text-gray-600">Assigned To:</span>

                            <span className="font-medium">{record.assignedTo}</span>

                          </div>

                          {record.materialsNeeded && record.materialsNeeded.length > 0 && (

                            <div className="flex justify-between">

                              <span className="text-gray-600">Materials Needed:</span>

                              <span className="font-medium">{record.materialsNeeded.join(', ')}</span>

                            </div>

                          )}

                          <p className="text-gray-600 mt-2">{record.description}</p>

                          <div className="pt-2 border-t flex justify-between">

                            <span className="text-xs text-gray-500">

                              Next Due Date: {record.displayNextDueDate || record.nextDueDate} ({record.frequency})

                            </span>

                            <Button variant="outline" size="sm" onClick={() => openRecordForm(record)}>

                              <Edit className="h-4 w-4 mr-2" />

                              Manage Record

                            </Button>

                          </div>

                        </div>

                      </CardContent>

                    </Card>

                  ))

                ) : (

                  <p className="text-center text-gray-500 col-span-full">

                    No preventive maintenance records currently match the selected filters and timeframe.

                  </p>

                );

              })()}

            </div>

          </TabsContent>



          <TabsContent value="corrective">

            {/* Maintenance Records Cards - Corrective */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {filteredRecords.length > 0 ? (

                filteredRecords.map((record) => (

                  <Card key={record.id} className="hover:shadow-lg transition-shadow duration-200">

                    <CardHeader>

                      <div className="flex items-start justify-between">

                        <div>

                          <CardTitle className="text-lg">{record.assetName}</CardTitle>

                          <p className="text-sm text-gray-500 mt-1">{record.recordId}</p>

                        </div>

                        <Badge className={getStatusColor(record.status)}>

                          {record.status}

                        </Badge>

                      </div>

                    </CardHeader>

                    <CardContent>

                      <div className="space-y-3 text-sm">

                        <div className="flex justify-between">

                          <span className="text-gray-600">Maintenance Type:</span>

                          <span className="font-medium">{record.maintenanceType}</span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">System:</span>

                          <span className="font-medium">{record.systemType}</span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Maintenance Date:</span>

                          <span className="font-medium flex items-center gap-1">

                            <CalendarDays className="h-3 w-3" />

                            {record.date}

                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Cost:</span>

                          <span className="font-medium flex items-center gap-1">

                            <DollarSign className="h-3 w-3" />

                            {record.cost}

                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Assigned To:</span>

                          <span className="font-medium">{record.assignedTo}</span>

                        </div>

                        {record.materialsNeeded && record.materialsNeeded.length > 0 && (

                          <div className="flex justify-between">

                            <span className="text-gray-600">Materials Needed:</span>

                            <span className="font-medium">{record.materialsNeeded.join(', ')}</span>

                          </div>

                        )}

                        <p className="text-gray-600 mt-2">{record.description}</p>

                        <div className="pt-2 border-t flex justify-between">

                          <span className="text-xs text-gray-500">

                            Next Due Date: {record.nextDueDate} ({record.frequency})

                          </span>

                          <Button variant="outline" size="sm" onClick={() => openRecordForm(record)}>

                            <Edit className="h-4 w-4 mr-2" />

                            Manage Record

                          </Button>

                        </div>

                      </div>

                    </CardContent>

                  </Card>

                ))

              ) : (

                <p className="text-center text-gray-500 col-span-full">

                  No corrective maintenance records currently match the selected filters.

                </p>

              )}

            </div>

          </TabsContent>



          <TabsContent value="predictive">

            {/* Maintenance Records Cards - Predictive */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {filteredRecords.length > 0 ? (

                filteredRecords.map((record) => (

                  <Card key={record.id} className="hover:shadow-lg transition-shadow duration-200">

                    <CardHeader>

                      <div className="flex items-start justify-between">

                        <div>

                          <CardTitle className="text-lg">{record.assetName}</CardTitle>

                          <p className="text-sm text-gray-500 mt-1">{record.recordId}</p>

                        </div>

                        <Badge className={getStatusColor(record.status)}>

                          {record.status}

                        </Badge>

                      </div>

                    </CardHeader>

                    <CardContent>

                      <div className="space-y-3 text-sm">

                        <div className="flex justify-between">

                          <span className="text-gray-600">Maintenance Type:</span>

                          <span className="font-medium">{record.maintenanceType}</span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">System:</span>

                          <span className="font-medium">{record.systemType}</span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Maintenance Date:</span>

                          <span className="font-medium flex items-center gap-1">

                            <CalendarDays className="h-3 w-3" />

                            {record.date}

                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Cost:</span>

                          <span className="font-medium flex items-center gap-1">

                            <DollarSign className="h-3 w-3" />

                            {record.cost}

                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-gray-600">Assigned To:</span>

                          <span className="font-medium">{record.assignedTo}</span>

                        </div>

                        {record.materialsNeeded && record.materialsNeeded.length > 0 && (

                          <div className="flex justify-between">

                            <span className="text-gray-600">Materials Needed:</span>

                            <span className="font-medium">{record.materialsNeeded.join(', ')}</span>

                          </div>

                        )}

                        <p className="text-gray-600 mt-2">{record.description}</p>

                        <div className="pt-2 border-t flex justify-between">

                          <span className="text-xs text-gray-500">

                            Next Due Date: {record.nextDueDate} ({record.frequency})

                          </span>

                          <Button variant="outline" size="sm" onClick={() => openRecordForm(record)}>

                            <Edit className="h-4 w-4 mr-2" />

                            Manage Record

                          </Button>

                        </div>

                      </div>

                    </CardContent>

                  </Card>

                ))

              ) : (

                <p className="text-center text-gray-500 col-span-full">

                  No predictive maintenance records currently match the selected filters.

                </p>

              )}

            </div>

          </TabsContent>



          {/* New Tab Content for Materials */}

          <TabsContent value="materials">

            <Card>

              <CardHeader>

                <CardTitle>Materials Required for Maintenance Tasks</CardTitle>

                <p className="text-sm text-gray-500">List of all materials required across maintenance records</p>

              </CardHeader>

              <CardContent>

                {allUniqueMaterials.length > 0 ? (

                  <div className="space-y-4">

                    {allUniqueMaterials.map((material: any) => (

                      <div key={material.name} className="p-3 border rounded-md bg-gray-50">

                        <h3 className="font-semibold text-lg">{material.name}</h3>

                        <p className="text-sm text-gray-600">

                          Required for Systems: <span className="font-medium">{material.systems}</span>

                        </p>

                        <p className="text-sm text-gray-600">

                          Found in Records: <span className="font-medium">{material.records.join(', ')}</span>

                        </p>

                      </div>

                    ))}

                  </div>

                ) : (

                  <p className="text-center text-gray-500">No materials required currently recorded.</p>

                )}

              </CardContent>

            </Card>

          </TabsContent>





          {/* Upcoming Maintenance Timetable */}

          <Card>

            <CardHeader>

              <CardTitle>Upcoming Preventive Maintenance Schedule</CardTitle>

              <p className="text-sm text-gray-500">Scheduled asset maintenance in the future (including recurring)</p>

            </CardHeader>

            <CardContent className="space-y-4">

              {upcomingTasksCategorized.all.length === 0 && (

                <p className="text-center text-gray-500">No upcoming preventive maintenance tasks.</p>

              )}

              {upcomingTasksCategorized.weekly.length > 0 && (

                <div>

                  <h3 className="text-lg font-semibold mb-2">This Week ({upcomingTasksCategorized.weekly.length})</h3>

                  <div className="space-y-2">

                    {upcomingTasksCategorized.weekly.map((task: any) => (

                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">

                        <span className="font-medium">{task.assetName} ({task.systemType}) - {task.maintenanceType}</span>

                        <span className="text-sm text-gray-600">Scheduled for: {task.displayNextDueDate}</span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {upcomingTasksCategorized.monthly.length > 0 && (

                <div>

                  <h3 className="text-lg font-semibold mb-2">This Month ({upcomingTasksCategorized.monthly.length})</h3>

                  <div className="space-y-2">

                    {upcomingTasksCategorized.monthly.map((task: any) => (

                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">

                        <span className="font-medium">{task.assetName} ({task.systemType}) - {task.maintenanceType}</span>

                        <span className="text-sm text-gray-600">Scheduled for: {task.displayNextDueDate}</span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {upcomingTasksCategorized.annual.length > 0 && (

                <div>

                  <h3 className="text-lg font-semibold mb-2">This Year ({upcomingTasksCategorized.annual.length})</h3>

                  <div className="space-y-2">

                    {upcomingTasksCategorized.annual.map((task: any) => (

                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">

                        <span className="font-medium">{task.assetName} ({task.systemType}) - {task.maintenanceType}</span>

                        <span className="text-sm text-gray-600">Scheduled for: {task.displayNextDueDate}</span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {upcomingTasksCategorized.future.length > 0 && (

                <div>

                  <h3 className="text-lg font-semibold mb-2">Beyond this Year ({upcomingTasksCategorized.future.length})</h3>

                  <div className="space-y-2">

                    {upcomingTasksCategorized.future.map((task: any) => (

                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">

                        <span className="font-medium">{task.assetName} ({task.systemType}) - {task.maintenanceType}</span>

                        <span className="text-sm text-gray-600">Scheduled for: {task.displayNextDueDate}</span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </CardContent>

          </Card>



          {/* Dialog for System Management */}

        </Tabs>

      </div>



      {/* Dialog for System Management (This is outside the main Tabs component) */}

      <Dialog open={isSystemManagementOpen} onOpenChange={setIsSystemManagementOpen}>

        <DialogContent>

          <DialogHeader>

            <DialogTitle>Manage System Types</DialogTitle>

          </DialogHeader>

          <div className="space-y-4">

            <div>

              <h3 className="text-lg font-semibold mb-2">Add New System</h3>

              <div className="flex gap-2">

                <Input

                  placeholder="New System Name (e.g., HVAC)"

                  value={newSystemTypeName}

                  onChange={(e) => setNewSystemTypeName(e.target.value)}

                />

                <Button onClick={handleAddSystemType}>Add</Button>

              </div>

            </div>



            <div>

              <h3 className="text-lg font-semibold mb-2">Current Systems</h3>

              <ul className="space-y-2">

                {systemTypes.length > 0 ? (

                  systemTypes.map((type) => (

                    <li key={type.id} className="flex items-center justify-between p-2 border rounded">

                      <span>{type.name}</span>

                      <Button

                        variant="destructive"

                        size="sm"

                        onClick={() => handleDeleteSystemType(type.id, type.name)}

                      >

                        <Trash2 className="h-4 w-4" />

                      </Button>

                    </li>

                  ))

                ) : (

                  <p className="text-gray-500">No systems defined yet.</p>

                )}

              </ul>

            </div>

          </div>

          <DialogFooter>

            <Button variant="outline" onClick={() => setIsSystemManagementOpen(false)}>Close</Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



    </div>

  );

}