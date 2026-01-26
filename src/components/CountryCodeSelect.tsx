import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  minLength: number;
  maxLength: number;
  placeholder: string;
}

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  countryCodes: CountryCode[];
}

export const CountryCodeSelect = ({
  value,
  onValueChange,
  countryCodes,
}: CountryCodeSelectProps) => {
  const [open, setOpen] = useState(false);

  const selectedCountry = countryCodes.find((cc) => cc.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[140px] justify-between"
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span>{selectedCountry.flag}</span>
              <span>{selectedCountry.code}</span>
            </span>
          ) : (
            "Select..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover z-50">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countryCodes.map((cc) => (
                <CommandItem
                  key={cc.code}
                  value={`${cc.country} ${cc.code}`}
                  onSelect={() => {
                    onValueChange(cc.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cc.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <span>{cc.flag}</span>
                    <span className="text-muted-foreground text-xs">{cc.country.slice(0, 2).toUpperCase()}</span>
                    <span>{cc.code}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
