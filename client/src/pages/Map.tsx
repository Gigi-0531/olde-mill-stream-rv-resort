import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import resortImage from "@assets/facebook_1767649108158_7414057724947186807_1767655553163.jpg";

export default function MapPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Resort Map</h1>
          <p className="text-muted-foreground">Navigate the park grounds</p>
        </div>

        <Card className="aspect-video w-full border-4 border-[#2C5F6D] relative shadow-2xl overflow-hidden flex items-center justify-center">
          <img 
            src={resortImage} 
            alt="Olde Mill Stream RV Resort" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative text-center space-y-4 z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto animate-bounce">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white">Interactive Map Coming Soon</h2>
            <p className="text-white/90 max-w-md mx-auto">
              We're currently digitizing the Olde Mill Stream resort map. Check back soon to explore the grounds interactively!
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
