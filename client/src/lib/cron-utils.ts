import { ScheduleFrequency, Weekday, weekdays } from '@shared/schema';
import { ScheduleItem } from '@/components/dynamic-groups/cron-job-builder';

/**
 * Parse a cron expression into its components
 * @param cronExpression - The cron expression to parse
 * @returns An object with the cron expression components
 */
export const parseCronExpression = (cronExpression: string): {
  minute: number;
  hour: number;
  dayOfMonth: number | null;
  month: number | null;
  dayOfWeek: number | null;
} => {
  const parts = cronExpression.split(' ');
  
  // Default to all parts being null/0
  const result = {
    minute: 0,
    hour: 0,
    dayOfMonth: null as number | null,
    month: null as number | null,
    dayOfWeek: null as number | null
  };
  
  // Handle minute (first part)
  if (parts.length > 0 && parts[0] !== '*') {
    result.minute = parseInt(parts[0]);
  }
  
  // Handle hour (second part)
  if (parts.length > 1 && parts[1] !== '*') {
    result.hour = parseInt(parts[1]);
  }
  
  // Handle day of month (third part)
  if (parts.length > 2 && parts[2] !== '*') {
    result.dayOfMonth = parseInt(parts[2]);
  }
  
  // Handle month (fourth part)
  if (parts.length > 3 && parts[3] !== '*') {
    result.month = parseInt(parts[3]);
  }
  
  // Handle day of week (fifth part)
  if (parts.length > 4 && parts[4] !== '*') {
    result.dayOfWeek = parseInt(parts[4]);
  }
  
  return result;
};

/**
 * Detect the frequency of a schedule from its cron expression
 * @param cronExpression - The cron expression to analyze
 * @returns The detected frequency
 */
export const detectFrequency = (cronExpression: string): ScheduleFrequency => {
  if (!cronExpression || cronExpression.trim() === '') {
    return 'daily'; // Default to daily
  }
  
  const parts = cronExpression.split(' ');
  
  // * * * * * - Every minute
  if (parts[0] === '*' && parts[1] === '*') {
    return 'minutely';
  }
  
  // MM * * * * - Every hour at minute MM
  if (parts[0] !== '*' && parts[1] === '*') {
    return 'hourly';
  }
  
  // MM HH * * d - Weekly on day d at HH:MM
  if (parts[0] !== '*' && parts[1] !== '*' && parts[2] === '*' && parts[3] === '*' && parts[4] !== '*') {
    return 'weekly';
  }
  
  // MM HH DD * * - Monthly on day DD at HH:MM
  if (parts[0] !== '*' && parts[1] !== '*' && parts[2] !== '*' && parts[3] === '*' && parts[4] === '*') {
    return 'monthly';
  }
  
  // MM HH * * * - Daily at HH:MM
  if (parts[0] !== '*' && parts[1] !== '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    return 'daily';
  }
  
  // Default to daily for any other patterns
  return 'daily';
};

/**
 * Convert a cron expression to a schedule item
 * @param cronExpression - The cron expression to convert
 * @param name - Optional name for the schedule
 * @param description - Optional description for the schedule
 * @returns A schedule item object
 */
export const cronToScheduleItem = (
  cronExpression: string,
  name = 'Schedule',
  description = '',
  enabled = true,
  id?: number,
  ruleId?: number
): ScheduleItem => {
  const frequency = detectFrequency(cronExpression);
  const { minute, hour, dayOfMonth, dayOfWeek } = parseCronExpression(cronExpression);
  
  // Generate description if not provided
  let autoDescription = description;
  if (!autoDescription) {
    autoDescription = getScheduleDescription({ 
      frequency, 
      minute, 
      hour, 
      dayOfMonth, 
      dayOfWeek: dayOfWeek !== null ? weekdays[dayOfWeek] : null,
      cronExpression,
      name,
      description: '',
      enabled
    });
  }
  
  return {
    id,
    ruleId,
    name,
    description: autoDescription,
    frequency,
    cronExpression,
    minute,
    hour,
    dayOfMonth: dayOfMonth,
    dayOfWeek: dayOfWeek !== null ? weekdays[dayOfWeek] as Weekday : null,
    enabled
  };
};

/**
 * Convert a schedule item to a cron expression
 * @param schedule - The schedule item to convert
 * @returns A cron expression string
 */
export const scheduleToCronExpression = (schedule: Partial<ScheduleItem>): string => {
  let cronExpression = '';
  
  switch (schedule.frequency) {
    case 'minutely':
      cronExpression = '* * * * *';
      break;
    case 'hourly':
      cronExpression = `${schedule.minute || 0} * * * *`;
      break;
    case 'daily':
      cronExpression = `${schedule.minute || 0} ${schedule.hour || 0} * * *`;
      break;
    case 'weekly':
      const dayNumber = schedule.dayOfWeek ? weekdays.indexOf(schedule.dayOfWeek) : 0;
      cronExpression = `${schedule.minute || 0} ${schedule.hour || 0} * * ${dayNumber}`;
      break;
    case 'monthly':
      const day = schedule.dayOfMonth || 1;
      cronExpression = `${schedule.minute || 0} ${schedule.hour || 0} ${day} * *`;
      break;
    default:
      cronExpression = '0 0 * * *'; // Default to midnight every day
  }
  
  return cronExpression;
};

/**
 * Generate a human-readable description of a schedule
 * @param schedule - The schedule to describe
 * @returns A human-readable description
 */
export const getScheduleDescription = (schedule: {
  frequency: ScheduleFrequency;
  minute: number;
  hour: number;
  dayOfMonth: number | null;
  dayOfWeek: Weekday | null;
  cronExpression: string;
  enabled: boolean;
}): string => {
  // Format time in 12-hour format
  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

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