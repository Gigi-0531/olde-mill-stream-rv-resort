import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Camera, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GalleryPhoto } from "@shared/schema";

export default function Gallery() {
  const { data: photos, isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/20 dark:via-background dark:to-background pt-16">
      <div className="bg-gradient-to-r from-[#1E3A5F] via-[#2a4a6e] to-sky-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1">
            <Image className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-gallery-title">Photo Gallery</h1>
          <p className="text-white/80 max-w-md">Photos from around Olde Mill Stream RV Resort</p>
          {photos && photos.length > 0 && (
            <Badge variant="secondary" className="mt-1 no-default-hover-elevate no-default-active-elevate">
              <Camera className="w-3 h-3 mr-1" />
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <Card
                key={photo.id}
                className="overflow-hidden group border-none shadow-lg transition-shadow duration-300 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 60}ms`, animationDuration: "500ms", animationFillMode: "both" }}
                data-testid={`card-photo-${photo.id}`}
              >
                <CardContent className="p-0">
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={photo.objectPath}
                      alt={photo.title || "Gallery photo"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      {photo.title && (
                        <p className="text-white text-sm font-medium line-clamp-2">{photo.title}</p>
                      )}
                    </div>
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
          <Card className="border-none shadow-lg">
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-sky-400 dark:text-sky-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No Photos Yet</h3>
                <p className="text-sm max-w-sm">No photos have been added yet. Check back soon for photos from the resort!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
