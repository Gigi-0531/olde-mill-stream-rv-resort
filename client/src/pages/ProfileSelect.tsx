import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, User, Loader2, ArrowRight } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import logoImg from "@/assets/logo.jpg";

interface ResidentProfile {
  id: number;
  userId: number;
  firstName: string;
  profilePicture?: string | null;
  createdAt: string;
}

export default function ProfileSelect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(false);

  const { data: profiles, isLoading } = useQuery<ResidentProfile[]>({
    queryKey: ["/api/profiles"],
    enabled: !!user && user.role === "resident",
  });

  const createProfile = useMutation({
    mutationFn: async (firstName: string) => {
      const res = await apiRequest("POST", "/api/profiles", { firstName });
      return res.json();
    },
    onSuccess: async (profile: ResidentProfile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      
      // Store "stay signed in" preference if checked
      if (staySignedIn) {
        localStorage.setItem("staySignedIn", "true");
      }
      
      // Automatically select the new profile and go to dashboard
      await apiRequest("POST", "/api/profiles/select", { profileId: profile.id });
      localStorage.setItem("selectedProfile", JSON.stringify(profile));
      setNewName("");
      setShowAddForm(false);
      setStaySignedIn(false);
      setLocation("/dashboard");
    },
  });

  const selectProfile = useMutation({
    mutationFn: async (profileId: number) => {
      const res = await apiRequest("POST", "/api/profiles/select", { profileId });
      return res.json();
    },
    onSuccess: (profile: ResidentProfile) => {
      localStorage.setItem("selectedProfile", JSON.stringify(profile));
      setLocation("/dashboard");
    },
  });

  if (!user) {
    return <Redirect to="/" />;
  }

  if (user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createProfile.mutate(newName.trim());
    }
  };

  const handleSelectProfile = (profile: ResidentProfile) => {
    selectProfile.mutate(profile.id);
  };

  const canAddMore = (profiles?.length || 0) < 3;

  return (
    <div className="min-h-screen bg-[#E6F3F7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <div className="relative w-32 h-32 mx-auto bg-[#E6F3F7] rounded-lg">
            <img src={logoImg} alt="Olde Mill Stream" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <h1 className="text-2xl font-bold text-[#2a4a6e]">Welcome!</h1>
          <p className="text-muted-foreground">Lot {user.lotNumber}</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-foreground">Who's using the app?</h2>
              <p className="text-sm text-muted-foreground">Select your name or add a new one</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {profiles?.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    disabled={selectProfile.isPending}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-left"
                    data-testid={`button-select-profile-${profile.id}`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {profile.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium text-lg">{profile.firstName}</span>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}

                {profiles?.length === 0 && !showAddForm && (
                  <p className="text-center text-muted-foreground py-4">
                    No profiles yet. Add your first name to get started.
                  </p>
                )}

                {showAddForm ? (
                  <form onSubmit={handleAddProfile} className="space-y-4 pt-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter first name"
                      autoFocus
                      data-testid="input-new-profile-name"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="stay-signed-in"
                        checked={staySignedIn}
                        onCheckedChange={(checked) => setStaySignedIn(checked === true)}
                        data-testid="checkbox-stay-signed-in"
                      />
                      <label 
                        htmlFor="stay-signed-in" 
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Stay signed in on this device
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewName("");
                          setStaySignedIn(false);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!newName.trim() || createProfile.isPending}
                        className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45]"
                        data-testid="button-save-profile"
                      >
                        {createProfile.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  canAddMore && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(true)}
                      className="w-full h-14 gap-2 border-dashed"
                      data-testid="button-add-profile"
                    >
                      <Plus className="w-5 h-5" />
                      Add Person ({profiles?.length || 0}/3)
                    </Button>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
