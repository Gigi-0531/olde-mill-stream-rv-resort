import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Redirect } from "wouter";
import logoImg from "@/assets/logo.jpg";
import { User, ShieldCheck, Loader2, UserCircle, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const residentSchema = z.object({
  role: z.literal("resident"),
  lotNumber: z.string().min(1, "Lot number is required"),
  lastName: z.string().min(2, "Last name is required"),
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d{4}$/, "PIN must be 4 digits"),
});

const adminSchema = z.object({
  role: z.literal("admin"),
  username: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Landing() {
  const { user, login, isLoggingIn, loginError, pendingProfiles, selectProfile, isSelectingProfile, clearPendingProfiles } = useAuth();
  const [mode, setMode] = useState<'select' | 'resident' | 'admin'>('select');

  // If already logged in, redirect
  if (user) {
    return <Redirect to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  // Profile selection screen
  if (pendingProfiles && pendingProfiles.length > 0) {
    return (
      <div className="min-h-screen bg-[#E6F3F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <div className="relative w-40 h-40 mx-auto bg-[#E6F3F7] rounded-lg">
              <img src={logoImg} alt="Olde Mill Stream" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
          </div>

          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-primary" data-testid="text-select-profile">Who's logging in?</h2>
                  <p className="text-sm text-muted-foreground">Select your profile to continue</p>
                </div>
                
                <div className="space-y-3">
                  {pendingProfiles.map((profile) => (
                    <Button
                      key={profile.id}
                      variant="outline"
                      className="w-full h-16 justify-start gap-4 text-left"
                      onClick={() => selectProfile(profile.id)}
                      disabled={isSelectingProfile}
                      data-testid={`button-profile-${profile.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        {profile.profilePicture ? (
                          <AvatarImage src={profile.profilePicture} alt={profile.firstName} />
                        ) : null}
                        <AvatarFallback>
                          <UserCircle className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-lg font-medium">{profile.firstName}</span>
                      {isSelectingProfile && <Loader2 className="ml-auto w-4 h-4 animate-spin" />}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={clearPendingProfiles}
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E6F3F7] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Corner Ribbon - 40th Anniversary */}
      <div className="absolute top-0 left-0 z-50 overflow-hidden w-40 h-40">
        <div 
          className="absolute top-6 -left-14 w-60 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-center py-3.5 shadow-xl transform -rotate-45"
          style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}
        >
          <span className="block text-black font-bold italic" style={{ fontFamily: "'Playfair Display', serif", fontSize: '19px' }}>40th Anniversary</span>
          <span className="block text-black text-xs font-semibold tracking-wide">1986-2026</span>
        </div>
      </div>
      
      
      <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="relative w-56 h-56 mx-auto bg-[#E6F3F7] rounded-lg">
             <img src={logoImg} alt="Olde Mill Stream" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2a4a6e] uppercase" style={{ fontFamily: "'Libre Baskerville', serif" }}>Olde Mill Stream<br />RV Resort</h1>
            <p className="text-muted-foreground text-sm mt-1">1000 N. Central Ave Umatilla, FL 32784</p>
            <p className="text-muted-foreground text-sm">352.669.3141</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            {mode === 'select' && (
              <div className="space-y-4">
                <p className="text-center text-lg font-semibold text-foreground">Welcome Home!</p>
                <p className="text-center text-muted-foreground mb-6">Please select your login type to continue.</p>
                <Button 
                  onClick={() => setMode('resident')} 
                  className="w-full h-14 text-lg gap-3 bg-[#1E3A5F] hover:bg-[#152a45]"
                  data-testid="button-resident-login"
                >
                  <User className="w-5 h-5" /> Resident Portal
                </Button>
                <Button 
                  onClick={() => setMode('admin')} 
                  variant="outline" 
                  className="w-full h-14 text-lg gap-3 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
                  data-testid="button-admin-login"
                >
                  <ShieldCheck className="w-5 h-5" /> Admin Access
                </Button>
              </div>
            )}

            {mode === 'resident' && (
              <ResidentLogin 
                onBack={() => setMode('select')} 
                onSubmit={login} 
                isLoading={isLoggingIn}
                error={loginError}
              />
            )}

            {mode === 'admin' && (
              <AdminLogin 
                onBack={() => setMode('select')} 
                onSubmit={login} 
                isLoading={isLoggingIn}
                error={loginError}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResidentLogin({ onBack, onSubmit, isLoading, error }: { onBack: () => void, onSubmit: any, isLoading: boolean, error: Error | null }) {
  const form = useForm({
    resolver: zodResolver(residentSchema),
    defaultValues: { role: "resident" as const, lotNumber: "", lastName: "", pin: "" },
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold font-display text-primary">Resident Login</h2>
        <p className="text-sm text-muted-foreground">Enter your lot info and PIN to access the portal</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" data-testid="text-login-error">
          {error.message}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="lotNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lot Number</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} data-testid="input-lot-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIN</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4-digit PIN"
                    {...field}
                    data-testid="input-resident-pin"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Back</Button>
            <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-resident-submit">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function AdminLogin({ onBack, onSubmit, isLoading, error }: { onBack: () => void, onSubmit: any, isLoading: boolean, error: Error | null }) {
  const form = useForm({
    resolver: zodResolver(adminSchema),
    defaultValues: { role: "admin" as const, username: "", password: "" },
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold font-display text-primary">Administration</h2>
        <p className="text-sm text-muted-foreground">Secure access for park managers</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" data-testid="text-login-error">
          {error.message}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} data-testid="input-admin-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} data-testid="input-admin-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1" data-testid="button-admin-back">Back</Button>
            <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-admin-submit">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Access
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
