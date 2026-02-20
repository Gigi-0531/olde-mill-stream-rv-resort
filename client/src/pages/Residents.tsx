import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, Phone, Mail, Eye, EyeOff, ChevronDown, AlertTriangle } from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";

type Resident = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  lotNumber: string | null;
  phoneNumber: string | null;
  username: string | null;
  profilePicture: string | null;
};

type SortMode = "lot" | "alpha";

const PAGE_SIZE = 50;

export default function Residents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("lot");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    return sessionStorage.getItem("directory_disclaimer") === "accepted";
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: residents, isLoading } = useQuery<Resident[]>({
    queryKey: ["/api/directory"],
    enabled: disclaimerAccepted,
  });

  const { data: updatedInfo } = useQuery<{ updatedAt: string | null }>({
    queryKey: ["/api/directory/updated"],
    enabled: disclaimerAccepted,
  });

  const parseLotNumber = (lot: string | null): number => {
    if (!lot) return 99999;
    const match = lot.match(/\d+/);
    return match ? parseInt(match[0], 10) : 99999;
  };

  const filteredResidents = useMemo(() => {
    if (!residents) return [];

    let sorted = [...residents];

    if (sortMode === "lot") {
      sorted.sort((a, b) => parseLotNumber(a.lotNumber) - parseLotNumber(b.lotNumber));
    } else {
      sorted.sort((a, b) => {
        const nameA = (a.lastName || "").toLowerCase();
        const nameB = (b.lastName || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    if (!searchTerm.trim()) return sorted;

    const term = searchTerm.toLowerCase();
    return sorted.filter(
      (r) =>
        r.lastName?.toLowerCase().includes(term) ||
        r.firstName?.toLowerCase().includes(term) ||
        r.lotNumber?.toLowerCase().includes(term)
    );
  }, [residents, searchTerm, sortMode]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, sortMode]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredResidents.length) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredResidents.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredResidents.length]);

  const visibleResidents = filteredResidents.slice(0, visibleCount);

  const toggleContact = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const acceptDisclaimer = () => {
    sessionStorage.setItem("directory_disclaimer", "accepted");
    setDisclaimerAccepted(true);
  };

  const formatLastUpdated = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };

  if (!disclaimerAccepted) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <div className="bg-[#4a7ab0] pb-8 pt-10 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-display text-white">Resident Directory</h1>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-10">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Privacy Notice</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The resident directory is provided for the convenience of Olde Mill Stream RV Resort residents only. Contact information displayed here is shared voluntarily by residents and is intended solely for community use.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By accessing this directory, you agree not to use the information for commercial purposes, solicitation, or any form of harassment. Misuse of this directory may result in loss of access.
              </p>
              <Button
                className="w-full"
                onClick={acceptDisclaimer}
                data-testid="button-accept-disclaimer"
              >
                I Agree — View Directory
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <div className="bg-[#4a7ab0] pb-8 pt-10 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-display text-white">Resident Directory</h1>
          </div>
          <p className="text-primary-foreground/80">
            {residents ? `${residents.length} residents` : "Loading..."}
            {updatedInfo?.updatedAt && ` • Updated ${formatLastUpdated(updatedInfo.updatedAt)}`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or lot number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-residents"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortMode((m) => (m === "lot" ? "alpha" : "lot"))}
            className="whitespace-nowrap"
            data-testid="button-sort-toggle"
          >
            {sortMode === "lot" ? "Sort: Lot #" : "Sort: A-Z"}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredResidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchTerm ? "No residents found matching your search." : "No residents in directory."}
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {Math.min(visibleCount, filteredResidents.length)} of {filteredResidents.length} resident{filteredResidents.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {visibleResidents.map((resident) => {
                const isExpanded = expandedId === resident.id;
                const hasContact = resident.phoneNumber || resident.username;
                return (
                  <Card
                    key={resident.id}
                    className={`transition-shadow ${isExpanded ? "ring-2 ring-primary/30 shadow-md" : "hover:shadow-md"}`}
                    data-testid={`card-resident-${resident.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {resident.profilePicture ? (
                            <img
                              src={resident.profilePicture}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-bold text-xs">
                              {resident.lotNumber || "?"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">
                            {resident.lastName || "—"}
                            {resident.firstName && `, ${resident.firstName}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {resident.lotNumber || "No lot"}
                          </p>
                        </div>
                        {hasContact && (
                          <button
                            onClick={() => toggleContact(resident.id)}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors"
                            title={isExpanded ? "Hide contact" : "View contact"}
                            data-testid={`button-toggle-contact-${resident.id}`}
                          >
                            {isExpanded ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                      {isExpanded && hasContact && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {resident.phoneNumber && (
                            <a
                              href={`tel:${resident.phoneNumber}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                              data-testid={`link-phone-${resident.id}`}
                            >
                              <Phone className="w-4 h-4" />
                              {resident.phoneNumber}
                            </a>
                          )}
                          {resident.username && (
                            <a
                              href={`mailto:${resident.username}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                              data-testid={`link-email-${resident.id}`}
                            >
                              <Mail className="w-4 h-4" />
                              {resident.username}
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {visibleCount < filteredResidents.length && (
              <div ref={loadMoreRef} className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredResidents.length))}
                  data-testid="button-load-more"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Load More ({filteredResidents.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
