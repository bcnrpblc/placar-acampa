import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface UserWithRole extends AuthUser {
  is_admin: boolean;
}

const RoleManager = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
        if (data === true) {
          fetchUsers();
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all profiles (which are created for each user)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at');
      
      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) throw roleError;

      // Combine data
      const usersWithRoles = profilesData.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        created_at: profile.created_at,
        is_admin: roleData.some(role => role.user_id === profile.id && role.role === 'admin')
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      let result;
      
      if (isCurrentlyAdmin) {
        // Remove admin role using security definer function
        const { data, error } = await supabase
          .rpc('admin_remove_role', { 
            target_user_id: userId, 
            role_to_remove: 'admin' 
          });

        if (error) throw error;
        result = data;
        
        if (result) {
          toast({
            title: "Success",
            description: "Admin access revoked"
          });
        } else {
          throw new Error("Operation not permitted");
        }
      } else {
        // Add admin role using security definer function
        const { data, error } = await supabase
          .rpc('admin_add_role', { 
            target_user_id: userId, 
            role_to_add: 'admin' 
          });

        if (error) throw error;
        result = data;
        
        if (result) {
          toast({
            title: "Success", 
            description: "Admin access granted"
          });
        } else {
          throw new Error("Operation not permitted");
        }
      }

      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-camp-cyan mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-red-500/10">
              <ShieldX className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-400">
              Access Denied
            </CardTitle>
            <p className="text-muted-foreground">
              Admin access required for role management
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin')}
              className="w-full bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            size="sm"
            className="mb-4 bg-card/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Panel
          </Button>
          
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-camp-cyan/10">
                  <Users className="w-6 h-6 text-camp-cyan" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-camp bg-clip-text text-transparent">
                    Role Manager
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Manage admin access for users
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-camp-cyan mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((userData) => (
                    <div 
                      key={userData.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-card/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {userData.is_admin ? (
                            <ShieldCheck className="w-4 h-4 text-camp-cyan" />
                          ) : (
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{userData.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {userData.is_admin ? 'Administrator' : 'Regular User'}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => toggleAdminRole(userData.id, userData.is_admin)}
                        variant={userData.is_admin ? "destructive" : "default"}
                        size="sm"
                        className={userData.is_admin 
                          ? "" 
                          : "bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
                        }
                      >
                        {userData.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                      </Button>
                    </div>
                  ))}
                  
                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleManager;