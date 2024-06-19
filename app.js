// app.js

const express = require('express');
const fs = require('fs');
const csvParser = require('csv-parser');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');
const outputFolderPath = './pdf';
async function generatePdfForGroup(headers, groupRows, groupName) {
    const html = await ejs.renderFile('./views/table.ejs', { headers, rows: groupRows, showButton: false });
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 160000 });

    const pdfBuffer = await page.pdf({ format: 'A4', timeout: 160000 });
    await browser.close();

    fs.writeFileSync(`${outputFolderPath}/${groupName}.pdf`, pdfBuffer);
}

async function generatePdfForBreed(headers, breedRows, breedName) {
    const html = await ejs.renderFile('./views/table.ejs', { headers, rows: breedRows, showButton: false });
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 160000 });

    const pdfBuffer = await page.pdf({ format: 'A4', timeout: 160000 });
    await browser.close();

    fs.writeFileSync(`${outputFolderPath}/${breedName}.pdf`, pdfBuffer);
}
if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

app.get('/generate-pdf', async (req, res) => {
    const csvFile = './Mar24.csv';
    const headers = [];
    const rows = [];
    const groups = {};

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            const allEmptyCells = Object.values(row).every(cell => cell.trim() === '');
            if (!allEmptyCells) {
                rows.push(row);
                if (row.Group) {
                    const group = row.Group;
                    if (groups[group]) {
                        groups[group].push(row);
                    } else {
                        groups[group] = [row];
                    }
                }
            }
        })
        .on('end', async () => {
            for (const groupName in groups) {
                await generatePdfForGroup(headers, groups[groupName], groupName);
            }
            res.send('PDFs generated.');
        });
});


app.get('/generate-breed-pdf', async (req, res) => {
    const csvFile = './Mar24.csv';
    const breedFilter = req.query.breed;
    const headers = [];
    const rows = [];
    const breeds = {};

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            const allEmptyCells = Object.values(row).every(cell => cell.trim() === '');
            if (!allEmptyCells && row.Breed) {
                if (!breedFilter || row.Breed === breedFilter) {
                    rows.push(row);
                    const breed = row.Breed;
                    if (breeds[breed]) {
                        breeds[breed].push(row);
                    } else {
                        breeds[breed] = [row];
                    }
                }
            }
        })
        .on('end', async () => {
            if (breedFilter && breeds[breedFilter]) {
                await generatePdfForBreed(headers, breeds[breedFilter], breedFilter);
                res.send(`PDF for ${breedFilter} breed generated.`);
            } else if (breedFilter && !breeds[breedFilter]) {
                res.status(400).send('No data available for this breed.');
            } else {
                for (const breedName in breeds) {
                    await generatePdfForBreed(headers, breeds[breedName], breedName);
                }
                res.send('PDFs for all breeds generated.');
            }
        });
});



app.get('/table', async (req, res) => {
    const csvFile = './Mar24.csv';
    const breedFilter = req.query.breed;
    const headers = [];
    const rows = [];
    const uniqueAddresses = new Set();
    const uniqueAddresses2 = new Set();

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            const allEmptyCells = Object.values(row).every(cell => cell.trim() === '');
            if (!allEmptyCells && (!breedFilter || row.Breed === breedFilter)) {
                rows.push(row);
                uniqueAddresses.add(row.Address);
                uniqueAddresses2.add(row['Address2']);
            }
        })
        .on('end', async () => {
            const overlappingAddresses = new Set([...uniqueAddresses].filter(x => uniqueAddresses2.has(x)));
            const nonOverlappingAddresses = new Set([...uniqueAddresses].filter(x => !overlappingAddresses.has(x)));
            const nonOverlappingAddresses2 = new Set([...uniqueAddresses2].filter(x => !overlappingAddresses.has(x)));

            res.render('table', {
                headers,
                rows,
                showButton: true,
                uniqueAddressCount: nonOverlappingAddresses.size,
                uniqueAddress2Count: nonOverlappingAddresses2.size
            });
        });
});

app.get('/first-three-breeds', async (req, res) => {
    const csvFile = './Mar24.csv';

    const headers = [];
    const rows = [];
    const uniqueBreeds = new Set();

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            // Check if the row has all empty cells
            const allEmptyCells = Object.values(row).every((cell) => cell.trim() === '');
            if (!allEmptyCells) {
                rows.push(row);
                uniqueBreeds.add(row.Breed);
            }
        })
        .on('end', async () => {
            const limitedRows = [];
            const breedCount = {};

            for (const row of rows) {
                const breed = row.Breed;
                breedCount[breed] = breedCount[breed] ? breedCount[breed] + 1 : 1;

                if (breedCount[breed] <= 3) {
                    limitedRows.push(row);
                }
            }

            res.render('table', {
                headers,
                rows: limitedRows,
                showButton: false,
            });
        });
});

app.get('/generate-pdf-first-three', async (req, res) => {
    const csvFile = './Mar24.csv';

    const headers = [];
    const rows = [];
    const groups = {};
    const uniqueBreeds = new Set();

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            const allEmptyCells = Object.values(row).every((cell) => cell.trim() === '');
            if (!allEmptyCells) {
                rows.push(row);
                if (row.Group) {
                    const group = row.Group;
                    if (groups[group]) {
                        groups[group].push(row);
                    } else {
                        groups[group] = [row];
                    }
                }
                uniqueBreeds.add(row.Breed);
            }
        })
        .on('end', async () => {
            const limitedGroups = {};

            for (const groupName in groups) {
                const groupRows = groups[groupName];
                const limitedRows = [];
                const breedCount = {};

                for (const row of groupRows) {
                    const breed = row.Breed;
                    breedCount[breed] = breedCount[breed] ? breedCount[breed] + 1 : 1;

                    if (breedCount[breed] <= 3) {
                        limitedRows.push(row);
                    }
                }

                limitedGroups[groupName] = limitedRows;
            }

            const groupPromises = [];

            for (const groupName in limitedGroups) {
                const groupRows = limitedGroups[groupName];
                const promise = generatePdfForGroup(headers, groupRows, groupName);
                groupPromises.push(promise);
            }

            await Promise.all(groupPromises);
            res.send('PDFs generated.');
        });
});



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
