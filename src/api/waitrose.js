import fetch from 'node-fetch';

import { WAITROSE_USERNAME, WAITROSE_PASSWORD, WAITROSE_ADDRESS_ID } from '../config';
import { WEEK_IN_MS, toDateString } from '../utils/date';

const URL = 'https://www.waitrose.com/api/graphql-prod/graph/live';

const getToken = async (username, password) => {
    const graphql = JSON.stringify({
        query: `
            mutation($session: SessionInput) {
                generateSession(session: $session) {
                    accessToken
                }
            }
        `,
        variables: {
            session: {
                username,
                password,
                customerId: '-1',
                clientId: 'WEB_APP',
            },
        },
    });
    const result = await fetch(URL, {
        body: graphql,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    const {
        data: {
            generateSession: { accessToken },
        },
    } = await result.json();

    return accessToken;
};

const getSlots = async (token, fromDate) => {
    const graphql = JSON.stringify({
        query: `
            query slotDays($slotDaysInput: SlotDaysInput) {
                slotDays(slotDaysInput: $slotDaysInput) {
                    content {
                        slots {
                            slotId: id
                            startDateTime
                            endDateTime
                            shopByDateTime
                            slotStatus: status
                        }
                    }
                }
            }
        `,
        variables: {
            slotDaysInput: {
                branchId: '753',
                slotType: 'DELIVERY',
                customerOrderId: '103580862',
                addressId: WAITROSE_ADDRESS_ID,
                fromDate,
                size: 7,
            },
        },
    });
    const result = await fetch(URL, {
        body: graphql,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
    const {
        data: {
            slotDays: { content },
        },
    } = await result.json();

    return content;
};

const filterFunction = ({ status }) => status !== 'FULLY_BOOKED' && status !== 'UNAVAILABLE';

export const findAllSlots = async () => {
    const token = await getToken(WAITROSE_USERNAME, WAITROSE_PASSWORD);
    const now = Date.now();
    const dates = Array.from({ length: 4 })
        .map((_, i) => new Date(now + i * WEEK_IN_MS))
        .map(toDateString);
    const promises = dates.map((date) => getSlots(token, date));
    const results = await Promise.all(promises);
    const filteredResults = results
        .reduce((acc, curr) => {
            curr.forEach(({ slots }) => {
                slots.forEach(({ endDateTime, slotStatus, startDateTime }) => {
                    acc.push({ end_time: endDateTime, start_time: startDateTime, status: slotStatus });
                });
            });
            return acc;
        }, [])
        .filter(filterFunction);

    return filteredResults;
};
