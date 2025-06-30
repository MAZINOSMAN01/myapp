// src/components/UserManagement.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/config.js';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Edit, Trash2 } from "lucide-react";

const getRoleColor = (role: string) => { 
  switch (role) { 
    case "High Manager": return "bg-blue-100 text-blue-800"; 
    case "Engineer": return "bg-green-100 text-green-800"; 
    case "Technician": return "bg-yellow-100 text-yellow-800"; 
    default: return "bg-gray-100 text-gray-800"; 
  } 
};

const getStatusColor = (status: string) => { 
  switch (status) { 
    case "Active": return "bg-green-100 text-green-800"; 
    case "Inactive": return "bg-red-100 text-red-800"; 
    default: return "bg-gray-100 text-gray-800"; 
  } 
};

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [currentName, setCurrentName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentRole, setCurrentRole] = useState('Engineer');
  const [currentStatus, setCurrentStatus] = useState('Active');
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
    } catch (error) { console.error("Error fetching users: ", error); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openUserForm = (userToEdit: any = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setCurrentName(userToEdit.name || '');
      setCurrentEmail(userToEdit.email || '');
      setCurrentRole(userToEdit.role || 'Engineer');
      setCurrentStatus(userToEdit.status || 'Active');
      setCurrentDescription(userToEdit.description || '');
      setCurrentPermissions(userToEdit.permissions || []);
    } else {
      setEditingUser(null);
      setCurrentName('');
      setCurrentEmail('');
      setCurrentRole('Engineer');
      setCurrentStatus('Active');
      setCurrentDescription('');
      setCurrentPermissions([]);
    }
    setIsFormOpen(true);
  };

  const closeUserForm = () => setIsFormOpen(false);

  const handleSaveUser = async () => {
    if (!currentName || !currentEmail || !currentRole) {
      alert("Please enter Name, Email, and Role.");
      return;
    }
    const userData = { name: currentName, email: currentEmail, role: currentRole, status: currentStatus, description: currentDescription, permissions: currentPermissions };
    try {
      if (editingUser) { await updateDoc(doc(db, "users", editingUser.id), userData); } 
      else { await addDoc(collection(db, "users"), userData); }
      closeUserForm();
      fetchUsers();
    } catch (e) { console.error("Error saving user: ", e); alert("An error occurred while saving the user."); }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user: "${userName}"?`)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchUsers();
      if(editingUser && editingUser.id === userId) { closeUserForm(); }
    } catch (e) { console.error("Error deleting user: ", e); alert("An error occurred while deleting the user."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage users, roles, and permissions</p>
        </div>
        <Button onClick={() => openUserForm()} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {isFormOpen && (
        <Card className="p-6 mt-6"><CardTitle className="mb-4 text-xl">{editingUser ? "Edit User" : "Add New User"}</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input placeholder="Full Name" value={currentName} onChange={(e) => setCurrentName(e.target.value)} className="col-span-full" />
            <Input type="email" placeholder="Email" value={currentEmail} onChange={(e) => setCurrentEmail(e.target.value)} className="col-span-full" />
            <Select value={currentRole} onValueChange={setCurrentRole}><SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="High Manager">High Manager</SelectItem><SelectItem value="Engineer">Engineer</SelectItem><SelectItem value="Technician">Technician</SelectItem></SelectContent></Select>
            <Select value={currentStatus} onValueChange={setCurrentStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
            <Input placeholder="Description / Notes (optional)" value={currentDescription} onChange={(e) => setCurrentDescription(e.target.value)} className="col-span-full" />
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={closeUserForm}>Cancel</Button><Button onClick={handleSaveUser} className="bg-blue-600 hover:bg-blue-700">{editingUser ? "Save Changes" : "Add User"}</Button></div>
        </Card>
      )}

      {/* --- Unified Grid System (12 columns) --- */}
      <div className="grid grid-cols-12 gap-6">

        {/* Search Bar (Spans 9 columns on large screens) */}
        <div className="col-span-12 lg:col-span-9">
            <Input placeholder="Search for a user..." />
        </div>

        {/* Total Users Card (Spans 3 columns on large screens) */}
        <div className="col-span-12 lg:col-span-3">
            <Card className="h-full">
              <CardContent className="flex items-center justify-center pt-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>
              </CardContent>
            </Card>
        </div>
        
        {/* User Cards (Each card spans 4 columns, so 3 cards per row) */}
        {users.length > 0 ? (
          users.map((user) => (
            <div key={user.id} className="col-span-12 md:col-span-6 lg:col-span-4">
              <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-gray-600 border-t pt-3 min-h-[50px]">{user.description || 'No description provided.'}</p>
                  <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openUserForm(user)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id, user.name)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="col-span-12">
            <p className="text-center text-gray-500 py-10">Loading users or no users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}