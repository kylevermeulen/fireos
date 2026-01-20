import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogOut, User, Shield } from 'lucide-react';
import { SnapshotImporter } from '@/components/settings/SnapshotImporter';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/auth');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage accounts, import data, and configure projections</p>
        </div>

        {/* Auth Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication
            </CardTitle>
            <CardDescription>Your current session status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user?.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">Authenticated</Badge>
                    <span className="text-xs text-muted-foreground">
                      ID: {user?.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Snapshot Importer - only works when logged in (which we are, due to ProtectedRoute) */}
        <SnapshotImporter />

        <Card>
          <CardHeader>
            <CardTitle>Refresh Prices</CardTitle>
            <CardDescription>Fetch latest FX rates and asset prices</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary"><RefreshCw className="mr-2 h-4 w-4" />Refresh All Prices</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
