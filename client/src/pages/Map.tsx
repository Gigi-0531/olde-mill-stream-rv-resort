import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, ExternalLink, MapPin, Phone } from "lucide-react";
import parkMapImage from "@assets/resort-map.jpg";

const RESORT_ADDRESS = "1000 N Central Ave, Umatilla, FL 32784";
const GOOGLE_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(RESORT_ADDRESS)}&travelmode=driving`;

export default function MapPage() {
  const handleGetDirections = () => {
    window.open(GOOGLE_MAPS_URL, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-amber-50/30 dark:from-sky-950/20 dark:via-background dark:to-amber-950/20 p-4 md:p-8 pt-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-[#1E3A5F] mb-4 shadow-lg">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[#1E3A5F] to-sky-600 bg-clip-text text-transparent">Resort Map</h1>
          <p className="text-muted-foreground mt-2">Find your way around Olde Mill Stream RV Resort</p>
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

        {/* Park Map with decorative frame */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-[#1E3A5F] to-amber-600 rounded-xl transform rotate-1 scale-[1.02] opacity-30"></div>
          <Card className="relative w-full bg-gradient-to-br from-white to-sky-50 dark:from-slate-900 dark:to-slate-800 p-3 md:p-5 shadow-2xl rounded-xl border-0">
            <div className="border-4 border-gradient-to-r border-[#1E3A5F] rounded-lg overflow-hidden shadow-lg ring-2 ring-sky-200/50 dark:ring-sky-900/50">
              <img 
                src={parkMapImage} 
                alt="Olde Mill Stream RV Resort Park Map" 
                className="w-full h-auto"
              />
            </div>
            <div className="mt-4 py-3 px-4 bg-gradient-to-r from-sky-100/80 via-white to-amber-100/80 dark:from-sky-900/30 dark:via-slate-800 dark:to-amber-900/30 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-[#1E3A5F] dark:text-sky-300">
                <Phone className="w-4 h-4" />
                <span className="font-medium">Office: (352) 669-3141</span>
              </div>
              <span className="hidden sm:inline text-muted-foreground">|</span>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Lake Pearl, Umatilla, FL</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
