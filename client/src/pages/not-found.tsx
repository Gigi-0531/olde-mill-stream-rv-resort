import { Card, CardContent } from "@/components/ui/card";
import { TreePine, Home } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-background to-background" data-testid="page-not-found">
      <div className="animate-fade-in">
        <Card className="w-full max-w-md mx-4 text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1E3A5F] to-sky-600 flex items-center justify-center">
              <TreePine className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold" data-testid="text-404-title">404</h1>
            <p className="text-lg text-muted-foreground" data-testid="text-404-subtitle">
              Page Not Found
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-404-message">
              Looks like you've wandered off the trail. The page you're looking for doesn't exist at Olde Mill Stream.
            </p>
            <Link href="/">
              <Button data-testid="link-back-home" className="mt-2 gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
