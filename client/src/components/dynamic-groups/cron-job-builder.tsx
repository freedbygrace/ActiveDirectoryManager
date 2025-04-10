import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash, Plus, Calendar, Clock, RotateCcw } from 'lucide-react';
import { 
  ScheduleFrequency, 
  Weekday, 
  scheduleFrequencies,
  weekdays,
  InsertScheduleRule 
} from '@shared/schema';

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
}

const initialSchedule: ScheduleItem = {
  name: 'Default Schedule',
  description: 'Runs daily at midnight',
  frequency: 'daily',
  cronExpression: '0 0 * * *',
  hour: 0,
  minute: 0,
  enabled: true
};

export const CronJobBuilder: React.FC<CronJobBuilderProps> = ({ 
  schedules = [], 
  onSchedulesChange,
  ruleId 
}) => {
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
    }
    
    newSchedules[index].cronExpression = cronExpression;
    
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

  // Function to generate a human-readable description of the schedule
  const getScheduleDescription = (schedule: ScheduleItem): string => {
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
                    <Label className="block mb-2">Cron Expression</Label>
                    <div className="flex items-center p-2 rounded-md bg-muted/50">
                      <code className="text-sm font-mono">{schedule.cronExpression}</code>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="bg-muted/30 p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Schedule Summary:</p>
                      <p className="text-sm">{getScheduleDescription(schedule)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
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
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CronJobBuilder;