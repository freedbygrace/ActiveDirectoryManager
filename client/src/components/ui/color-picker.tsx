import { useState, useEffect, useRef } from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className = "" }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(value || "#000000");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentColor(value);
  }, [value]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };
  
  const presetColors = [
    "#1E40AF", // Blue
    "#047857", // Green
    "#B91C1C", // Red
    "#C2410C", // Orange
    "#7E22CE", // Purple
    "#0369A1", // Sky Blue
    "#4D7C0F", // Lime
    "#A16207", // Amber
    "#0F172A", // Slate
    "#64748B", // Gray
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-9 h-9 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
          style={{ backgroundColor: currentColor }}
          onClick={() => setIsOpen(true)}
          aria-label="Pick a color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <input
              ref={inputRef}
              type="color"
              value={currentColor}
              onChange={handleColorChange}
              className="w-full h-8 cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-8 h-8 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ backgroundColor: color }}
                onClick={() => {
                  setCurrentColor(color);
                  onChange(color);
                }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}