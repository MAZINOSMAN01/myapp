// src/components/SpaceManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { FirebaseDataAdapter } from '@/utils/firebase-data-adapter';
import { SpaceCleaningIntegration } from './SpaceCleaningIntegration';

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import {
  Plus,
  Building,
  MapPin,
  Filter,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Calendar,
  Users,
  Settings,
  Eye,
  Link,
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  Brush,
} from 'lucide-react';

// Types
import type {
  SpaceLocation,
  SpaceFilter,
  SpaceStatistics,
  SpaceType,
  SpaceStatus,
  MaintenancePriority,
  LocationStructure,
  SpaceActivity,
} from '@/types/space-management';

// Constants
const SPACE_TYPES: SpaceType[] = [
  'Office', 'Meeting Room', 'Storage', 'Electrical Room', 'Server Room',
  'Cafeteria', 'Bathroom', 'Hallway', 'Reception', 'Common Area', 'Parking', 'Other'
];

const SPACE_STATUSES: SpaceStatus[] = [
  'Available', 'Occupied', 'Under Maintenance', 'Reserved', 'Out of Service'
];

const MAINTENANCE_PRIORITIES: MaintenancePriority[] = [
  'Low', 'Medium', 'High', 'Critical'
];

const BUILDINGS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const FLOORS = [1, 2, 3, 4, 5, 6];
const LABELS = ['Office', 'Admin', 'Storage', 'Technical', 'Common', 'Restricted'];

