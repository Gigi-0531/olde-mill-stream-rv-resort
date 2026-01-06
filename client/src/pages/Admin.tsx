import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useActivities, useCreateActivity, useDeleteActivity, useNotifications } from "@/hooks/use-resources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivitySchema } from "@shared/schema";
import { Plus, Trash2, Calendar, Bell, MapPin, Clock, Image, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GalleryPhoto } from "@shared/schema";

export default function Admin() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage park activities and alerts</p>
          </div>
        </div>

        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm border">
            <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="w-4 h-4 mr-2" /> Activities
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="w-4 h-4 mr-2" /> Alerts
            </TabsTrigger>
                        <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Image className="w-4 h-4 mr-2" /> Gallery
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </div>
  );
}

function ActivitiesManager() {
  const { data: activities, isLoading } = useActivities();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertActivitySchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: new Date(), // This needs careful handling with date inputs
    },
  });

  const onSubmit = (data: any) => {
    // Basic date handling for demo - assumes browser native datetime-local input
    createActivity.mutate(data, {
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
                      const formatDateForInput = (date: Date | string | undefined) => {
                        if (!date) return '';
                        try {
                          const d = new Date(date);
                          if (isNaN(d.getTime())) return '';
                          return d.toISOString().slice(0, 16);
                        } catch {
                          return '';
                        }
                      };
                      return (
                        <FormItem>
                          <FormLabel>Date & Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              value={formatDateForInput(field.value)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  field.onChange(new Date(val));
                                }
                              }}
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
                  <span className="text-xs uppercase">{format(new Date(activity.date), 'MMM')}</span>
                  <span className="text-xl">{format(new Date(activity.date), 'd')}</span>
                </div>
                <div>
                  <h4 className="font-bold">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {format(new Date(activity.date), 'h:mm a')}
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

  const deletePhoto = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });

  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");

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

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploaded = result.successful[0];
      const objectPath = uploaded.response?.body?.objectPath || uploaded.uploadURL?.split("?")[0];
      if (objectPath) {
        setUploadedPath(objectPath);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold">Photo Gallery</h2>
        <ObjectUploader
          maxNumberOfFiles={1}
          maxFileSize={10485760}
          onGetUploadParameters={async (file) => {
            const res = await fetch("/api/uploads/request-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: file.name,
                size: file.size,
                contentType: file.type,
              }),
            });
            const { uploadURL } = await res.json();
            return {
              method: "PUT" as const,
              url: uploadURL,
              headers: { "Content-Type": file.type || "application/octet-stream" },
            };
          }}
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
  );
}
