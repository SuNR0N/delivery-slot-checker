import { writeFileSync, existsSync, mkdirSync } from 'fs';

import { findAllSlots as findAllWaitroseSlots } from './api/waitrose';
import { findAllSlots as findAllAsdaSlots } from './api/asda';
import { toDelimitedDateTimeString } from './utils/date';
import { REPORTS_DIR } from './config';

(async () => {
    if (!existsSync(REPORTS_DIR)) {
        mkdirSync(REPORTS_DIR);
    }

    const timestamp = toDelimitedDateTimeString(new Date());

    const waitroseSlots = await findAllWaitroseSlots();
    writeFileSync(`${REPORTS_DIR}/waitrose_${timestamp}.json`, JSON.stringify(waitroseSlots));

    const asdaSlots = await findAllAsdaSlots();
    writeFileSync(`${REPORTS_DIR}/asda_${timestamp}.json`, JSON.stringify(asdaSlots));
})();
