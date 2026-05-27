import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookUser, Search, Phone, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import type { DirectoryEntry } from "@shared/schema";

export default function Directory() {
  const [search, setSearch] = useState("");

  const { data: entries, isLoading } = useQuery<DirectoryEntry[]>({
    queryKey: ["/api/directory/public"],
  });

  const filtered = entries?.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.lotNumber?.toLowerCase().includes(q) ?? false) ||
      (e.phone?.toLowerCase().includes(q) ?? false)
    );
  }) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/20 dark:via-background dark:to-background pt-16">
      <div className="bg-gradient-to-r from-[#1E3A5F] via-[#2a4a6e] to-sky-600 py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <BookUser className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white" data-testid="text-directory-title">
              Community Directory
            </h1>
            <p className="text-sky-100 mt-2 text-lg">Neighbors at Olde Mill Stream RV Resort</p>
          </div>
          {!isLoading && entries && entries.length > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <MapPin className="w-3 h-3 mr-1" />
              {entries.length} resident{entries.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                <BookUser className="w-10 h-10 text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground" data-testid="text-empty-directory">No Directory Yet</h3>
              <p className="text-sm max-w-sm">The community directory hasn't been published yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, lot, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-directory"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-results">No results found.</p>
            ) : (
              <Card className="border-none shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#1E3A5F]/10 to-sky-600/10">
                      <tr>
                        <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Lot #</th>
                        <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                        <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((entry, idx) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-muted/30 transition-colors animate-in fade-in"
                          style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "both" }}
                          data-testid={`row-directory-${entry.id}`}
                        >
                          <td className="px-5 py-3 text-sm font-medium text-muted-foreground">
                            {entry.lotNumber || "—"}
                          </td>
                          <td className="px-5 py-3 text-sm font-semibold">{entry.name}</td>
                          <td className="px-5 py-3 text-sm text-muted-foreground">
                            {entry.phone ? (
                              <a href={`tel:${entry.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                                <Phone className="w-3 h-3" />
                                {entry.phone}
                              </a>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                  Showing {filtered.length} of {entries.length} residents
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
