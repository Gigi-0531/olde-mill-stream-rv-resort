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
import { User, ShieldCheck, Loader2 } from "lucide-react";

const residentSchema = z.object({
  role: z.literal("resident"),
  lotNumber: z.string().min(1, "Lot number is required"),
  lastName: z.string().min(2, "Last name is required"),
});

const adminSchema = z.object({
  role: z.literal("admin"),
  username: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Landing() {
  const { user, login, isLoggingIn } = useAuth();
  const [mode, setMode] = useState<'select' | 'resident' | 'admin'>('select');

  // If already logged in, redirect
  if (user) {
    return <Redirect to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  return (
    <div className="min-h-screen bg-[#E6F3F7] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#B8D9E8] rounded-b-[50%] scale-150 -translate-y-1/2 -z-10" />

      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="relative w-48 h-48 mx-auto">
             <img src={logoImg} alt="Olde Mill Stream" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold text-[#2C5F6D] drop-shadow-sm">Olde Mill Stream</h1>
            <p className="text-[#8B5E3C] font-medium tracking-wide uppercase text-sm mt-2">RV Resort & Campground</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            {mode === 'select' && (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground mb-6">Welcome! Please select your login type to continue.</p>
                <Button 
                  onClick={() => setMode('resident')} 
                  className="w-full h-14 text-lg gap-3 bg-[#2C5F6D] hover:bg-[#1f4550]"
                >
                  <User className="w-5 h-5" /> Resident Portal
                </Button>
                <Button 
                  onClick={() => setMode('admin')} 
                  variant="outline" 
                  className="w-full h-14 text-lg gap-3 border-[#2C5F6D] text-[#2C5F6D] hover:bg-[#2C5F6D]/5"
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
              />
            )}

            {mode === 'admin' && (
              <AdminLogin 
                onBack={() => setMode('select')} 
                onSubmit={login} 
                isLoading={isLoggingIn} 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResidentLogin({ onBack, onSubmit, isLoading }: { onBack: () => void, onSubmit: any, isLoading: boolean }) {
  const form = useForm({
    resolver: zodResolver(residentSchema),
    defaultValues: { role: "resident" as const, lotNumber: "", lastName: "" },
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold font-display text-primary">Resident Login</h2>
        <p className="text-sm text-muted-foreground">Enter your lot info to access the portal</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="lotNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lot Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. A-12" {...field} />
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
                  <Input placeholder="Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Back</Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function AdminLogin({ onBack, onSubmit, isLoading }: { onBack: () => void, onSubmit: any, isLoading: boolean }) {
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="omsmanagement86@gmail.com" {...field} />
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
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Back</Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Access
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
