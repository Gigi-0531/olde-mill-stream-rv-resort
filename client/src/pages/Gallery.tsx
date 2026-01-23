import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { Image, Loader2 } from "lucide-react";
import type { GalleryPhoto } from "@shared/schema";

function GalleryImage({ photo }: { photo: GalleryPhoto }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Card className="overflow-hidden group" data-testid={`card-photo-${photo.id}`}>
      <CardContent className="p-0">
        <div className="aspect-square relative bg-muted">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Image className="w-8 h-8 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={photo.objectPath}
              alt={photo.title || "Gallery photo"}
              className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
          )}
        </div>
        {photo.title && (
          <div className="p-3">
            <p className="text-sm font-medium line-clamp-2">{photo.title}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Gallery() {
  const { data: photos, isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
  });

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-gallery-title">Photo Gallery</h1>
          <p className="text-muted-foreground mt-2">Photos from around Olde Mill Stream RV Resort</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <GalleryImage key={photo.id} photo={photo} />
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No photos have been added yet.</p>
              <p className="text-sm mt-1">Check back later for resort photos!</p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
