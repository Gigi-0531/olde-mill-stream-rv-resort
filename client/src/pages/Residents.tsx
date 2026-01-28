import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import { useState, useMemo } from "react";

type Resident = {
  id: number;
  firstName: string;
  lastName: string;
  lotNumber: string;
  profilePicture: string | null;
};

export default function Residents() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: residents, isLoading } = useQuery<Resident[]>({
    queryKey: ["/api/users"],
  });

  const filteredResidents = useMemo(() => {
    if (!residents) return [];
    
    const sorted = [...residents].sort((a, b) => {
      const lotA = parseInt(a.lotNumber) || 0;
      const lotB = parseInt(b.lotNumber) || 0;
      return lotA - lotB;
    });

    if (!searchTerm.trim()) return sorted;

    const term = searchTerm.toLowerCase();
    return sorted.filter(
      (r) =>
        r.lastName?.toLowerCase().includes(term) ||
        r.firstName?.toLowerCase().includes(term) ||
        r.lotNumber?.includes(term)
    );
  }, [residents, searchTerm]);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <div className="bg-[#4a7ab0] pb-8 pt-10 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-display text-white">Resident Directory</h1>
          </div>
          <p className="text-primary-foreground/80">
            All resort residents • Lots 002 - 490
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or lot number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-residents"
          />
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
              Showing {filteredResidents.length} resident{filteredResidents.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredResidents.map((resident) => (
                <Card
                  key={resident.id}
                  className="hover:shadow-md transition-shadow"
                  data-testid={`card-resident-${resident.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {resident.profilePicture ? (
                        <img
                          src={resident.profilePicture}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-bold text-sm">
                          {resident.lotNumber}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {resident.lastName}
                        {resident.firstName && `, ${resident.firstName}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lot {resident.lotNumber}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