export function SpaceManagement() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // State Management
  const [spaces, setSpaces] = useState<SpaceLocation[]>([]);
  const [activities, setActivities] = useState<SpaceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [migrationStatus, setMigrationStatus] = useState<{
    inProgress: boolean;
    completed: boolean;
    count: number;
    errors: string[];
  }>({
    inProgress: false,
    completed: false,
    count: 0,
    errors: [],
  });

  // Dialog States
  const [isAddSpaceOpen, setIsAddSpaceOpen] = useState(false);
  const [isEditSpaceOpen, setIsEditSpaceOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<SpaceLocation | null>(null);

  // Filter States
  const [filters, setFilters] = useState<SpaceFilter>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [formData, setFormData] = useState({
    building: '',
    floor: 1,
    space: '',
    label: '',
    spaceType: 'Office' as SpaceType,
    status: 'Available' as SpaceStatus,
    area_size: 0,
    capacity: 0,
    department: '',
    manager: '',
    description: '',
    notes: '',
    maintenancePriority: 'Medium' as MaintenancePriority,
    cleaningFrequency: 'Daily' as 'Daily' | 'Weekly' | 'Monthly',
  });

  // Load Spaces
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'space_locations'),
      (snapshot) => {
        const spacesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SpaceLocation[];

        setSpaces(spacesList);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading spaces:', error);
        toast({
          title: 'Error',
          description: 'Failed to load space data.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [toast]);

  // Generate Location Code
  const generateLocationCode = (structure: LocationStructure): string => {
    const { building, floor, space } = structure;
    return `${building}-FLOOR${floor}-${space.replace(/\s/g, '-')}`;
  };

  // Generate Display Name
  const generateDisplayName = (structure: LocationStructure): string => {
    const { building, floor, space } = structure;
    return `${building} FLOOR ${floor} ${space}`;
  };

  // Filtered Spaces
  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const matchesSearch =
        !searchTerm ||
        space.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.locationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBuilding = !filters.building || space.structure.building === filters.building;
      const matchesFloor = !filters.floor || space.structure.floor.toString() === filters.floor;
      const matchesType = !filters.spaceType || space.spaceType === filters.spaceType;
      const matchesStatus = !filters.status || space.status === filters.status;
      const matchesDepartment = !filters.department || space.department === filters.department;
      const matchesPriority = !filters.maintenancePriority || space.maintenancePriority === filters.maintenancePriority;

      return (
        matchesSearch &&
        matchesBuilding &&
        matchesFloor &&
        matchesType &&
        matchesStatus &&
        matchesDepartment &&
        matchesPriority
      );
    });
  }, [spaces, searchTerm, filters]);

  // Statistics
  const statistics = useMemo((): SpaceStatistics => {
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter((s) => s.status === 'Available').length;
    const occupiedSpaces = spaces.filter((s) => s.status === 'Occupied').length;
    const maintenanceSpaces = spaces.filter((s) => s.status === 'Under Maintenance').length;
    const totalArea = spaces.reduce((sum, space) => sum + space.area, 0);
    const utilizationRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

    const spacesByType = SPACE_TYPES.reduce((acc, type) => {
      acc[type] = spaces.filter((s) => s.spaceType === type).length;
      return acc;
    }, {} as Record<SpaceType, number>);

    const spacesByFloor = FLOORS.reduce((acc, floor) => {
      acc[`Floor ${floor}`] = spaces.filter((s) => s.structure.floor === floor).length;
      return acc;
    }, {} as Record<string, number>);

    const maintenanceByPriority = MAINTENANCE_PRIORITIES.reduce((acc, priority) => {
      acc[priority] = spaces.filter((s) => s.maintenancePriority === priority).length;
      return acc;
    }, {} as Record<MaintenancePriority, number>);

    return {
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      maintenanceSpaces,
      totalArea,
      utilizationRate,
      spacesByType,
      spacesByFloor,
      maintenanceByPriority,
    };
  }, [spaces]);

  // Handle Migration
  const handleMigration = async () => {
    setMigrationStatus((prev) => ({ ...prev, inProgress: true, errors: [] }));

    try {
      // Try to load existing data first
      const existingSpaces = await FirebaseDataAdapter.loadAndConvertSpaces('locations');

      if (existingSpaces.length > 0) {
        await FirebaseDataAdapter.saveConvertedSpaces(existingSpaces);
        setMigrationStatus({
          inProgress: false,
          completed: true,
          count: existingSpaces.length,
          errors: [],
        });
        toast({
          title: 'Success',
          description: `Successfully migrated ${existingSpaces.length} spaces from existing data.`,
          variant: 'default',
        });
      } else {
        // Create sample data if no existing data
        const sampleSpaces = await FirebaseDataAdapter.createSampleSpaces();
        await FirebaseDataAdapter.saveConvertedSpaces(sampleSpaces);
        setMigrationStatus({
          inProgress: false,
          completed: true,
          count: sampleSpaces.length,
          errors: [],
        });
        toast({
          title: 'Success',
          description: `Successfully created ${sampleSpaces.length} sample spaces.`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus({
        inProgress: false,
        completed: false,
        count: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
      toast({
        title: 'Error',
        description: 'Failed to migrate data.',
        variant: 'destructive',
      });
    }
  };

  // Add Space
  const handleAddSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const structure: LocationStructure = {
        building: formData.building,
        floor: formData.floor,
        space: formData.space,
        label: formData.label,
      };

      const locationCode = generateLocationCode(structure);
      const displayName = generateDisplayName(structure);

      const existingSpace = spaces.find((s) => s.locationCode === locationCode);
      if (existingSpace) {
        toast({
          title: 'Error',
          description: 'This location already exists.',
          variant: 'destructive',
        });
        return;
      }

      const newSpace: Omit<SpaceLocation, 'id'> = {
        locationCode,
        displayName,
        structure,
        spaceType: formData.spaceType,
        status: formData.status,
        area: formData.area_size,
        capacity: formData.capacity,
        department: formData.department,
        manager: formData.manager,
        description: formData.description,
        notes: formData.notes,
        maintenancePriority: formData.maintenancePriority,
        cleaningFrequency: formData.cleaningFrequency,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
      };

      await addDoc(collection(db, 'space_locations'), newSpace);

      // Reset form
      setFormData({
        building: '',
        floor: 1,
        space: '',
        label: '',
        spaceType: 'Office',
        status: 'Available',
        area_size: 0,
        capacity: 0,
        department: '',
        manager: '',
        description: '',
        notes: '',
        maintenancePriority: 'Medium',
        cleaningFrequency: 'Daily',
      });

      setIsAddSpaceOpen(false);

      toast({
        title: 'Success',
        description: 'Space added successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding space:', error);
      toast({
        title: 'Error',
        description: 'Failed to add space.',
        variant: 'destructive',
      });
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status }: { status: SpaceStatus }) => {
    const colors = {
      Available: 'bg-green-100 text-green-800',
      Occupied: 'bg-blue-100 text-blue-800',
      'Under Maintenance': 'bg-yellow-100 text-yellow-800',
      Reserved: 'bg-purple-100 text-purple-800',
      'Out of Service': 'bg-red-100 text-red-800',
    };

    return <Badge className={colors[status]}>{status}</Badge>;
  };

  // Priority Badge Component
  const PriorityBadge = ({ priority }: { priority: MaintenancePriority }) => {
    const colors = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-orange-100 text-orange-800',
      Critical: 'bg-red-100 text-red-800',
    };

    return <Badge className={colors[priority]}>{priority}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Space Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Space Management</h1>
          <p className="text-gray-600 mt-2">
            A comprehensive system for managing and tracking spaces and locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isMigrationOpen} onOpenChange={setIsMigrationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Database className="h-4 w-4 mr-2" />
                Data Migration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Migrate Data from Firebase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will migrate existing data from the "locations" collection to the new space management system.
                  </AlertDescription>
                </Alert>

                {migrationStatus.inProgress && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Migration in progress...</p>
                  </div>
                )}

                {migrationStatus.completed && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Successfully migrated {migrationStatus.count} spaces.
                    </AlertDescription>
                  </Alert>
                )}

                {migrationStatus.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Errors occurred during migration:
                      <ul className="mt-2 list-disc list-inside">
                        {migrationStatus.errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsMigrationOpen(false)}
                    disabled={migrationStatus.inProgress}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleMigration} disabled={migrationStatus.inProgress}>
                    {migrationStatus.inProgress ? 'Migrating...' : 'Start Migration'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSpaceOpen} onOpenChange={setIsAddSpaceOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Space
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Space</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddSpace} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Building</Label>
                    <Select
                      value={formData.building}
                      onValueChange={(value) => setFormData({ ...formData, building: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Building" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUILDINGS.map((building) => (
                          <SelectItem key={building} value={building}>
                            {building}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Floor</Label>
                    <Select
                      value={formData.floor.toString()}
                      onValueChange={(value) => setFormData({ ...formData, floor: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {FLOORS.map((floor) => (
                          <SelectItem key={floor} value={floor.toString()}>
                            Floor {floor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Space</Label>
                    <Input
                      value={formData.space}
                      onChange={(e) => setFormData({ ...formData, space: e.target.value })}
                      placeholder="e.g., OFFICE 13"
                      required
                    />
                  </div>

                  <div>
                    <Label>Label</Label>
                    <Select
                      value={formData.label}
                      onValueChange={(value) => setFormData({ ...formData, label: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Label" />
                      </SelectTrigger>
                      <SelectContent>
                        {LABELS.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Space Type</Label>
                    <Select
                      value={formData.spaceType}
                      onValueChange={(value) => setFormData({ ...formData, spaceType: value as SpaceType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPACE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as SpaceStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPACE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Area (sqm)</Label>
                    <Input
                      type="number"
                      value={formData.area_size}
                      onChange={(e) => setFormData({ ...formData, area_size: Number(e.target.value) })}
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <Label>Capacity (persons)</Label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddSpaceOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Space</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spaces</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Total Area: {statistics.totalArea.toLocaleString()} m²
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Spaces</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.availableSpaces}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.totalSpaces > 0
                ? Math.round((statistics.availableSpaces / statistics.totalSpaces) * 100)
                : 0}
              % of spaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied Spaces</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.occupiedSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Utilization Rate: {statistics.utilizationRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statistics.maintenanceSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spaces">Spaces</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="cleaning">Cleaning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search spaces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={filters.building || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, building: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {BUILDINGS.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.floor || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, floor: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {FLOORS.map((floor) => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.spaceType || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, spaceType: value === 'all' ? undefined : (value as SpaceType) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {SPACE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spaces" className="space-y-6">
          {/* Spaces Table */}
          <Card>
            <CardHeader>
              <CardTitle>Spaces List ({filteredSpaces.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Maintenance Priority</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpaces.map((space) => (
                      <TableRow key={space.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{space.displayName}</div>
                            <div className="text-sm text-gray-500">{space.locationCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{space.spaceType}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={space.status} />
                        </TableCell>
                        <TableCell>{space.area} m²</TableCell>
                        <TableCell>{space.capacity || '-'}</TableCell>
                        <TableCell>{space.department || '-'}</TableCell>
                        <TableCell>
                          <PriorityBadge priority={space.maintenancePriority} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSpace(space);
                                setIsEditSpaceOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spaces by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(statistics.spacesByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(statistics.maintenanceByPriority).map(
                    ([priority, count]) => (
                      <div key={priority} className="flex justify-between items-center">
                        <span className="text-sm">{priority}</span>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={priority as MaintenancePriority} />
                          <span className="text-sm">{count}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cleaning" className="space-y-6">
          <SpaceCleaningIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}