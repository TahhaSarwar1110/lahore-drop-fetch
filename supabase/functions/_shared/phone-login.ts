export const normalizeLoginPhone = (raw: string): string => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  return digits;
};

export const phoneLoginCandidates = (raw: string): string[] => {
  const digits = normalizeLoginPhone(raw);
  const candidates = [`+${digits}`, digits];
  if (digits.startsWith("92") && digits.length === 12) {
    candidates.push(`0${digits.slice(2)}`, digits.slice(2));
  }
  return candidates;
};