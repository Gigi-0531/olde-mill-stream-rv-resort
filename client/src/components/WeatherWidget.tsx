import { useWeather } from "@/hooks/use-resources";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, Wind } from "lucide-react";

export function WeatherWidget() {
  const { data: weather, isLoading } = useWeather();

  if (isLoading) return <div className="animate-pulse h-48 bg-muted rounded-xl" />;
  if (!weather) return null;

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain')) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (c.includes('cloud')) return <Cloud className="w-8 h-8 text-gray-400" />;
    return <Sun className="w-8 h-8 text-yellow-500" />;
  };

  return (
    <Card className="bg-gradient-to-br from-[#1E3A5F] to-[#0f1f35] text-white border-none shadow-xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-display text-2xl font-bold">{weather.location}</h3>
            <p className="text-blue-100 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          {getWeatherIcon(weather.condition)}
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-5xl font-bold">{weather.temp}°</span>
          <span className="text-blue-200 capitalize">{weather.condition}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          {weather.forecast.map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-xs text-blue-200 mb-1">{day.day}</p>
              <div className="flex justify-center my-1 scale-75">
                {getWeatherIcon(day.condition)}
              </div>
              <p className="font-bold text-sm">{day.temp}°</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
