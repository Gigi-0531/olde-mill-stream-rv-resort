import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function MapPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Resort Map</h1>
          <p className="text-muted-foreground">Navigate the park grounds</p>
        </div>

        <Card className="aspect-video w-full bg-[#E5DCC5] border-4 border-[#2C5F6D] relative shadow-2xl overflow-hidden flex items-center justify-center">
          {/* Placeholder for actual map image/interactive component */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-[#2C5F6D]/10 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <MapPin className="w-10 h-10 text-[#2C5F6D]" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#2C5F6D]">Interactive Map Coming Soon</h2>
            <p className="text-[#8B5E3C] max-w-md mx-auto">
              We're currently digitizing the Olde Mill Stream resort map. Check back soon to explore the grounds interactively!
            </p>
          </div>
          
          {/* Decorative watermark */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-transparent to-transparent" />
        </Card>
      </div>
    </div>
  );
}
