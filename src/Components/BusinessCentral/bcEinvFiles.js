import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { readAmount, readDate } from './bcStatement'
import { formatValue } from './bcFormat'

// ---------------------------------------------------- Spreadsheet import ----

// One row per invoice line. Rows that share a document number make up one
// invoice, and the invoice's own details are taken from its first row.
export const IMPORT_COLUMNS = [
    ['documentNo', 'Document No'],
    ['docType', 'Type'],
    ['issueDate', 'Date'],
    ['dueDate', 'Due Date'],
    ['buyerRef', 'Customer No'],
    ['buyerName', 'Customer Name'],
    ['buyerTin', 'Customer TIN'],
    ['buyerEmail', 'Customer Email'],
    ['street', 'Street'],
    ['city', 'City'],
    ['postalZone', 'Postal Code'],
    ['state', 'State Code'],
    ['lga', 'LGA Code'],
    ['kind', 'Kind'],
    ['originalDocumentNo', 'Original Invoice No'],
    ['itemRef', 'Item No'],
    ['name', 'Description'],
    ['hsCode', 'HS Code'],
    ['productCategory', 'Product Category'],
    ['quantity', 'Quantity'],
    ['unit', 'Unit'],
    ['unitPrice', 'Unit Price'],
    ['vatPercent', 'VAT %'],
]
const TEMPLATE_EXAMPLE = [
    ['INV-0001', 'Invoice', '2026-10-12', '2026-11-11', 'C001', 'Alpha Stores Ltd', '12345678-0001', 'accounts@alpha.example', '12 Market Road', 'Port Harcourt', '500101', 'NG-RI', 'NG-RI-PHC', 'B2B', '', 'FG-75CL', 'Bottled water 75cl', '2201.10', 'Mineral waters', 2000, 'EA', 50, 7.5],
    ['INV-0001', 'Invoice', '2026-10-12', '', 'C001', '', '', '', '', '', '', '', '', '', '', 'FG-DISP', 'Dispenser bottle 19L', '3923.30', 'Bottles and flasks', 20, 'EA', 700, 7.5],
    ['CN-0001', 'Credit Note', '2026-10-13', '', 'C001', 'Alpha Stores Ltd', '12345678-0001', 'accounts@alpha.example', '12 Market Road', 'Port Harcourt', '500101', 'NG-RI', 'NG-RI-PHC', 'B2B', 'INV-0001', 'FG-75CL', 'Bottled water 75cl', '2201.10', 'Mineral waters', 100, 'EA', 50, 7.5],
]
const TEMPLATE_NOTES = [
    ['How to fill this in'],
    ['One row for each line of an invoice. Rows with the same Document No belong to one invoice.'],
    ['Customer details are read from the first row of each invoice. Later rows can leave them blank.'],
    ['Type is Invoice or Credit Note. A credit note names the invoice it corrects under Original Invoice No.'],
    ['Kind is B2B, B2G or B2C. A B2C customer needs no TIN or address.'],
    ['Unit is a standard unit code such as EA, KGM or LTR. VAT % is 7.5 or 0.'],
    ['Anything left blank that NRS needs is listed after the upload, so it can be filled in on the fix screen.'],
]

const squash = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9%]/g, '')

/**
 * Turns the rows of a sheet into invoices. `rows` is the sheet as arrays,
 * heading row first. Columns are found by their heading, in any order, and
 * headings the template does not have are ignored.
 */
export const rowsToInvoices = (rows) => {
    const headerAt = rows.findIndex((row) => row.some((cell) => squash(cell) === 'documentno'))
    if (headerAt === -1) return { invoices: [], problems: ['No "Document No" heading was found. Start from the template.'] }
    const position = Object.fromEntries(IMPORT_COLUMNS.map(([field, heading]) => [field, rows[headerAt].findIndex((cell) => squash(cell) === squash(heading))]))
    const read = (row, field) => (position[field] === -1 ? '' : row[position[field]])
    const text = (row, field) => String(read(row, field) ?? '').trim()
    const byNumber = new Map()
    const problems = []
    rows.slice(headerAt + 1).forEach((row, index) => {
        const documentNo = text(row, 'documentNo')
        if (!documentNo) return
        const docType = /credit/i.test(text(row, 'docType')) ? 'creditNote' : 'invoice'
        const key = `${docType}|${documentNo}`
        if (!byNumber.has(key)) {
            const issueDate = readDate(read(row, 'issueDate'))
            if (!issueDate) problems.push(`Row ${headerAt + index + 2}: ${documentNo} has no readable date.`)
            byNumber.set(key, {
                documentNo,
                docType,
                issueDate: issueDate || '',
                dueDate: readDate(read(row, 'dueDate')) || '',
                kind: text(row, 'kind').toUpperCase(),
                originalDocumentNo: text(row, 'originalDocumentNo'),
                buyer: { ref: text(row, 'buyerRef'), name: text(row, 'buyerName'), tin: text(row, 'buyerTin'), email: text(row, 'buyerEmail'), street: text(row, 'street'), city: text(row, 'city'), postalZone: text(row, 'postalZone'), state: text(row, 'state'), lga: text(row, 'lga') },
                lines: [],
            })
        }
        const quantity = readAmount(read(row, 'quantity'))
        if (!quantity) return
        const vat = read(row, 'vatPercent')
        byNumber.get(key).lines.push({
            itemRef: text(row, 'itemRef'),
            name: text(row, 'name'),
            hsCode: text(row, 'hsCode'),
            productCategory: text(row, 'productCategory'),
            quantity,
            unit: text(row, 'unit'),
            unitPrice: readAmount(read(row, 'unitPrice')) || 0,
            ...(vat === '' || vat === null || vat === undefined ? {} : { vatPercent: readAmount(vat) || 0 }),
        })
    })
    return { invoices: [...byNumber.values()].filter((invoice) => invoice.issueDate), problems }
}

