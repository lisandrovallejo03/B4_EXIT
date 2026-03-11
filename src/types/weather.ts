/** Open-Meteo API response (current_weather + hourly slice) */
export interface OpenMeteoCurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

export interface OpenMeteoResponse {
  current_weather: OpenMeteoCurrentWeather;
  hourly?: {
    relative_humidity_2m: number[];
  };
}

export interface WeatherData {
  temperature: number;
  windspeed: number;
  humidity: number;
  weathercode: number;
}
