import { useWeather } from "@/hooks/use-resources";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, ExternalLink } from "lucide-react";

const WEATHER_URL = "https://weather.com/weather/today/l/Umatilla+FL?canonicalCityId=d86c7833ef9f1c537906054147ce3ef1e2cb0ab3376b44733455de90093bbc67";

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

  // Only show up to 3 days
  const forecastDays = weather.forecast.slice(0, 3);

  return (
    <Card className="bg-gradient-to-br from-[#1E3A5F] to-[#0f1f35] text-white border-none shadow-xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-display text-2xl font-bold text-white">{weather.location}</h3>
            <p className="text-blue-100 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          {getWeatherIcon(weather.condition)}
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-5xl font-bold">{weather.temp}°</span>
          <span className="text-blue-200 capitalize">{weather.condition}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          {forecastDays.map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-xs text-blue-200 mb-1">{day.day}</p>
              <div className="flex justify-center my-1 scale-75">
                {getWeatherIcon(day.condition)}
              </div>
              <p className="font-bold text-sm">{day.temp}°</p>
            </div>
          ))}
        </div>

        <a 
          href={WEATHER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10 text-blue-200 hover:text-white transition-colors text-sm"
          data-testid="link-weather-radar"
        >
          <ExternalLink className="w-4 h-4" />
          View Full Radar & Forecast
        </a>
      </CardContent>
    </Card>
  );
}
