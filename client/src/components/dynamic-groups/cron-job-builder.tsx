import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash, Plus, Calendar, Clock, RotateCcw, HelpCircle, Copy, Edit, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ScheduleFrequency, 
  Weekday, 
  scheduleFrequencies,
  weekdays,
  InsertScheduleRule 
} from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface CronJobBuilderProps {
  schedules: ScheduleItem[];
  onSchedulesChange: (schedules: ScheduleItem[]) => void;
  ruleId?: number;
}

export interface ScheduleItem {
  id?: number;
  ruleId?: number;
  name: string;
  description: string;
  frequency: ScheduleFrequency;
  cronExpression: string;
  dayOfWeek?: Weekday | null;
  dayOfMonth?: number | null;
  hour: number;
  minute: number;
  enabled: boolean;
  priority?: number;
  customSchedule?: boolean;
  months?: number[];
  daysOfWeek?: Weekday[];
  daysOfMonth?: number[];
  hours?: number[];
  minutes?: number[];
  mode?: 'basic' | 'advanced';
}

const initialSchedule: ScheduleItem = {
  name: 'Default Schedule',
  description: 'Runs daily at midnight',
  frequency: 'daily',
  cronExpression: '0 0 * * *',
  hour: 0,
  minute: 0,
  enabled: true,
  priority: 0,
  customSchedule: false,
  months: [],
  daysOfWeek: [],
  daysOfMonth: [],
  hours: [],
  minutes: [],
  mode: 'basic'
};

export const CronJobBuilder: React.FC<CronJobBuilderProps> = ({ 
  schedules = [], 
  onSchedulesChange,
  ruleId 
}) => {
  const { toast } = useToast();
  const [activeSchedules, setActiveSchedules] = useState<ScheduleItem[]>(
    schedules.length > 0 ? schedules : [initialSchedule]
  );
  const [activeTab, setActiveTab] = useState<string>('0');

  useEffect(() => {
    if (schedules.length > 0 && activeSchedules.length === 0) {
      setActiveSchedules(schedules);
    }
  }, [schedules]);

  const updateSchedule = (index: number, updatedSchedule: Partial<ScheduleItem>) => {
    const newSchedules = [...activeSchedules];
    newSchedules[index] = { ...newSchedules[index], ...updatedSchedule };
    
    // Update cron expression
    const schedule = newSchedules[index];
    
    // If we're in advanced mode and it's a custom schedule, use the advanced generator
    if (schedule.mode === 'advanced' && schedule.customSchedule) {
      newSchedules[index].cronExpression = generateAdvancedCronExpression(schedule);
    } else {
      // Otherwise use the standard frequency-based generator
      let cronExpression = '';
      
      switch (schedule.frequency) {
        case 'minutely':
          cronExpression = '* * * * *';
          break;
        case 'hourly':
          cronExpression = `${schedule.minute} * * * *`;
          break;
        case 'daily':
          cronExpression = `${schedule.minute} ${schedule.hour} * * *`;
          break;
        case 'weekly':
          const dayNumber = schedule.dayOfWeek ? weekdays.indexOf(schedule.dayOfWeek) : 0;
          cronExpression = `${schedule.minute} ${schedule.hour} * * ${dayNumber}`;
          break;
        case 'monthly':
          const day = schedule.dayOfMonth || 1;
          cronExpression = `${schedule.minute} ${schedule.hour} ${day} * *`;
          break;
        case 'custom':
          // For custom schedules, if there's no existing cron expression, use a default
          cronExpression = schedule.cronExpression || '0 0 * * *';
          break;
      }
      
      newSchedules[index].cronExpression = cronExpression;
    }
    
    setActiveSchedules(newSchedules);
    onSchedulesChange(newSchedules);
  };

  const addNewSchedule = () => {
    const newSchedule: ScheduleItem = {
      ...initialSchedule,
      name: `Schedule ${activeSchedules.length + 1}`,
      ruleId
    };
    
    const newSchedules = [...activeSchedules, newSchedule];
    setActiveSchedules(newSchedules);
    setActiveTab(String(newSchedules.length - 1));
    onSchedulesChange(newSchedules);
  };

  const removeSchedule = (index: number) => {
    if (activeSchedules.length <= 1) {
      return; // Don't remove the last schedule
    }
    
    const newSchedules = activeSchedules.filter((_, i) => i !== index);
    setActiveSchedules(newSchedules);
    
    // Set active tab to the previous one or the first one
    if (Number(activeTab) >= newSchedules.length) {
      setActiveTab(String(Math.max(0, newSchedules.length - 1)));
    }
    
    onSchedulesChange(newSchedules);
  };

  const toggleScheduleStatus = (index: number) => {
    const newSchedules = [...activeSchedules];
    newSchedules[index].enabled = !newSchedules[index].enabled;
    setActiveSchedules(newSchedules);
    onSchedulesChange(newSchedules);
  };
  
  // Toggle between basic and advanced mode
  const toggleMode = (index: number) => {
    const schedule = activeSchedules[index];
    const newMode = schedule.mode === 'basic' ? 'advanced' : 'basic';
    
    // If switching to advanced mode, initialize the advanced properties
    if (newMode === 'advanced') {
      updateSchedule(index, { 
        mode: newMode,
        customSchedule: true,
        months: [],
        daysOfWeek: schedule.dayOfWeek ? [schedule.dayOfWeek] : [],
        daysOfMonth: schedule.dayOfMonth ? [schedule.dayOfMonth] : [],
        hours: [schedule.hour],
        minutes: [schedule.minute]
      });
    } else {
      // Switching back to basic mode
      updateSchedule(index, { 
        mode: newMode,
        customSchedule: false
      });
    }
  };
  
  // Copy cron expression to clipboard
  const copyCronExpression = (expression: string) => {
    navigator.clipboard.writeText(expression)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Cron expression copied successfully",
        });
      })
      .catch((err) => {
        toast({
          title: "Failed to copy",
          description: "Could not copy to clipboard: " + err,
          variant: "destructive"
        });
      });
  };
  
  // Handle updating priority of schedule
  const updatePriority = (index: number, priority: number) => {
    updateSchedule(index, { priority });
  };
  
  // Generate cron expression from advanced settings
  const generateAdvancedCronExpression = (schedule: ScheduleItem): string => {
    const minutePart = schedule.minutes && schedule.minutes.length > 0 
      ? schedule.minutes.join(',') 
      : '*';
      
    const hourPart = schedule.hours && schedule.hours.length > 0 
      ? schedule.hours.join(',') 
      : '*';
      
    const dayOfMonthPart = schedule.daysOfMonth && schedule.daysOfMonth.length > 0 
      ? schedule.daysOfMonth.join(',') 
      : '*';
      
    const monthPart = schedule.months && schedule.months.length > 0 
      ? schedule.months.join(',') 
      : '*';
      
    const dayOfWeekPart = schedule.daysOfWeek && schedule.daysOfWeek.length > 0 
      ? schedule.daysOfWeek.map(day => weekdays.indexOf(day)).join(',') 
      : '*';
      
    return `${minutePart} ${hourPart} ${dayOfMonthPart} ${monthPart} ${dayOfWeekPart}`;
  };

  // Function to generate a human-readable description of the schedule
  const getScheduleDescription = (schedule: ScheduleItem): string => {
    if (schedule.mode === 'advanced' && schedule.customSchedule) {
      const parts = [];
      
      if (schedule.minutes && schedule.minutes.length > 0) {
        parts.push(`at minute(s): ${schedule.minutes.join(', ')}`);
      }
      
      if (schedule.hours && schedule.hours.length > 0) {
        parts.push(`hour(s): ${schedule.hours.map(h => formatTime(h, 0).replace(':00', '')).join(', ')}`);
      }
      
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
        parts.push(`on ${schedule.daysOfWeek.join(', ')}`);
      }
      
      if (schedule.daysOfMonth && schedule.daysOfMonth.length > 0) {
        parts.push(`on day(s) ${schedule.daysOfMonth.join(', ')}`);
      }
      
      if (schedule.months && schedule.months.length > 0) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        parts.push(`in ${schedule.months.map(m => monthNames[m-1]).join(', ')}`);
      }
      
      return parts.length > 0 
        ? `Runs ${parts.join(', ')}` 
        : 'Custom advanced schedule';
    }
    
    switch (schedule.frequency) {
      case 'minutely':
        return 'Runs every minute';
      case 'hourly':
        return `Runs every hour at ${schedule.minute} minutes past the hour`;
      case 'daily':
        return `Runs daily at ${formatTime(schedule.hour, schedule.minute)}`;
      case 'weekly':
        return `Runs weekly on ${schedule.dayOfWeek || 'Monday'} at ${formatTime(schedule.hour, schedule.minute)}`;
      case 'monthly':
        return `Runs monthly on day ${schedule.dayOfMonth || 1} at ${formatTime(schedule.hour, schedule.minute)}`;
      case 'custom':
        return 'Custom schedule';
      default:
        return 'Custom schedule';
    }
  };

  // Helper to format time in 12-hour format
  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schedule Configuration</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addNewSchedule}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Schedule
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2">
            <TabsList>
              {activeSchedules.map((schedule, index) => (
                <TabsTrigger 
                  key={index} 
                  value={String(index)}
                  className="flex items-center gap-2"
                >
                  {schedule.name}
                  {!schedule.enabled && (
                    <Badge variant="outline" className="ml-1 text-xs">Disabled</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {activeSchedules.map((schedule, index) => (
            <TabsContent key={index} value={String(index)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`schedule-name-${index}`}>Schedule Name</Label>
                    <Input
                      id={`schedule-name-${index}`}
                      value={schedule.name}
                      onChange={(e) => updateSchedule(index, { name: e.target.value })}
                      placeholder="Schedule Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`schedule-frequency-${index}`}>Frequency</Label>
                    <Select
                      value={schedule.frequency}
                      onValueChange={(value) => updateSchedule(index, { frequency: value as ScheduleFrequency })}
                    >
                      <SelectTrigger id={`schedule-frequency-${index}`}>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleFrequencies.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(schedule.frequency === 'weekly') && (
                    <div className="space-y-2">
                      <Label htmlFor={`schedule-day-week-${index}`}>Day of Week</Label>
                      <Select
                        value={schedule.dayOfWeek || 'Monday'}
                        onValueChange={(value) => updateSchedule(index, { dayOfWeek: value as Weekday })}
                      >
                        <SelectTrigger id={`schedule-day-week-${index}`}>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {weekdays.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(schedule.frequency === 'monthly') && (
                    <div className="space-y-2">
                      <Label htmlFor={`schedule-day-month-${index}`}>Day of Month</Label>
                      <Select
                        value={String(schedule.dayOfMonth || 1)}
                        onValueChange={(value) => updateSchedule(index, { dayOfMonth: parseInt(value) })}
                      >
                        <SelectTrigger id={`schedule-day-month-${index}`}>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(schedule.frequency !== 'minutely') && (
                    <div className="grid grid-cols-2 gap-4">
                      {(schedule.frequency !== 'hourly') && (
                        <div className="space-y-2">
                          <Label htmlFor={`schedule-hour-${index}`}>Hour</Label>
                          <Select
                            value={String(schedule.hour)}
                            onValueChange={(value) => updateSchedule(index, { hour: parseInt(value) })}
                          >
                            <SelectTrigger id={`schedule-hour-${index}`}>
                              <SelectValue placeholder="Select hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                <SelectItem key={hour} value={String(hour)}>
                                  {hour.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`schedule-minute-${index}`}>Minute</Label>
                        <Select
                          value={String(schedule.minute)}
                          onValueChange={(value) => updateSchedule(index, { minute: parseInt(value) })}
                        >
                          <SelectTrigger id={`schedule-minute-${index}`}>
                            <SelectValue placeholder="Select minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                              <SelectItem key={minute} value={String(minute)}>
                                {minute.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`schedule-description-${index}`}>Description</Label>
                    <Input
                      id={`schedule-description-${index}`}
                      value={schedule.description}
                      onChange={(e) => updateSchedule(index, { description: e.target.value })}
                      placeholder="Schedule Description"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Cron Expression</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCronExpression(schedule.cronExpression)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center p-2 rounded-md bg-muted/50">
                      <code className="text-sm font-mono flex-1">{schedule.cronExpression}</code>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="bg-muted/30 p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Schedule Summary:</p>
                      <p className="text-sm">{getScheduleDescription(schedule)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`schedule-enabled-${index}`}
                          checked={schedule.enabled}
                          onCheckedChange={() => toggleScheduleStatus(index)}
                        />
                        <Label htmlFor={`schedule-enabled-${index}`}>
                          {schedule.enabled ? 'Enabled' : 'Disabled'}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleMode(index)}
                              >
                                {schedule.mode === 'basic' ? (
                                  <>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Advanced
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Basic
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {schedule.mode === 'basic' 
                                ? 'Switch to advanced mode for more options' 
                                : 'Switch back to basic mode'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {activeSchedules.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSchedule(index)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {schedule.mode === 'advanced' && (
                      <div className="pt-3">
                        <Accordion type="multiple">
                          <AccordionItem value="priority-settings">
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Priority Settings
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div>
                                  <Label>
                                    Schedule Priority: {schedule.priority ?? 0}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle className="h-4 w-4 ml-1 inline-block" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs">
                                            Higher priority schedules will execute first if multiple schedules 
                                            are triggered at the same time.
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </Label>
                                  <Slider
                                    className="mt-2"
                                    value={[schedule.priority ?? 0]}
                                    min={0}
                                    max={10}
                                    step={1}
                                    onValueChange={(value) => updatePriority(index, value[0])}
                                  />
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="advanced-minutes">
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                Minutes
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-6 gap-2">
                                  {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                    <Button
                                      key={minute}
                                      variant={schedule.minutes?.includes(minute) ? "default" : "outline"}
                                      size="sm"
                                      className="h-9 w-full text-center"
                                      onClick={() => {
                                        const currentMinutes = schedule.minutes || [];
                                        const newMinutes = currentMinutes.includes(minute)
                                          ? currentMinutes.filter(m => m !== minute)
                                          : [...currentMinutes, minute].sort((a, b) => a - b);
                                        
                                        updateSchedule(index, { 
                                          minutes: newMinutes,
                                          customSchedule: true
                                        });
                                      }}
                                    >
                                      {minute}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="advanced-hours">
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                Hours
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-6 gap-2">
                                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                    <Button
                                      key={hour}
                                      variant={schedule.hours?.includes(hour) ? "default" : "outline"}
                                      size="sm"
                                      className="h-9 w-full text-center"
                                      onClick={() => {
                                        const currentHours = schedule.hours || [];
                                        const newHours = currentHours.includes(hour)
                                          ? currentHours.filter(h => h !== hour)
                                          : [...currentHours, hour].sort((a, b) => a - b);
                                        
                                        updateSchedule(index, { 
                                          hours: newHours,
                                          customSchedule: true
                                        });
                                      }}
                                    >
                                      {hour}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="advanced-days">
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Days of Week
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {weekdays.map((day) => (
                                    <Button
                                      key={day}
                                      variant={schedule.daysOfWeek?.includes(day) ? "default" : "outline"}
                                      size="sm"
                                      className="h-9 text-center"
                                      onClick={() => {
                                        const currentDays = schedule.daysOfWeek || [];
                                        const newDays = currentDays.includes(day)
                                          ? currentDays.filter(d => d !== day)
                                          : [...currentDays, day];
                                        
                                        updateSchedule(index, { 
                                          daysOfWeek: newDays,
                                          customSchedule: true
                                        });
                                      }}
                                    >
                                      {day.charAt(0).toUpperCase() + day.slice(1)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="advanced-days-month">
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Days of Month
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-7 gap-2">
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <Button
                                      key={day}
                                      variant={schedule.daysOfMonth?.includes(day) ? "default" : "outline"}
                                      size="sm"
                                      className="h-9 w-full text-center"
                                      onClick={() => {
                                        const currentDays = schedule.daysOfMonth || [];
                                        const newDays = currentDays.includes(day)
                                          ? currentDays.filter(d => d !== day)
                                          : [...currentDays, day].sort((a, b) => a - b);
                                        
                                        updateSchedule(index, { 
                                          daysOfMonth: newDays,
                                          customSchedule: true
                                        });
                                      }}
                                    >
                                      {day}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          
                          <AccordionItem value="advanced-months">
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Months
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {[
                                    'January', 'February', 'March', 'April', 
                                    'May', 'June', 'July', 'August', 
                                    'September', 'October', 'November', 'December'
                                  ].map((month, idx) => (
                                    <Button
                                      key={month}
                                      variant={schedule.months?.includes(idx + 1) ? "default" : "outline"}
                                      size="sm"
                                      className="h-9 text-center"
                                      onClick={() => {
                                        const currentMonths = schedule.months || [];
                                        const monthValue = idx + 1;
                                        const newMonths = currentMonths.includes(monthValue)
                                          ? currentMonths.filter(m => m !== monthValue)
                                          : [...currentMonths, monthValue].sort((a, b) => a - b);
                                        
                                        updateSchedule(index, { 
                                          months: newMonths,
                                          customSchedule: true
                                        });
                                      }}
                                    >
                                      {month.substring(0, 3)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CronJobBuilder;