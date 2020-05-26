import fetch from 'node-fetch';

import { WEEK_IN_MS, toISOString } from '../utils/date';
import { ASDA_ACCOUNT_ID, POST_CODE } from '../config';

const URL = 'https://groceries.asda.com/api/v3/slot/view';

const getSlots = async (fromDate, toDate) => {
    const data = JSON.stringify({
        data: {
            service_info: {
                fulfillment_type: 'DELIVERY',
            },
            start_date: fromDate,
            end_date: toDate,
            service_address: {
                postcode: POST_CODE,
            },
            customer_info: {
                account_id: ASDA_ACCOUNT_ID,
            },
            order_info: {
                order_id: '20852623044',
            },
        },
    });

    const result = await fetch(URL, {
        body: data,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        method: 'POST',
    });
    const {
        data: { slot_days },
    } = await result.json();

    return slot_days;
};

const filterFunction = ({ status }) => status !== 'UNAVAILABLE';

export const findAllSlots = async () => {
    const now = Date.now();
    const fromDate = toISOString(new Date(now));
    const toDate = toISOString(new Date(now + 4 * WEEK_IN_MS));
    const results = await getSlots(fromDate, toDate);
    const filteredResults = results
        .reduce((acc, { slots }) => {
            slots.forEach(({ slot_info: { end_time, start_time, status } }) => {
                acc.push({ end_time, start_time, status });
            });
            return acc;
        }, [])
        .filter(filterFunction);

    return filteredResults;
};
