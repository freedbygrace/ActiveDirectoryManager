import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Droplet } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  "#000000", "#ffffff", "#f44336", "#e91e63", "#9c27b0", "#673ab7", 
  "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", 
  "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", 
  "#795548", "#607d8b", "#9e9e9e", "#f5f5f5", "#1a237e", "#004d40",
];

export function ColorPicker({ value, onChange, className = "" }: ColorPickerProps) {
  const [color, setColor] = useState(value || "#000000");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setColor(value);
  }, [value]);

  const handleChangeComplete = (newColor: string) => {
    setColor(newColor);
    onChange(newColor);
  };

  const isValidColor = (color: string) => {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    
    // Validate color format before updating
    if (isValidColor(newColor)) {
      onChange(newColor);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`w-10 h-10 p-0 border-2 ${className}`}
          style={{ backgroundColor: color }}
          aria-label="Pick a color"
        >
          <span className="sr-only">Pick a color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <div 
            className="w-full h-8 rounded cursor-pointer border"
            style={{ backgroundColor: color }}
            onClick={() => inputRef.current?.click()}
          />
          
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={color}
              onChange={handleInputChange}
              className="flex-1"
            />
            <Button 
              size="icon" 
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined' && 'EyeDropper' in window) {
                  // @ts-ignore
                  const eyeDropper = new window.EyeDropper();
                  eyeDropper.open()
                    .then((result: { sRGBHex: string }) => {
                      handleChangeComplete(result.sRGBHex);
                    })
                    .catch(() => {
                      // User canceled the eyedropper
                    });
                }
              }}
            >
              <Droplet className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-8 gap-1">
            {PRESET_COLORS.map((presetColor) => (
              <Button
                key={presetColor}
                style={{ backgroundColor: presetColor }}
                className="w-6 h-6 p-0 rounded-sm"
                onClick={() => {
                  handleChangeComplete(presetColor);
                  setIsOpen(false);
                }}
              >
                {color.toLowerCase() === presetColor.toLowerCase() && (
                  <Check className="h-3 w-3 text-white" />
                )}
                <span className="sr-only">Select color {presetColor}</span>
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}