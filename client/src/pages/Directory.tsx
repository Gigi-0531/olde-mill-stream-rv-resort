import { useUsers } from "@/hooks/use-resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin } from "lucide-react";
import { useState } from "react";

export default function Directory() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useUsers(search);

  // Filter out admins from directory view
  const residents = users?.filter(u => u.role === 'resident') || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">Resident Directory</h1>
            <p className="text-muted-foreground">Find your neighbors at Olde Mill Stream</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or lot #..." 
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {residents.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No residents found matching your search.
              </div>
            ) : (
              residents.map((resident) => (
                <Card key={resident.id} className="hover:shadow-md transition-shadow duration-200 border-primary/10">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {resident.firstName?.[0]}{resident.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{resident.firstName} {resident.lastName}</h3>
                      <div className="flex items-center text-muted-foreground text-sm gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Lot {resident.lotNumber}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
