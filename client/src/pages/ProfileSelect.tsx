import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, User, Loader2, ArrowRight, Camera, LogOut, Trash2 } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.jpg";

interface ResidentProfile {
  id: number;
  userId: number;
  firstName: string;
  profilePicture?: string | null;
  createdAt: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  objectPath: string;
}

export default function ProfileSelect() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [uploadingProfileId, setUploadingProfileId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProfileForUpload, setSelectedProfileForUpload] = useState<ResidentProfile | null>(null);

  const { data: profiles, isLoading, error } = useQuery<ResidentProfile[]>({
    queryKey: ["/api/profiles"],
    enabled: !!user && user.role === "resident",
    staleTime: 0,
    refetchOnMount: true,
  });

  // Debug: Log if there's an error fetching profiles
  if (error) {
    console.error("Error fetching profiles:", error);
  }

  const createProfile = useMutation({
    mutationFn: async (firstName: string) => {
      const res = await apiRequest("POST", "/api/profiles", { firstName });
      return res.json();
    },
    onSuccess: async (profile: ResidentProfile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      
      if (staySignedIn) {
        localStorage.setItem("staySignedIn", "true");
      }
      
      await apiRequest("POST", "/api/profiles/select", { profileId: profile.id });
      localStorage.setItem("selectedProfile", JSON.stringify({
        ...profile,
        lastName: user?.lastName
      }));
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
      localStorage.setItem("selectedProfile", JSON.stringify({
        ...profile,
        lastName: user?.lastName
      }));
      setLocation("/dashboard");
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (profileId: number) => {
      const res = await apiRequest("DELETE", `/api/profiles/${profileId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Profile deleted" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to delete profile", variant: "destructive" });
    },
  });

  const updateProfilePicture = useMutation({
    mutationFn: async ({ profileId, objectPath, imageData, mimeType }: { profileId: number; objectPath: string; imageData?: string; mimeType?: string }) => {
      const res = await apiRequest("PATCH", `/api/profiles/${profileId}/picture`, { objectPath, imageData, mimeType });
      return res.json();
    },
    onSuccess: (updatedProfile: ResidentProfile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      
      // Update localStorage if this is the selected profile
      const storedProfile = localStorage.getItem("selectedProfile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        if (parsed.id === updatedProfile.id) {
          localStorage.setItem("selectedProfile", JSON.stringify({
            ...parsed,
            profilePicture: updatedProfile.profilePicture
          }));
        }
      }
      
      toast({ title: "Profile picture updated!" });
      setUploadingProfileId(null);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update picture", variant: "destructive" });
      setUploadingProfileId(null);
    },
  });

  const handleProfilePictureClick = (e: React.MouseEvent, profile: ResidentProfile) => {
    e.stopPropagation();
    setSelectedProfileForUpload(profile);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProfileForUpload) return;

    setUploadingProfileId(selectedProfileForUpload.id);

    try {
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
      const imageData = await imageDataPromise;

      const urlRes = await apiRequest("POST", "/api/uploads/request-url", {
        filename: file.name,
        contentType: file.type,
        directory: ".private/profile-pictures",
      });
      const { uploadUrl, objectPath }: UploadUrlResponse = await urlRes.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      await updateProfilePicture.mutateAsync({
        profileId: selectedProfileForUpload.id,
        objectPath,
        imageData,
        mimeType: file.type,
      });
    } catch (error: any) {
      console.error("Failed to upload:", error);
      toast({ title: "Failed to upload picture", variant: "destructive" });
      setUploadingProfileId(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedProfileForUpload(null);
  };

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
  const lastName = user.lastName || "";

  return (
    <div className="min-h-screen bg-[#E6F3F7] flex flex-col items-center justify-center p-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
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
                  <div
                    key={profile.id}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <button 
                      className="relative cursor-pointer group"
                      onClick={(e) => handleProfilePictureClick(e, profile)}
                      data-testid={`button-change-picture-${profile.id}`}
                      type="button"
                    >
                      <Avatar className="w-14 h-14">
                        {profile.profilePicture ? (
                          <AvatarImage src={profile.profilePicture} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {profile.firstName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {uploadingProfileId === profile.id ? (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => handleSelectProfile(profile)}
                      disabled={selectProfile.isPending}
                      className="flex-1 text-left"
                      data-testid={`button-select-profile-${profile.id}`}
                    >
                      <span className="font-medium text-lg">{profile.firstName} {lastName}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${profile.firstName}'s profile?`)) {
                          deleteProfile.mutate(profile.id);
                        }
                      }}
                      disabled={deleteProfile.isPending}
                      className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
                      data-testid={`button-delete-profile-${profile.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                    <button
                      onClick={() => handleSelectProfile(profile)}
                      disabled={selectProfile.isPending}
                      data-testid={`button-select-arrow-${profile.id}`}
                    >
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
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

        <Button
          variant="ghost"
          onClick={() => logout()}
          className="w-full text-muted-foreground hover:text-destructive"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
