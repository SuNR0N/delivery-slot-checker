import fetch from 'node-fetch';

import { WAITROSE_USERNAME, WAITROSE_PASSWORD } from '../config';
import { WEEK_IN_MS, toDateString } from '../utils/date';

const GRAPHQL_URL = 'https://www.waitrose.com/api/graphql-prod/graph/live';
const ADDRESSES_URL = 'https://www.waitrose.com/api/address-prod/v1/addresses';

const getToken = async (username, password) => {
    const graphql = JSON.stringify({
        query: `
            mutation($session: SessionInput) {
                generateSession(session: $session) {
                    accessToken
                    customerOrderId
                    defaultBranchId
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
    const result = await fetch(GRAPHQL_URL, {
        body: graphql,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    const {
        data: { generateSession },
    } = await result.json();

    return generateSession;
};

const getAddressId = async (token) => {
    const result = await fetch(ADDRESSES_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method: 'GET',
    });
    const addresses = await result.json();
    const activeAddress = addresses.find(({ addressStatus }) => addressStatus === 'ACTIVE');

    return activeAddress && activeAddress.id;
};

const getSlots = async ({ addressId, branchId, customerOrderId, token, fromDate }) => {
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
                branchId,
                slotType: 'DELIVERY',
                customerOrderId,
                addressId,
                fromDate,
                size: 7,
            },
        },
    });
    const result = await fetch(GRAPHQL_URL, {
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
    const { accessToken, customerOrderId, defaultBranchId } = await getToken(WAITROSE_USERNAME, WAITROSE_PASSWORD);
    const addressId = await getAddressId(accessToken);
    const now = Date.now();
    const dates = Array.from({ length: 4 })
        .map((_, i) => new Date(now + i * WEEK_IN_MS))
        .map(toDateString);
    const promises = dates.map((date) =>
        getSlots({ addressId, branchId: defaultBranchId, customerOrderId, fromDate: date, token: accessToken })
    );
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
