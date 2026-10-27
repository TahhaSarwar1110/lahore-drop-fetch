import { z } from "zod";

export const createContactSignupSchema = (minLength: number, maxLength: number, countryName: string) =>
  z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z.string().trim().refine(value => /^\d+$/.test(value) && value.length >= minLength && value.length <= maxLength,
      value === undefined || value === null || value === "" ?
        "Mobile number is required" :
        `Enter a valid ${minLength === maxLength ? minLength : `${minLength}-${maxLength}`} digit mobile number for ${countryName}`),
    email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });