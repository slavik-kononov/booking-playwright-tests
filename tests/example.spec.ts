import { test, expect, Page, Locator } from '@playwright/test';

let page: Page;
const BASE_URL = 'https://www.booking.com/cars/index.html';

let pickUpLocation: Locator;
let pickUpDate: Locator;
let dropOffDate: Locator;
let pickUpTime: Locator;
let dropOffTime: Locator;
let searchButton: Locator;
let dropOffDateButton: Locator;

async function initLocators() {
    pickUpLocation = page.locator('input[name="pickup-location"]');
    pickUpDate = page.getByText(/Pick-up date/i);
    dropOffDate = page.getByText(/Drop-off date/i);
    pickUpTime = page.locator('select[name="pick-up-time"]');
    dropOffTime = page.locator('select[name="drop-off-time"]');
    dropOffDateButton = page.getByRole('button', { name: /Choose Drop-off Date/i });
    searchButton = page.getByRole('button', { name: /search/i });
}

test.describe('TC2 flow', () => {
    //TC2
    test('TC2 — Search Cars in New York with Valid Data', async ({page}) => {

        await page.goto(BASE_URL);
        const expectedLocation = 'New York';

        const pickUpLocation = page.locator('input[name="pickup-location"]');
        const pickUpTime = page.locator('select[name="pick-up-time"]');
        const dropOffTime = page.locator('select[name="drop-off-time"]');
        const searchButton = page.getByRole('button', { name: /search/i });

        await pickUpLocation.click();
        await pickUpLocation.fill(expectedLocation);

        await page.getByText('New York, New York, United States').first().click();


        await pickUpTime.selectOption('10:00');
        await dropOffTime.selectOption('10:00');


        const responsePromise = page.waitForResponse(response =>
            response.url().includes('cars.booking.com/search-results')
        );


        await searchButton.click();

        const responseText = await responsePromise;
        const statusCode = responseText.status();
        const oopsMessage = page.getByText(/Oops - something went wrong/i);
        const humanVerification = page.getByText(/Let's confirm you are human/i);
        const resultLocation = page.locator('input[name="pickup-location"]');
        const carsAvailable = page.getByText(/cars available/i);

        console.log(`Search results response code: ${statusCode}`);

        if(statusCode === 200) {
            const isOopsVisible = await oopsMessage
                .waitFor({ state: 'visible', timeout: 15000 })
                .then(() => true)
                .catch(() => false);

            if (isOopsVisible ) {
                throw new Error('❌  Search results page returned error message: "Oops - something went wrong"');
            } else {
                await expect(page).toHaveURL(/cars\.booking\.com\/search-results/);
                console.log('✅  User was redirected to car search results page');
                const actualLocation = await resultLocation.inputValue();
                expect(actualLocation).toMatch(/New York|Нью-Йорк/i);
                console.log(`✅  Location is correct. Expected: ${expectedLocation}, Actual: ${actualLocation}`);
                await expect(carsAvailable).toBeVisible();
                console.log('✅  Cars available text is displayed');
            }
        }

        if (statusCode === 405) {
            await expect(humanVerification,'Human Verification title should be visible').toBeVisible();
            await expect(page.getByRole('button', { name: /Begin/i }), 'Begin button should be visible').toBeVisible();
            console.log('⚠️ Human Verification page opened with 405 response code');
            return;
        }

        if (statusCode !== 200) {
            throw new Error(`❌ Unexpected response code after search redirect: ${statusCode}`);
        }

        console.log('✅ TC2 passed: Search for cars in New York was completed');
    });
})

test.describe.serial('Test cases W/O TC2,TC5 flow', () => {

  test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      await page.goto('https://www.booking.com/cars/index.html');
      await initLocators();
  });

  test.afterAll(async () => {
    await page.close();
  });
    //ТС1
    test('TC1 — Open Car Rental Page', async () => {
    await page.goto('https://www.booking.com/cars/index.html');

    const declineCookiesButton = page.getByRole('button', { name: /Decline/i });
    if (await declineCookiesButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await declineCookiesButton.click();
      console.log('✅ Cookies popup was closed');
    }

    await expect(pickUpLocation).toBeVisible();
    await expect(pickUpLocation).toBeEnabled();

    await expect(pickUpDate).toBeVisible();
    await expect(dropOffDate).toBeVisible();

    await expect(pickUpTime).toBeVisible();
    await expect(pickUpTime).toBeEnabled();

    await expect(dropOffTime).toBeVisible();
    await expect(dropOffTime).toBeEnabled();

    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeEnabled();

    console.log('✅  TC1 passed: Car rental page is opened and main fields are visible');
  });

    // TC3
    test('TC3 — Search Without Pick-up Location', async () => {

        await pickUpLocation.clear();

        await pickUpTime.selectOption('10:00');
        await dropOffTime.selectOption('10:00');

        await searchButton.click();

        const validationMessage = page.getByText(/Please provide a pick-up location/i);

        await expect(validationMessage, 'Validation message should be displayed near Pick-up location field')
            .toBeVisible();

        await expect(page).not.toHaveURL(/cars\.booking\.com\/search-results/);

        console.log('✅  TC3 passed: Search is not started without pick-up location and validation message is displayed');
    });

    // TC6
    test('TC6 — Same Date with Drop-off Time Earlier Than Pick-up Time', async () => {
        const expectedLocation = 'New York';
        //await expect(pickUpLocation).toHaveValue(/New York|Нью-Йорк/i);
        await pickUpLocation.click();
        await pickUpLocation.fill(expectedLocation);

        await pickUpDate.click();

        const selectedPickUpDate = page.locator('[aria-checked="true"]').first();
        await expect(selectedPickUpDate).toBeVisible();

        const pickUpDateValue = await selectedPickUpDate.getAttribute('data-date');

        if (!pickUpDateValue) {
            throw new Error('❌ Pick-up date value was not found');
        }

        const sameDateOption = page.locator(`[data-date="${pickUpDateValue}"]`).first();

        await expect(sameDateOption).toBeVisible();

        await sameDateOption.click();
        await sameDateOption.click();

        const day = String(Number(pickUpDateValue.split('-')[2]));

        await expect(
            dropOffDateButton,
            'Drop-off date should be the same as pick-up date'
        ).toContainText(day);

        await pickUpTime.selectOption('10:00');
        await dropOffTime.selectOption('10:00');

        console.log(`✅  Drop-off date-time set to same date: ${pickUpDateValue} ${await pickUpTime.inputValue()}`);

        const currentUrl = page.url();

        await searchButton.click();

        const timeValidationMessage = page.getByText(
            /There must be at least one hour between pick up and drop off/i
        );
        await expect(
            timeValidationMessage,
            'Validation message should be displayed when pick-up and drop-off date/time are the same'
        ).toBeVisible();

        await expect(page).toHaveURL(currentUrl);
        await expect(page).not.toHaveURL(/cars\.booking\.com\/search-results/);

        console.log('✅  TC6 passed: Validation message is displayed for same pick-up and drop-off date/time');
    });

    // TC7
    test('TC7 — Past Pick-up Date Validation', async () => {
        const expectedLocation = 'New York';
        await expect(pickUpLocation).toHaveValue(/New York|Нью-Йорк/i);
        await pickUpDate.click();

        const disabledPastDates = page.locator('[role="checkbox"][aria-disabled="true"]');

        await expect(
            disabledPastDates.first(),
            'Past dates should be visible and disabled'
        ).toBeVisible();

        const disabledPastDatesCount = await disabledPastDates.count();

        expect(disabledPastDatesCount).toBeGreaterThan(0);

        console.log(`✅ Past dates are disabled. Disabled dates count: ${disabledPastDatesCount}`);

        const today = new Date().toISOString().split('T')[0];
        const sameDateOption = page.locator(`[data-date="${today}"]`).first();

        await expect(sameDateOption).toBeVisible();


        console.log(`✅ Current date is selected: ${today}`);

        await expect(sameDateOption).toBeVisible();

        await sameDateOption.click();
        await sameDateOption.click();

        console.log(`✅ Pick-up and drop-off date set to same current date: ${today}`);


        await pickUpTime.selectOption('04:00');
        await dropOffTime.selectOption('20:00');

        const currentUrl = page.url();

        console.log(`✅ Pick-Up = ${await pickUpTime.inputValue()}, Drop-Off = ${await dropOffTime.inputValue()}`);

        await searchButton.click();

        const validationMessage = page.getByText(
            /Pick up time must be at least 1 hour in the future/i
        );

        await expect(
            validationMessage,
            'Validation should be displayed when pick-up time is less than 1 hour in the future'
        ).toBeVisible();

        await expect(validationMessage).toBeVisible();

        await expect(page).toHaveURL(currentUrl);
        await expect(page).not.toHaveURL(/cars\.booking\.com\/search-results/);

        console.log('✅ TC7 passed:Past dates are disabled and current-date past-time validation is displayed');
    });

    // TC4
    test('TC4 — Select New York from Autocomplete', async () => {

        await page.goto(BASE_URL);
        const expectedLocation = 'New York';
        await pickUpLocation.clear();

        const suggestionsResponsePromise = page.waitForResponse(
            response => response.url().includes('/api/location-suggestions'),
            { timeout: 10000 }
        ).catch(() => null);

        await pickUpLocation.click();
        await pickUpLocation.fill(expectedLocation);



        const suggestionsResponse = await suggestionsResponsePromise;
        if (!suggestionsResponse) {
            throw new Error('❌  Location suggestions API request to /api/location-suggestions was not sent or was not received within 10 seconds');
        }

        const suggestionsStatusCode = suggestionsResponse.status();
        if (suggestionsStatusCode === 405) {
            throw new Error(`❌  Location suggestions API returned status code: ${suggestionsStatusCode}`);
        }
        console.log(`Location suggestions response code for route /api/location-suggestions: ${suggestionsStatusCode}`);

        if (suggestionsStatusCode !== 200) {
            throw new Error(`❌  Location suggestions API returned status code: ${suggestionsStatusCode}`);
        }

        const firstOption = page.locator('button[role="option"]').first();
        await expect(firstOption).toBeVisible();
        const firstOptionText = await firstOption.textContent();

        console.log(`Autocomplete first option: ${firstOptionText}`);

        await firstOption.click();
        await expect(pickUpLocation).toHaveValue(/New York/i);
        //console.log('✅  New York selected from autocomplete');

        console.log('✅  TC4 passed: Suggestions were displayed and New York was selected from the autocomplete list');
    });




})

test.describe('TC5 flow', () => {
    //TC5
    test('TC5 — Search with Same Pick-up and Drop-off Date', async ({page}) => {

        await page.goto(BASE_URL);
        const expectedLocation = 'New York';

        const pickUpLocation = page.locator('input[name="pickup-location"]');
        const pickUpTime = page.locator('select[name="pick-up-time"]');
        const dropOffTime = page.locator('select[name="drop-off-time"]');
        const searchButton = page.getByRole('button', { name: /search/i });
        const pickUpDate = page.getByRole('button', { name: /Choose Pick-up Date/i });
        const dropOffDateButton = page.getByRole('button', { name: /Choose Drop-off Date/i });

        const suggestionsResponsePromise = page.waitForResponse(
            response => response.url().includes('/api/location-suggestions'),
            { timeout: 10000 }
        ).catch(() => null);

        await pickUpLocation.click();
        await pickUpLocation.fill(expectedLocation);


        const suggestionsResponse = await suggestionsResponsePromise;
        if (!suggestionsResponse) {
            throw new Error('❌  Location suggestions API request to /api/location-suggestions was not sent or was not received within 10 seconds');
        }

        const suggestionsStatusCode = suggestionsResponse.status();
        //console.log(`Location suggestions response code for route /api/location-suggestions: ${suggestionsStatusCode}`);

        if (suggestionsStatusCode !== 200) {
            throw new Error(`❌  Location suggestions API returned status code: ${suggestionsStatusCode}`);
        }


        const firstOption = page.locator('button[role="option"]').first();
        await expect(firstOption).toBeVisible();
        await firstOption.click();

        await expect(pickUpLocation).toHaveValue(/New York|Нью-Йорк/i);
        await pickUpDate.click();

        const selectedPickUpDate = page.locator('[aria-checked="true"]').first();
        await expect(selectedPickUpDate).toBeVisible();

        const pickUpDateValue = await selectedPickUpDate.getAttribute('data-date');

        if (!pickUpDateValue) {
            throw new Error('❌ Pick-up date value was not found');
        }
        console.log(`Pick-up date: ${pickUpDateValue}`);

        const sameDateOption = page.locator(`[data-date="${pickUpDateValue}"]`).first();

        await expect(sameDateOption).toBeVisible();

        await sameDateOption.click();
        await sameDateOption.click();

        const day = String(Number(pickUpDateValue.split('-')[2]));

        await expect(
            dropOffDateButton,
            'Drop-off date should be the same as pick-up date'
        ).toContainText(day);
        console.log(`✅  Drop-off date set to same date: ${pickUpDateValue}`);

        await pickUpTime.selectOption('09:00');
        await dropOffTime.selectOption('15:00');

        const [response] = await Promise.all([
            page.waitForResponse(
                response => response.url().includes('cars.booking.com/search-results'),
                { timeout: 20000 }
            ),
            searchButton.click()
        ]);


        //const response = await responsePromise;
        const statusCode = response.status();
        console.log(`Search results response code for same-day search: ${statusCode}`);

        if (statusCode !== 200 && statusCode !== 405) {
            throw new Error(`❌ Unexpected response code for same-day search: ${statusCode}`);
        }

        console.log('✅  TC5 passed: Search with same pick-up and drop-off date was processed W/O validation');
    });

})



