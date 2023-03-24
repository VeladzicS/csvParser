// app.js

const express = require('express');
const fs = require('fs');
const csvParser = require('csv-parser');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');
app.get('/generate-pdf', async (req, res) => {
    const csvFile = './Feb23.csv';

    const headers = [];
    const rows = [];

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            rows.push(row);
        })
        .on('end', async () => {
            const html = await ejs.renderFile('./views/table.ejs', { headers, rows, showButton: false });
            fs.writeFileSync('output.html', html);
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 160000 });

            const pdfBuffer = await page.pdf({ format: 'A4', timeout: 160000 });
            await browser.close();

            res.type('application/pdf');
            res.send(pdfBuffer);
        });
});


app.get('/table', async (req, res) => {
    const csvFile = './Feb23.csv';

    const headers = [];
    const rows = [];

    fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('headers', (csvHeaders) => {
            headers.push(...csvHeaders);
        })
        .on('data', (row) => {
            rows.push(row);
        })
        .on('end', async () => {
            res.render('table', { headers, rows, showButton: true });
        });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
