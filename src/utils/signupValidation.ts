import { z } from "zod";

export const createContactSignupSchema = (minLength: number, maxLength: number, countryName: string) =>
  z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z.string().trim().refine(value => value === "" || (/^\d+$/.test(value) && value.length >= minLength && value.length <= maxLength),
      `Enter a valid ${minLength === maxLength ? minLength : `${minLength}-${maxLength}`} digit mobile number for ${countryName}`),
    email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }).refine(data => Boolean(data.phone || data.email), {
    message: "Enter a mobile number or email address", path: ["phone"],
  });