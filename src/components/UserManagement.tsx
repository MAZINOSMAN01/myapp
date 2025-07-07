import React, { useEffect, useState } from 'react';
// ⭐ --- هذا هو السطر الذي تم إصلاحه --- ⭐
// تم استيراد DocumentData من مكتبة فايربايز
import { collection, getDocs, doc, updateDoc, setDoc, DocumentData } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Shield, Briefcase, HardHat, Wrench, UserPlus } from 'lucide-react';

// الواجهة الآن تعمل بشكل صحيح لأن DocumentData تم استيراده
export interface UserDoc extends DocumentData {
  id: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Engineer' | 'Technician';
  displayName?: string;
}

// Map roles to specific icons and colors for better UI
const roleConfig = {
  Admin: { icon: Shield, color: 'bg-red-100 text-red-800' },
  Manager: { icon: Briefcase, color: 'bg-blue-100 text-blue-800' },
  Engineer: { icon: HardHat, color: 'bg-yellow-100 text-yellow-800' },
  Technician: { icon: Wrench, color: 'bg-green-100 text-green-800' },
};

export function UserManagement() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'Technician',
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserDoc[];
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: 'Error', description: 'Failed to fetch user data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserDoc['role']) => {
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, { role: newRole });
      setUsers(prevUsers => prevUsers.map(user => (user.id === userId ? { ...user, role: newRole } : user)));
      toast({ title: 'Success', description: `User role has been updated to ${newRole}.` });
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({ title: 'Error', description: 'Failed to update user role.', variant: 'destructive' });
    }
  };

  const handleAddNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      const user = userCredential.user;

      // Save user details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: newUser.displayName,
        email: newUser.email,
        role: newUser.role,
        status: 'Active',
      });

      toast({ title: 'User Created', description: 'New user has been successfully added.' });
      setIsDialogOpen(false);
      setNewUser({ displayName: '', email: '', password: '', role: 'Technician' });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      const errorMessage = error.code === 'auth/email-already-in-use' 
        ? 'This email is already registered.'
        : 'Failed to create user. Please check the details.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <p>Loading users...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddNewUser}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={newUser.displayName} onChange={(e) => setNewUser({...newUser, displayName: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Engineer">Engineer</SelectItem>
                      <SelectItem value="Technician">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => {
              const RoleIcon = roleConfig[user.role]?.icon || User;
              const roleColor = roleConfig[user.role]?.color || 'bg-gray-100 text-gray-800';

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Badge className={`${roleColor} hover:bg-opacity-80`}>
                          <RoleIcon className="h-4 w-4 mr-1" />
                          {user.role}
                       </Badge>
                      <Select value={user.role} onValueChange={(newRole: UserDoc['role']) => handleRoleChange(user.id, newRole)}>
                        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Engineer">Engineer</SelectItem>
                          <SelectItem value="Technician">Technician</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}