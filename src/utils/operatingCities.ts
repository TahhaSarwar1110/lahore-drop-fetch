import { z } from "zod";

export const operatingCityNameSchema = z.string().trim().min(2, "Enter a city name (at least 2 characters).").max(100, "City names must be 100 characters or fewer.");

export function isAvailableOriginCity(name: string, cities: { name: string; is_active: boolean }[]) {
  return cities.some(city => city.is_active && city.name === name);
}