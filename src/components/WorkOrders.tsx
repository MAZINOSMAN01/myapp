import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useLocation } from 'react-router-dom';

// Import db from central config file
import { db } from '../firebase/config.js';


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // **تم تصحيح هذا السطر: من `=>` إلى `from`**
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Wrench, Search, Plus, Edit, Clock, User, AlertCircle, Trash2, XCircle, Settings } from "lucide-react";

export function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // States for form input fields
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentPriority, setCurrentPriority] = useState('Medium');
  const [currentStatus, setCurrentStatus] = useState('Pending');
  const [currentDueDate, setCurrentDueDate] = useState('');
  const [currentFacility, setCurrentFacility] = useState('');
  const [currentFloor, setCurrentFloor] = useState('');
  const [currentType, setCurrentType] = useState('');
  const [currentAssignedTo, setCurrentAssignedTo] = useState('');

  // Dynamic dropdown lists
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);
  const [workOrderTypesList, setWorkOrderTypesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // States for managing lists in pop-up dialogs
  const [isManageFacilitiesOpen, setIsManageFacilitiesOpen] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [newWorkOrderTypeName, setNewWorkOrderTypeName] = useState('');


  const location = useLocation();
  const [currentFilter, setCurrentFilter] = useState<string | null>(null);

  // Function to fetch work orders from Firebase
  const fetchWorkOrders = async () => {
    console.log("Attempting to fetch work orders from Firebase...");
    try {
      const querySnapshot = await getDocs(collection(db, "work_orders"));
      console.log("Query Snapshot received:", querySnapshot);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Fetched orders:", orders);
      setWorkOrders(orders);
    } catch (error) {
      console.error("Error fetching work orders: ", error);
    }
  };

  // Functions to fetch dynamic lists
  const fetchFacilities = async () => {
    console.log("Attempting to fetch facilities list...");
    try {
      const snapshot = await getDocs(collection(db, "facilities"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setFacilitiesList(list);
      if (list.length > 0 && !list.some(f => f.name === currentFacility)) {
        setCurrentFacility(list[0].name);
      } else if (list.length === 0) {
        setCurrentFacility('');
      }
    } catch (error) { console.error("Error fetching facilities:", error); }
  };

  const fetchWorkOrderTypes = async () => {
    console.log("Attempting to fetch work order types list...");
    try {
      const snapshot = await getDocs(collection(db, "work_order_types"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setWorkOrderTypesList(list);
      if (list.length > 0 && !list.some(t => t.name === currentType)) {
        setCurrentType(list[0].name);
      } else if (list.length === 0) {
        setCurrentType('');
      }
    } catch (error) { console.error("Error fetching work order types:", error); }
  };

  const fetchUsersList = async () => {
    console.log("Attempting to fetch users list for assignedTo...");
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })); // Fetch user name
      setUsersList(list);
      if (list.length > 0 && !list.some(u => u.name === currentAssignedTo)) {
        setCurrentAssignedTo(list[0].name);
      } else if (list.length === 0) {
        setCurrentAssignedTo('');
      }
    } catch (error) { console.error("Error fetching users list:", error); }
  };


  useEffect(() => {
    fetchWorkOrders();
    fetchFacilities();
    fetchWorkOrderTypes();
    fetchUsersList();
  }, []);

  useEffect(() => {
    if (location.state && location.state.filter) {
      setCurrentFilter(location.state.filter);
      console.log("Filter received from Dashboard:", location.state.filter);
    } else {
      setCurrentFilter(null);
    }
  }, [location.state]);

  const openOrderForm = (orderToEdit: any = null) => {
    if (orderToEdit) {
      setEditingOrder(orderToEdit);
      setCurrentTitle(orderToEdit.title || '');
      setCurrentDescription(orderToEdit.description || '');
      setCurrentPriority(orderToEdit.priority || 'Medium');
      setCurrentStatus(orderToEdit.status || 'Pending');
      setCurrentDueDate(orderToEdit.dueDate || '');
      setCurrentFacility(orderToEdit.facility || (facilitiesList.length > 0 ? facilitiesList[0].name : ''));
      setCurrentFloor(orderToEdit.floor || '');
      setCurrentType(orderToEdit.type || (workOrderTypesList.length > 0 ? workOrderTypesList[0].name : ''));
      setCurrentAssignedTo(orderToEdit.assignedTo || (usersList.length > 0 ? usersList[0].name : ''));
    } else {
      setEditingOrder(null);
      setCurrentTitle('');
      setCurrentDescription('');
      setCurrentPriority('Medium');
      setCurrentStatus('Pending');
      setCurrentDueDate('');
      setCurrentFacility(facilitiesList.length > 0 ? facilitiesList[0].name : '');
      setCurrentFloor('');
      setCurrentType(workOrderTypesList.length > 0 ? workOrderTypesList[0].name : '');
      setCurrentAssignedTo(usersList.length > 0 ? usersList[0].name : '');
    }
    setIsFormOpen(true);
  };

  const closeOrderForm = () => {
    setIsFormOpen(false);
    setEditingOrder(null);
    setCurrentTitle('');
    setCurrentDescription('');
    setCurrentPriority('Medium');
    setCurrentStatus('Pending');
    setCurrentDueDate('');
    setCurrentFacility('');
    setCurrentFloor('');
    setCurrentType('');
    setCurrentAssignedTo('');
  };

  const handleSaveOrder = async () => {
    if (!currentTitle || !currentDueDate || !currentFacility || !currentType || !currentAssignedTo) {
      alert("Please enter Title, Due Date, Facility, Type, and Assigned To.");
      return;
    }

    const orderData = {
      title: currentTitle,
      description: currentDescription,
      priority: currentPriority,
      status: currentStatus,
      dueDate: currentDueDate,
      facility: currentFacility,
      floor: currentFloor,
      type: currentType,
      assignedTo: currentAssignedTo,
      created: editingOrder?.created || new Date().toISOString().slice(0, 10),
    };

    try {
      if (editingOrder) {
        console.log("Attempting to update work order:", editingOrder.id);
        const orderRef = doc(db, "work_orders", editingOrder.id);
        await updateDoc(orderRef, orderData);
        console.log("Document updated successfully.");
      } else {
        console.log("Attempting to add new work order...");
        const docRef = await addDoc(collection(db, "work_orders"), orderData);
        console.log("Document added with ID: ", docRef.id);
      }
      closeOrderForm();
      fetchWorkOrders();

    } catch (e) {
      console.error("Error saving document: ", e);
      alert("An error occurred while saving the work order. Please check the Console for more details.");
    }
  };

  const handleDeleteOrder = async () => {
    if (!editingOrder || !window.confirm(`Are you sure you want to delete work order: "${editingOrder.title}"?`)) {
      return;
    }

    console.log("Attempting to delete work order:", editingOrder.id);
    try {
      const orderRef = doc(db, "work_orders", editingOrder.id);
      await deleteDoc(orderRef);
      console.log("Document deleted successfully.");
      closeOrderForm();
      fetchWorkOrders();

    } catch (e) {
      console.error("Error deleting document: ", e);
      alert("An error occurred while deleting the work order. Please check the Console.");
    }
  };

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

  const filteredWorkOrders = workOrders.filter(order => {
    if (!currentFilter) {
      return true;
    }

    switch (currentFilter) {
      case 'Open':
        return order.status === 'Pending' || order.status === 'In Progress' || order.status === 'Scheduled';
      case 'Completed':
        return order.status === 'Completed';
      case 'In Progress':
        return order.status === 'In Progress';
      case 'Scheduled':
        return order.status === 'Scheduled';
      case 'Overdue':
        const now = Date.now();
        let dueDateTimestamp;
        if (order.dueDate) {
          if (typeof order.dueDate === 'string') {
            dueDateTimestamp = new Date(order.dueDate).getTime();
          } else if (order.dueDate.seconds) {
            dueDateTimestamp = order.dueDate.seconds * 1000;
          } else {
            dueDateTimestamp = order.dueDate;
          }
        }
        return order.status !== 'Completed' && dueDateTimestamp < now;
      case 'Users':
        return false;
      case 'ActiveTasks':
        return false;
      case 'CompletionRate':
        return false;
      default:
        return true;
    }
  });

  // Functions for managing facilities
  const handleAddFacility = async () => {
    if (newFacilityName.trim() === '') {
      alert("Please enter a new facility name.");
      return;
    }
    if (facilitiesList.some(fac => fac.name.toLowerCase() === newFacilityName.trim().toLowerCase())) {
      alert("This facility already exists.");
      return;
    }
    try {
      await addDoc(collection(db, "facilities"), { name: newFacilityName.trim() });
      setNewFacilityName('');
      fetchFacilities();
    } catch (e) { console.error("Error adding facility:", e); alert("An error occurred."); }
  };

  const handleDeleteFacility = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete facility "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "facilities", id));
      fetchFacilities();
      if (currentFacility === name) setCurrentFacility(facilitiesList.length > 1 ? facilitiesList[0].name : '');
    } catch (e) { console.error("Error deleting facility:", e); alert("An error occurred."); }
  };

  // Functions for managing work order types
  const handleAddWorkOrderType = async () => {
    if (newWorkOrderTypeName.trim() === '') {
      alert("Please enter a new work order type name.");
      return;
    }
    if (workOrderTypesList.some(type => type.name.toLowerCase() === newWorkOrderTypeName.trim().toLowerCase())) {
      alert("This work order type already exists.");
      return;
    }
    try {
      await addDoc(collection(db, "work_order_types"), { name: newWorkOrderTypeName.trim() });
      setNewWorkOrderTypeName('');
      fetchWorkOrderTypes();
    } catch (e) { console.error("Error adding work order type:", e); alert("An error occurred."); }
  };

  const handleDeleteWorkOrderType = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete work order type "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "work_order_types", id));
      fetchWorkOrderTypes();
      if (currentType === name) setCurrentType(workOrderTypesList.length > 1 ? workOrderTypesList[0].name : '');
    } catch (e) { console.error("Error deleting work order type:", e); alert("An error occurred."); }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500">Manage maintenance tasks and requests</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openOrderForm()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
          <Button variant="outline" onClick={() => setIsManageFacilitiesOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Manage Facilities
          </Button>
          <Button variant="outline" onClick={() => setIsManageTypesOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Manage Types
          </Button>
        </div>
      </div>

      {/* New/Edit Work Order Form */}
      {isFormOpen && (
        <Card className="p-6 mt-6">
          <CardTitle className="mb-4 text-xl">
            {editingOrder ? "Edit Work Order" : "Create New Work Order"}
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Work Order Title"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              className="col-span-full"
            />
            <Input
              placeholder="Work Order Description"
              value={currentDescription}
              onChange={(e) => setCurrentDescription(e.target.value)}
              className="col-span-full"
            />
            <Select value={currentPriority} onValueChange={setCurrentPriority}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currentStatus} onValueChange={setCurrentStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Due Date"
              value={currentDueDate}
              onChange={(e) => setCurrentDueDate(e.target.value)}
              className="w-full"
            />
            {/* Dynamic Facility, Type, and Assigned To fields */}
            <Select value={currentFacility} onValueChange={setCurrentFacility}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                {facilitiesList.map((fac) => (
                  <SelectItem key={fac.id} value={fac.name}>{fac.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Floor (optional)"
              value={currentFloor}
              onChange={(e) => setCurrentFloor(e.target.value)}
              className="w-full"
            />
            <Select value={currentType} onValueChange={setCurrentType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {workOrderTypesList.map((type) => (
                  <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currentAssignedTo} onValueChange={setCurrentAssignedTo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                {usersList.map((user) => (
                  <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeOrderForm}>Cancel</Button>
            <Button onClick={handleSaveOrder} className="bg-blue-600 hover:bg-blue-700">
              {editingOrder ? "Save Changes" : "Save Work Order"}
            </Button>
            {editingOrder && (
              <Button variant="destructive" onClick={handleDeleteOrder}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Work Order
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Search and Filter Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search work orders by ID, facility, or type..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredWorkOrders.length}</div>
              <p className="text-sm text-gray-500">
                {currentFilter ? `Filtered: ${currentFilter} Orders` : "Total Orders"}
                {currentFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setCurrentFilter(null)} className="ml-2 p-1 h-auto">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Work Order Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkOrders.length > 0 ? (
          filteredWorkOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{order.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Facility:</span>
                    <span className="font-medium">{order.facility} - {order.floor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{order.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Assigned to:</span>
                    <span className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {order.assignedTo}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 mb-2">{order.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created: {order.created}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-4 text-orange-500" />
                        Due: {order.dueDate}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => openOrderForm(order)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Manage Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full">
            {currentFilter ? `No work orders found with status "${currentFilter}".` : "Loading work orders or no work orders currently in Firebase Firestore."}
          </p>
        )}
      </div>

      {/* Summary Stats - these numbers are dynamic now */}
      <Card>
        <CardHeader>
          <CardTitle>Work Order Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {workOrders.filter(order => order.status === 'Pending' || order.status === 'In Progress' || order.status === 'Scheduled').length}
              </div>
              <p className="text-sm text-gray-500">Open</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {workOrders.filter(order => order.status === 'Completed').length}
              </div>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {workOrders.filter(order => order.status === 'In Progress').length}
              </div>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {workOrders.filter(order => order.status === 'Scheduled').length}
              </div>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {workOrders.filter(order => order.status !== 'Completed' && new Date(order.dueDate).getTime() < Date.now()).length}
              </div>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Manage Facilities */}
      <Dialog open={isManageFacilitiesOpen} onOpenChange={setIsManageFacilitiesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Facilities</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Add New Facility</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="New Facility Name (e.g., Building D)"
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                />
                <Button onClick={handleAddFacility}>Add</Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Facilities</h3>
              <ul className="space-y-2">
                {facilitiesList.length > 0 ? (
                  facilitiesList.map((fac) => (
                    <li key={fac.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{fac.name}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteFacility(fac.id, fac.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No facilities defined yet.</p>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageFacilitiesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Manage Work Order Types */}
      <Dialog open={isManageTypesOpen} onOpenChange={setIsManageTypesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Work Order Types</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Add New Type</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="New Type Name (e.g., Plumbing)"
                  value={newWorkOrderTypeName}
                  onChange={(e) => setNewWorkOrderTypeName(e.target.value)}
                />
                <Button onClick={handleAddWorkOrderType}>Add</Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Types</h3>
              <ul className="space-y-2">
                {workOrderTypesList.length > 0 ? (
                  workOrderTypesList.map((type) => (
                    <li key={type.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{type.name}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteWorkOrderType(type.id, type.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No types defined yet.</p>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageTypesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}