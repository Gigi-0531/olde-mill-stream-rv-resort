import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, ExternalLink } from "lucide-react";
import parkMapImage from "@assets/resort-map.jpg";

const RESORT_ADDRESS = "1000 N Central Ave, Umatilla, FL 32784";
const GOOGLE_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(RESORT_ADDRESS)}&travelmode=driving`;

export default function MapPage() {
  const handleGetDirections = () => {
    window.open(GOOGLE_MAPS_URL, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pt-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Resort Map</h1>
          <p className="text-muted-foreground">Navigate the park grounds</p>
        </div>

        {/* Get Directions Card */}
        <Card className="p-6 bg-gradient-to-br from-[#2a4a6e] to-[#1E3A5F] text-white border-none shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Navigation className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Get Directions</h2>
                <p className="text-white/80 text-sm">{RESORT_ADDRESS}</p>
              </div>
            </div>
            <Button 
              onClick={handleGetDirections}
              className="bg-white text-[#1E3A5F] hover:bg-white/90 gap-2 font-semibold"
              data-testid="button-get-directions"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </Button>
          </div>
        </Card>

        {/* Park Map */}
        <Card className="w-full border-4 border-[#1E3A5F] relative shadow-2xl overflow-hidden">
          <img 
            src={parkMapImage} 
            alt="Olde Mill Stream RV Resort Park Map" 
            className="w-full h-auto"
          />
        </Card>
      </div>
    </div>
  );
}
