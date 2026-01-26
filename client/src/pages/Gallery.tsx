import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Image, Loader2, Plus, X, Upload, CheckCircle } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GalleryPhoto } from "@shared/schema";

export default function Gallery() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: photos, isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const submitPhoto = useMutation({
    mutationFn: async (data: { objectPath: string; title?: string }) => {
      const res = await apiRequest("POST", "/api/gallery/submit", data);
      return res.json();
    },
    onSuccess: () => {
      setUploadedPath(null);
      setPhotoTitle("");
      setIsSubmitting(false);
      setSubmitted(true);
      toast({
        title: "Photo Submitted",
        description: "Your photo has been submitted for admin approval.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit photo. Please try again.",
        variant: "destructive",
      });
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

  const handleSubmit = () => {
    if (uploadedPath) {
      submitPhoto.mutate({ objectPath: uploadedPath, title: photoTitle || undefined });
    }
  };

  const cancelSubmission = () => {
    setIsSubmitting(false);
    setUploadedPath(null);
    setPhotoTitle("");
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-gallery-title">Photo Gallery</h1>
            <p className="text-muted-foreground mt-2">Photos from around Olde Mill Stream RV Resort</p>
          </div>
          {!isSubmitting && !submitted && (
            <Button onClick={() => setIsSubmitting(true)} data-testid="button-submit-photo">
              <Plus className="w-4 h-4 mr-2" /> Submit Photo
            </Button>
          )}
        </div>

        {submitted && (
          <Card className="p-6 mb-8 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">Photo Submitted!</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your photo is pending approval. Once approved by an admin, it will appear in the gallery.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSubmitted(false)}
                className="ml-auto"
                data-testid="button-dismiss-success"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {isSubmitting && (
          <Card className="p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Submit a Photo</h3>
              <Button variant="ghost" size="icon" onClick={cancelSubmission} data-testid="button-cancel-submission">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {!uploadedPath ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share a photo from the resort! Your submission will be reviewed by an admin before appearing in the gallery.
                </p>
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
                  <Upload className="w-4 h-4 mr-2" /> Choose Photo
                </ObjectUploader>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-video max-w-sm rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={uploadedPath} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Input
                  placeholder="Add a title for your photo (optional)"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  data-testid="input-photo-title"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitPhoto.isPending}
                    data-testid="button-confirm-submit"
                  >
                    {submitPhoto.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Submit for Approval
                  </Button>
                  <Button variant="outline" onClick={cancelSubmission} data-testid="button-cancel-submit">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group" data-testid={`card-photo-${photo.id}`}>
                <CardContent className="p-0">
                  <div className="aspect-square relative">
                    <img
                      src={photo.objectPath}
                      alt={photo.title || "Gallery photo"}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  {photo.title && (
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2">{photo.title}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No photos have been added yet.</p>
              <p className="text-sm mt-1">Be the first to submit a photo!</p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