export const readSpreadsheet = async (file) => {
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    return rowsToInvoices(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: true, defval: '' }))
}

export const downloadTemplate = () => {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS.map(([, heading]) => heading), ...TEMPLATE_EXAMPLE]), 'Invoices')
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(TEMPLATE_NOTES), 'How to fill this in')
    XLSX.writeFile(book, 'e-invoice-template.xlsx')
}

// ------------------------------------------------------- Stamped invoice ----

const money = (value) => formatValue(value, 'money')

/**
 * The printed invoice, with the NRS reference and QR code once it has been
 * cleared. Built from the mapped data that was sent, so the paper and the
 * record at NRS say the same thing. Before clearing it is marked as a draft,
 * since an invoice without a reference is not yet a tax invoice.
 */
export const printInvoice = ({ document: doc, seller, qrImage }) => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const width = pdf.internal.pageSize.getWidth()
    const left = 40
    const right = width - 40
    const sent = doc.payload || {}
    const buyer = sent.accounting_customer_party || { party_name: doc.buyerName, postal_address: {} }
    const cleared = doc.status === 'signed'
    const title = doc.docType === 'creditNote' ? 'CREDIT NOTE' : 'TAX INVOICE'

    pdf.setFont('helvetica', 'bold').setFontSize(15).text(String(seller?.name || '').trim(), left, 50, { maxWidth: 330 })
    pdf.setFont('helvetica', 'normal').setFontSize(9)
    const sellerLines = [[seller?.street, seller?.city].filter(Boolean).join(', '), seller?.tin ? `TIN: ${seller.tin}` : '', [seller?.telephone, seller?.email].filter(Boolean).join('  ')].filter(Boolean)
    sellerLines.forEach((line, index) => pdf.text(String(line), left, 84 + index * 12, { maxWidth: 330 }))

    pdf.setFont('helvetica', 'bold').setFontSize(14).text(cleared ? title : `${title} (DRAFT)`, right, 50, { align: 'right' })
    pdf.setFont('helvetica', 'normal').setFontSize(9)
    ;[`No: ${doc.documentNo}`, `Date: ${doc.issueDate}`, sent.due_date ? `Due: ${sent.due_date}` : '', sent.billing_reference?.[0]?.irn ? `Corrects: ${sent.billing_reference[0].irn}` : ''].filter(Boolean)
        .forEach((line, index) => pdf.text(line, right, 68 + index * 12, { align: 'right' }))

    pdf.setFont('helvetica', 'bold').text('Bill to', left, 140)
    pdf.setFont('helvetica', 'normal')
    const address = buyer.postal_address || {}
    ;[buyer.party_name, [address.street_name, address.city_name].filter(Boolean).join(', '), buyer.tin ? `TIN: ${buyer.tin}` : '', buyer.email].filter(Boolean)
        .forEach((line, index) => pdf.text(String(line), left, 153 + index * 12, { maxWidth: 300 }))

    const lines = doc.invoice?.lines || []
    autoTable(pdf, {
        startY: 215,
        margin: { left, right: 40 },
        head: [['Item', 'Description', 'Quantity', 'Unit', 'Price', 'Amount', 'VAT']],
        body: lines.map((line) => [line.itemRef, line.name, formatValue(line.quantity, 'number'), line.unitSource || line.unit, money(line.unitPrice), money(line.lineAmount), money(line.vatAmount)]),
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [38, 50, 56] },
        columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    })

    let y = pdf.lastAutoTable.finalY + 18
    const totals = sent.legal_monetary_total
    const subtotal = totals ? totals.tax_exclusive_amount : doc.total - doc.tax
    ;[['Subtotal', subtotal], ['VAT', doc.tax], [`Total (${doc.currency})`, totals ? totals.payable_amount : doc.total]].forEach(([label, value], index) => {
        pdf.setFont('helvetica', index === 2 ? 'bold' : 'normal').setFontSize(index === 2 ? 11 : 9)
        pdf.text(label, right - 150, y)
        pdf.text(money(value), right, y, { align: 'right' })
        y += 15
    })

    // The stamp sits at the foot, moved to a new page if the lines ran long.
    if (y > pdf.internal.pageSize.getHeight() - 170) { pdf.addPage(); y = 50 }
    y += 14
    pdf.setDrawColor(200).line(left, y, right, y)
    y += 16
    if (cleared) {
        if (qrImage) pdf.addImage(qrImage, 'PNG', left, y, 96, 96)
        const textLeft = qrImage ? left + 110 : left
        pdf.setFont('helvetica', 'bold').setFontSize(9).text('Cleared by the Nigeria Revenue Service', textLeft, y + 12)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Invoice reference (IRN): ${doc.irn}`, textLeft, y + 28, { maxWidth: right - textLeft })
        if (doc.signedAt) pdf.text(`Cleared on ${new Date(doc.signedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`, textLeft, y + 42)
        pdf.text(qrImage ? 'Scan the code with the MBS 360 app to check this invoice.' : 'The QR code could not be made. Load the keys file on the setup page.', textLeft, y + 56, { maxWidth: right - textLeft })
    } else {
        pdf.setFont('helvetica', 'normal').setFontSize(9).text('This document has not been cleared by the Nigeria Revenue Service yet and is not a tax invoice.', left, y + 12, { maxWidth: right - left })
    }
    pdf.save(`${doc.documentNo}.pdf`)
}
