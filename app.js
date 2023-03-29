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
if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

app.get('/generate-pdf', async (req, res) => {
    const csvFile = './Feb23.csv';

    const headers = [];
    const rows = [];
    const groups = {};

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            rows.push(row);
            if (row.Group) {
                const group = row.Group;
                if (groups[group]) {
                    groups[group].push(row);
                } else {
                    groups[group] = [row];
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


app.get('/table', async (req, res) => {
    const csvFile = './Feb23.csv';

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
            rows.push(row);
            uniqueAddresses.add(row.Address);
            uniqueAddresses2.add(row['Address2']);
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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
