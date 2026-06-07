import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useActivities, useCreateActivity, useDeleteActivity, useNotifications } from "@/hooks/use-resources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Calendar, Bell, MapPin, Clock, Image, Loader2, Users, Pencil, Search, MessageSquare, Check, X, Upload, FileSpreadsheet, ShieldCheck, BookUser, Phone, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { useState, useRef, useCallback } from "react";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GalleryPhoto } from "@shared/schema";

function toEST(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

export default function Admin() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <AdminContent />;
}

function AdminContent() {
  const { data: activities } = useActivities();
  const { data: notifications } = useNotifications();
  const { data: photos } = useQuery<GalleryPhoto[]>({ queryKey: ["/api/gallery"] });
  const { data: residents } = useQuery<any[]>({ queryKey: ["/api/residents"] });

  const stats = [
    { label: "Activities", value: activities?.length ?? 0, icon: Calendar, color: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
    { label: "Alerts", value: notifications?.length ?? 0, icon: Bell, color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    { label: "Photos", value: photos?.length ?? 0, icon: Image, color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { label: "Residents", value: residents?.length ?? 0, icon: Users, color: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/20 dark:via-background dark:to-background pt-16">
      <div className="bg-gradient-to-r from-[#1E3A5F] via-[#2a4a6e] to-sky-600 text-white py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center" data-testid="icon-admin-header">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white" data-testid="text-admin-title">Admin Dashboard</h1>
              <p className="text-white/70">Manage park activities, alerts, and residents</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm rounded-md p-4 flex items-center gap-3"
                data-testid={`stat-${stat.label.toLowerCase()}`}
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{stat.value}</p>
                  <p className="text-sm text-white/70">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <Tabs defaultValue="activities" className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-card dark:bg-card p-1 shadow-sm border w-max min-w-full">
              <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <Calendar className="w-4 h-4" /> Activities
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <Bell className="w-4 h-4" /> Alerts
              </TabsTrigger>
              <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <Image className="w-4 h-4" /> Gallery
              </TabsTrigger>
              <TabsTrigger value="directory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <Users className="w-4 h-4" /> Directory
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <MessageSquare className="w-4 h-4" /> Messages
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="activities">
            <ActivitiesManager />
          </TabsContent>

          <TabsContent value="alerts">
            <div className="max-w-2xl">
              <h3 className="text-xl font-bold mb-4">Active Alerts</h3>
              <NotificationsWidget />
            </div>
          </TabsContent>

          <TabsContent value="gallery">
            <GalleryManager />
          </TabsContent>

          <TabsContent value="directory">
            <div className="space-y-10">
              <PublicDirectoryManager />
              <div className="border-t pt-8">
                <DirectoryManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <MessageModeration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const activityFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  date: z.string().min(1, "Date and time are required"),
});

function ActivitiesManager() {
  const { data: activities, isLoading } = useActivities();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: "",
    },
  });

  const onSubmit = (data: z.infer<typeof activityFormSchema>) => {
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(),
    };
    createActivity.mutate(payload as any, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Scheduled Activities</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Bingo Night" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Date & Time (EST)</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Clubhouse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Details about the event..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createActivity.isPending}>
                  {createActivity.isPending ? "Creating..." : "Create Activity"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : activities?.length === 0 ? (
          <p className="text-muted-foreground">No activities found.</p>
        ) : (
          activities?.map((activity) => (
            <Card key={activity.id} className="flex flex-row items-center justify-between p-4">
              <div className="flex gap-4 items-center">
                <div className="bg-primary/10 w-16 h-16 rounded-lg flex flex-col items-center justify-center text-primary font-bold">
                  <span className="text-xs uppercase">{format(toEST(activity.date), 'MMM')}</span>
                  <span className="text-xl">{format(toEST(activity.date), 'd')}</span>
                </div>
                <div>
                  <h4 className="font-bold">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {format(toEST(activity.date), 'h:mm a')} EST
                    <MapPin className="w-3 h-3 ml-2" /> {activity.location}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Delete this activity?')) deleteActivity.mutate(activity.id);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function GalleryManager() {
  const { data: photos, isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
  });

  const { data: pendingPhotos, isLoading: pendingLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery/pending"],
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/pending"] });
    },
  });

  const approvePhoto = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/gallery/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/pending"] });
    },
  });

  const rejectPhoto = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/gallery/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/pending"] });
    },
  });

  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  // Store the server-assigned objectPath when a presigned URL is requested
  // so handleUploadComplete can reference it (GCS PUT response has no body)
  const pendingObjectPath = useRef<string | null>(null);

  const savePhoto = useMutation({
    mutationFn: async (data: { objectPath: string; title?: string }) => {
      const res = await apiRequest("POST", "/api/gallery", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      setUploadedPath(null);
      setPhotoTitle("");
    },
  });

  const handleUploadComplete = useCallback((result: any) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = pendingObjectPath.current;
      if (objectPath) {
        setUploadedPath(objectPath);
        pendingObjectPath.current = null;
      }
    }
  }, []);

  const getUploadParameters = useCallback(async (file: any) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    const { uploadURL, objectPath } = await res.json();
    // Capture the server-assigned normalized path for use after upload
    pendingObjectPath.current = objectPath;
    return {
      method: "PUT" as const,
      url: uploadURL,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold">Photo Gallery</h2>
        <ObjectUploader
          maxNumberOfFiles={1}
          maxFileSize={52428800}
          onGetUploadParameters={getUploadParameters}
          onComplete={handleUploadComplete}
        >
          <Plus className="w-4 h-4 mr-2" /> Upload Photo
        </ObjectUploader>
      </div>

      {uploadedPath && (
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Photo uploaded! Add a title and save:</p>
            <Input
              placeholder="Photo title (optional)"
              value={photoTitle}
              onChange={(e) => setPhotoTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => savePhoto.mutate({ objectPath: uploadedPath, title: photoTitle || undefined })}
                disabled={savePhoto.isPending}
              >
                {savePhoto.isPending ? "Saving..." : "Save to Gallery"}
              </Button>
              <Button variant="ghost" onClick={() => setUploadedPath(null)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Pending Submissions</h3>
          {pendingPhotos && pendingPhotos.length > 0 && (
            <Badge variant="secondary" data-testid="badge-pending-count">{pendingPhotos.length}</Badge>
          )}
        </div>
        {pendingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : pendingPhotos && pendingPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pendingPhotos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden border-amber-300 dark:border-amber-700" data-testid={`card-pending-photo-${photo.id}`}>
                <div className="aspect-square">
                  <img
                    src={photo.objectPath}
                    alt={photo.title || "Pending photo"}
                    className="w-full h-full object-cover"
                    data-testid={`img-pending-photo-${photo.id}`}
                  />
                </div>
                <div className="p-3 space-y-2 bg-amber-50 dark:bg-amber-950">
                  {photo.title && (
                    <p className="text-sm font-medium line-clamp-2" data-testid={`text-pending-title-${photo.id}`}>{photo.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground" data-testid={`text-pending-submitter-${photo.id}`}>
                    Submitted by: {photo.submitterName || "Unknown"}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => approvePhoto.mutate(photo.id)}
                      disabled={approvePhoto.isPending}
                      data-testid={`button-approve-${photo.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => rejectPhoto.mutate(photo.id)}
                      disabled={rejectPhoto.isPending}
                      data-testid={`button-reject-${photo.id}`}
                    >
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No pending photo submissions.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Approved Photos</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group relative" data-testid={`admin-photo-${photo.id}`}>
              <div className="aspect-square">
                <img
                  src={photo.objectPath}
                  alt={photo.title || "Gallery photo"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-2 right-2">
                <Button
                  variant="destructive"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    if (confirm("Delete this photo?")) deletePhoto.mutate(photo.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {photo.title && (
                <div className="p-2 bg-background/80 backdrop-blur-sm">
                  <p className="text-sm line-clamp-2">{photo.title}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No photos in the gallery yet.</p>
            <p className="text-sm mt-1">Upload photos to share with residents!</p>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}

function PublicDirectoryManager() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: entries, isLoading } = useQuery<any[]>({
    queryKey: ["/api/directory/public"],
  });

  const uploadExcel = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/public-directory/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory/public"] });
      toast({ title: "Directory Published", description: `${data.total} residents are now visible to residents.` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  const clearEntries = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/public-directory");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory/public"] });
      toast({ title: "Directory Cleared", description: "Residents can no longer see the directory." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear directory.", variant: "destructive" });
    },
  });

  const filtered = entries?.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name?.toLowerCase().includes(q) || e.lotNumber?.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <BookUser className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Resident-Viewable Directory</h2>
          <p className="text-sm text-muted-foreground">Upload an Excel file (columns: Lot #, Name, Phone) — replaces the directory residents see.</p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-7 h-7 text-green-600" />
              <div>
                <p className="font-medium text-sm">Excel Import</p>
                <p className="text-xs text-muted-foreground">Columns: Lot # · Name · Phone (optional)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                className="hidden"
                data-testid="input-public-directory-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { uploadExcel.mutate(file); e.target.value = ""; }
                }}
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadExcel.isPending}
                data-testid="button-upload-public-directory"
              >
                {uploadExcel.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Excel</>}
              </Button>
              {entries && entries.length > 0 && (
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={clearEntries.isPending}
                  onClick={() => { if (confirm("Clear the resident-viewable directory? Residents won't see anything until you re-upload.")) clearEntries.mutate(); }}
                  data-testid="button-clear-public-directory"
                >
                  {clearEntries.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Clearing...</> : <><Trash2 className="w-4 h-4" /> Clear</>}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : entries && entries.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground font-medium">{entries.length} entr{entries.length === 1 ? "y" : "ies"} published</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56"
                data-testid="input-search-public-directory"
              />
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Lot #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30" data-testid={`row-public-dir-${e.id}`}>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.lotNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {e.phone ? (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{e.phone}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <BookUser className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No directory published</p>
            <p className="text-sm mt-1">Upload an Excel file to show residents a community directory.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function DirectoryManager() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<any | null>(null);
  const [settingPinResident, setSettingPinResident] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: residents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/residents"],
  });

  const { data: updatedInfo } = useQuery<{ updatedAt: string | null }>({
    queryKey: ["/api/directory/updated"],
  });

  const uploadExcel = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/directory/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directory/updated"] });
      toast({
        title: "Directory Updated",
        description: `${data.inserted} new residents added, ${data.skipped} existing updated.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Upload Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadExcel.mutate(file);
      e.target.value = "";
    }
  };

  const createResident = useMutation({
    mutationFn: async (data: { lotNumber: string; lastName: string; firstName?: string; phoneNumber?: string }) => {
      const res = await apiRequest("POST", "/api/residents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
      setIsAddOpen(false);
    },
  });

  const updateResident = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/residents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
      setEditingResident(null);
    },
  });

  const deleteResident = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/residents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
    },
  });

  const deleteAllResidents = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/residents`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
      toast({ title: "All residents deleted", description: "The directory has been cleared." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete residents.", variant: "destructive" });
    },
  });

  const setPin = useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      const res = await apiRequest("POST", `/api/residents/${id}/pin`, { pin });
      return res.json();
    },
    onSuccess: () => {
      setSettingPinResident(null);
      toast({ title: "PIN updated", description: "The resident's PIN has been set." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredResidents = residents?.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.lotNumber?.toLowerCase().includes(term) ||
      r.lastName?.toLowerCase().includes(term) ||
      r.firstName?.toLowerCase().includes(term)
    );
  });

  const formatLastUpdated = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never";
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold">Excel Import</h3>
                <p className="text-sm text-muted-foreground">
                  Upload an Excel file (columns: Lot #, Name) to bulk update the directory.
                  Last updated: {formatLastUpdated(updatedInfo?.updatedAt)}
                </p>
              </div>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
                data-testid="input-excel-upload"
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadExcel.isPending}
                data-testid="button-upload-excel"
              >
                {uploadExcel.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Excel</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold">Resident Directory</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-search-admin-residents"
            />
          </div>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={deleteAllResidents.isPending || !residents?.length}
            onClick={() => {
              if (confirm(`Are you sure you want to delete ALL ${residents?.length || 0} residents? This cannot be undone.`)) {
                deleteAllResidents.mutate();
              }
            }}
            data-testid="button-delete-all-residents"
          >
            {deleteAllResidents.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Delete All</>
            )}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-resident">
                <Plus className="w-4 h-4" /> Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resident</DialogTitle>
              </DialogHeader>
              <ResidentForm
                onSubmit={(data) => createResident.mutate(data)}
                isLoading={createResident.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredResidents && filteredResidents.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Lot #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Last Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">First Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredResidents.map((resident) => (
                  <tr key={resident.id} className="hover:bg-muted/30" data-testid={`row-resident-${resident.id}`}>
                    <td className="px-4 py-3 text-sm font-medium">{resident.lotNumber}</td>
                    <td className="px-4 py-3 text-sm">{resident.lastName}</td>
                    <td className="px-4 py-3 text-sm">{resident.firstName || "-"}</td>
                    <td className="px-4 py-3 text-sm">{resident.phoneNumber || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Set PIN"
                        onClick={() => setSettingPinResident(resident)}
                        data-testid={`button-set-pin-${resident.id}`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingResident(resident)}
                        data-testid={`button-edit-resident-${resident.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Delete ${resident.lastName}?`)) deleteResident.mutate(resident.id);
                        }}
                        data-testid={`button-delete-resident-${resident.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-sm text-muted-foreground">
            Showing {filteredResidents.length} of {residents?.length} residents
          </div>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No residents found.</p>
            <p className="text-sm mt-1">Add residents to the directory to get started.</p>
          </div>
        </Card>
      )}

      <Dialog open={!!editingResident} onOpenChange={(open) => !open && setEditingResident(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resident</DialogTitle>
          </DialogHeader>
          {editingResident && (
            <ResidentForm
              defaultValues={editingResident}
              onSubmit={(data) => updateResident.mutate({ id: editingResident.id, data })}
              isLoading={updateResident.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!settingPinResident} onOpenChange={(open) => !open && setSettingPinResident(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Resident PIN</DialogTitle>
          </DialogHeader>
          {settingPinResident && (
            <PinForm
              residentName={`${settingPinResident.firstName || ""} ${settingPinResident.lastName || ""}`.trim() || "Resident"}
              onSubmit={(pin) => setPin.mutate({ id: settingPinResident.id, pin })}
              isLoading={setPin.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResidentForm({
  defaultValues,
  onSubmit,
  isLoading,
}: {
  defaultValues?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [lotNumber, setLotNumber] = useState(defaultValues?.lotNumber || "");
  const [lastName, setLastName] = useState(defaultValues?.lastName || "");
  const [firstName, setFirstName] = useState(defaultValues?.firstName || "");
  const [phoneNumber, setPhoneNumber] = useState(defaultValues?.phoneNumber || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      lotNumber,
      lastName,
      firstName: firstName || undefined,
      phoneNumber: phoneNumber || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Lot Number *</label>
          <Input
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder=""
            required
            data-testid="input-lot-number"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Last Name *</label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder=""
            required
            data-testid="input-last-name"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">First Name <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder=""
            data-testid="input-first-name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Phone Number <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder=""
            data-testid="input-phone-number"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : defaultValues ? "Update Resident" : "Add Resident"}
      </Button>
    </form>
  );
}

function PinForm({
  residentName,
  onSubmit,
  isLoading,
}: {
  residentName: string;
  onSubmit: (pin: string) => void;
  isLoading: boolean;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4–6 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("PINs do not match.");
      return;
    }
    onSubmit(pin);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set a 4–6 digit PIN for <strong>{residentName}</strong>. They will use this PIN along with their lot number and last name to log in.
      </p>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div>
        <label className="text-sm font-medium">New PIN</label>
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="4–6 digits"
          data-testid="input-new-pin"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Confirm PIN</label>
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          placeholder="Re-enter PIN"
          data-testid="input-confirm-pin"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : "Set PIN"}
      </Button>
    </form>
  );
}

interface PendingMessage {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  approved: boolean;
}

function MessageModeration() {
  const { toast } = useToast();
  const { data: pendingMessages, isLoading } = useQuery<PendingMessage[]>({
    queryKey: ['/api/messages/pending'],
  });

  const { data: users } = useQuery<{ id: number; firstName: string | null; lastName: string | null; lotNumber: string | null }[]>({
    queryKey: ['/api/users'],
  });

  const approveMessage = useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/messages/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/community'] });
      toast({ title: "Message approved", description: "The message is now visible on the community board." });
    },
    onError: (error: Error) => {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/pending'] });
      toast({ title: "Message rejected", description: "The message has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    },
  });

  const getSenderName = (senderId: number) => {
    const user = users?.find(u => u.id === senderId);
    if (!user) return 'Unknown';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.lotNumber || 'Unknown';
    return name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pending Community Messages</h2>
        <p className="text-muted-foreground">Review and approve messages before they appear on the community board</p>
      </div>

      {!pendingMessages?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No messages pending approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingMessages.map((message) => (
            <Card key={message.id} data-testid={`card-pending-message-${message.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{getSenderName(message.senderId)}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-foreground">{message.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => approveMessage.mutate(message.id)}
                      disabled={approveMessage.isPending}
                      data-testid={`button-approve-message-${message.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteMessage.mutate(message.id)}
                      disabled={deleteMessage.isPending}
                      data-testid={`button-reject-message-${message.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
