export default function parseStudyTime(timeString: string): number {

    const cleanedTime = timeString.replace(/,/g, '').trim();

    const hoursMatch = cleanedTime.match(/(\d+)\s*(?:hour|hr)s?/i);

    const minutesMatch = cleanedTime.match(/(\d+)\s*(?:minute|min)s?/i);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;

    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours + (minutes / 60);
}