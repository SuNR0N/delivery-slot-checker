export const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

export const toDateString = (date) =>
    `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

export const toISOString = (date) => `${toDateString(date)}T00:00:00Z`;

export const toDelimitedDateTimeString = (date) =>
    date
        .toISOString()
        .replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3_$4-$5-$6')
        .substr(0, 19);
