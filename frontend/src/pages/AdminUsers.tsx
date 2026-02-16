import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUsers, createUser, updateUser, getRoles } from '@/lib/api';
import { User, UserRole, Role } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Edit, Trash2, Search, Shield, ShieldCheck, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: 1,
    status: 'active' as 'active' | 'inactive' | 'suspended',
    firstName: '',
    lastName: '',
    nationalId: '',
    phoneNumber: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await getRoles();
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.nationalId || !formData.phoneNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields, including personal information.",
        variant: "destructive",
      });
      return;
    }

    if (formData.nationalId.length !== 13) {
      toast({
        title: "Validation Error",
        description: "National ID must be 13 digits.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await createUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role_id: formData.role_id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationalId: formData.nationalId,
        phoneNumber: formData.phoneNumber,
      });

      if (response.success && response.data) {
        setUsers(prev => [...prev, response.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast({
          title: "User Created",
          description: `User ${formData.username} has been created.`,
        });
      } else {
        throw new Error(response.error || 'Failed to create user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const updates: any = {
        username: formData.username,
        email: formData.email,
        role_id: formData.role_id,
        status: formData.status,
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationalId: formData.nationalId,
        phoneNumber: formData.phoneNumber,
      };

      // Only include password if it's provided
      if (formData.password) {
        updates.password = formData.password;
      }

      const response = await updateUser(editingUser.user_id, updates);

      if (response.success && response.data) {
        setUsers(prev => prev.map(u =>
          u.user_id === editingUser.user_id ? response.data! : u
        ));
        setEditingUser(null);
        resetForm();
        toast({
          title: "User Updated",
          description: `User ${formData.username} has been updated.`,
        });
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (userId: number, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const user = users.find(u => u.user_id === userId);
      if (!user) return;

      const response = await updateUser(userId, {
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        status: newStatus,
      });

      if (response.success && response.data) {
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? response.data! : u
        ));
        toast({
          title: "Status Updated",
          description: `User status changed to ${newStatus}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role_id: 1,
      status: 'active',
      firstName: '',
      lastName: '',
      nationalId: '',
      phoneNumber: '',
    });
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't show existing password
      role_id: user.role_id,
      status: user.status,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      nationalId: user.national_id || '',
      phoneNumber: user.phone_number || '',
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeInfo = (role: UserRole) => {
    switch (role) {
      case 'SUPER_USER':
        return {
          label: 'Super User',
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
          icon: ShieldCheck
        };
      case 'MANAGER':
        return {
          label: 'Manager',
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
          icon: Shield
        };
      default:
        return {
          label: 'User',
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
          icon: UserIcon
        };
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage system users, roles, and access permissions
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[925px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. They will receive an email with login details.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 max-h-[70vh] px-2 py-4 space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Somsak"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Jai-dee"
                      />
                    </div>
                  </div>
                  <div className=" grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nationalId">National ID</Label>
                      <Input
                        id="nationalId"
                        value={formData.nationalId}
                        onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
                        placeholder="1234567890123"
                        maxLength={13}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="0812345678"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account Credentials</h3>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="johndoe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role_id.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.role_id} value={role.role_id.toString()}>
                            {role.role_name === 'SUPER_USER' ? 'Super User' : role.role_name.charAt(0) + role.role_name.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table Card */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                All Users ({filteredUsers.length})
              </CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="SUPER_USER">Super User</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[250px] h-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-6">User Profile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p>No users found matching your search</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const RoleInfo = getRoleBadgeInfo(user.role);
                    const RoleIcon = RoleInfo.icon;
                    return (
                      <TableRow key={user.user_id} className="group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-foreground">{user.username}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1.5 pl-1.5 pr-2.5 py-0.5", RoleInfo.className)}>
                            <RoleIcon className="h-3.5 w-3.5" />
                            {RoleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog
                              open={editingUser?.user_id === user.user_id}
                              onOpenChange={(open) => !open && setEditingUser(null)}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEditDialog(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit User Profile</DialogTitle>
                                  <DialogDescription>
                                    Update user details and permissions.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-username">Username</Label>
                                      <Input
                                        id="edit-username"
                                        value={formData.username}
                                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-firstName">First Name</Label>
                                      <Input
                                        id="edit-firstName"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-lastName">Last Name</Label>
                                      <Input
                                        id="edit-lastName"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-nationalId">National ID</Label>
                                      <Input
                                        id="edit-nationalId"
                                        value={formData.nationalId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                                      <Input
                                        id="edit-phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-role">Role</Label>
                                      <Select
                                        value={formData.role_id.toString()}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: parseInt(value) }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {roles.map((role) => (
                                            <SelectItem key={role.role_id} value={role.role_id.toString()}>
                                              {role.role_name === 'SUPER_USER' ? 'Super User' : role.role_name.charAt(0) + role.role_name.slice(1).toLowerCase()}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email Address</Label>
                                    <Input
                                      id="edit-email"
                                      type="email"
                                      value={formData.email}
                                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-password">New Password (optional)</Label>
                                    <Input
                                      id="edit-password"
                                      type="password"
                                      value={formData.password}
                                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                      placeholder="Leave empty to keep current"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-status">Account Status</Label>
                                    <Select
                                      value={formData.status}
                                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">
                                          <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            Active
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                          <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                                            Inactive
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="suspended">
                                          <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-500" />
                                            Suspended
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingUser(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdate}>Save Changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{user.status === 'active' ? 'Suspend' : 'Activate'} User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to {user.status === 'active' ? 'suspend' : 'activate'} <strong>{user.username}</strong>?
                                    <br />
                                    {user.status === 'active'
                                      ? "User will lose access to the system immediately."
                                      : "User will regain access to the system."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className={user.status === 'active' ? "bg-destructive hover:bg-destructive/90" : ""}
                                    onClick={() => handleStatusChange(user.user_id, user.status === 'active' ? 'suspended' : 'active')}
                                  >
                                    {user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
