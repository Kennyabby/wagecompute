// The whole of a reconciliation as files to keep and review before anything
// is posted: an Excel workbook with every line, finding, step, transaction
// and Business Central entry behind it, and a PDF that reads as a report.
// Both are written whatever the outcome, so "everything agrees" is on record
// as much as a list of differences.

import { formatValue } from './bcFormat'

const loadSpreadsheets = () => import('xlsx')
const loadPdf = () => Promise.all([import('jspdf'), import('jspdf-autotable')])

export const ACTION_LABELS = {
    fixSheet: 'Correct your sheet',
    post: 'Post in Business Central',
    move: 'Move it in Business Central',
    decide: 'Decide which side is right',
    reverse: 'Reverse in Business Central',
    check: 'Check first',
    timing: 'Timing only',
    adjust: 'Adjust (last resort)',
}

export const FINDING_LABELS = {
    missingInErp: 'On your sheet, not in Business Central',
    missingInSheet: 'In Business Central, not on your sheet',
    amountDiffers: 'Same document, different figure',
    otherPeriod: 'Dated in another period',
    placeDiffers: 'Posted to another location',
    subjectDiffers: 'Posted against something else',
    opening: 'Opening balance differs',
    sheetArithmetic: 'Your sheet does not add up',
    figureDiffers: 'Figure differs',
    unexplained: 'Not explained by any transaction',
    notInBc: 'Not in Business Central',
    valueDiffers: 'Value differs',
    unlisted: 'Business Central entries not on your list',
}

const leaning = (value) => (value > 0 ? 'Your sheet is higher' : value < 0 ? 'Business Central is higher' : '')
const blankIfNull = (value) => (value === null || value === undefined ? '' : value)

/** One sentence on how the reconciliation came out. */
export const verdictOf = (result) => {
    if (result.problems) return `The file has ${result.problemCount} ${result.problemCount === 1 ? 'cell' : 'cells'} to fix. Nothing was compared.`
    const { summary } = result
    if (!summary.findings) return `Everything compared agrees with Business Central: ${summary.agree} ${summary.agree === 1 ? 'line' : 'lines'}${summary.sheetTransactions ? ` and ${summary.matched} transactions` : ''}.`
    return `${summary.differ} ${summary.differ === 1 ? 'line differs' : 'lines differ'} and ${summary.agree} agree. ${summary.findings} ${summary.findings === 1 ? 'thing needs' : 'things need'} settling${summary.lastResort ? `, ${summary.lastResort} of them only as a last resort` : ''}.`
}

const lineTextOf = (result) => {
    const lines = new Map((result.lines || []).map((line) => [line.key, line]))
    return (key) => {
        const line = lines.get(key)
        return line ? (result.lineColumns || []).map((column) => line.cells?.[column.key]).filter(Boolean).join(' ') : key
    }
}

/**
 * Every sheet of the workbook as rows of cells, so it can be checked
 * without writing a file.
 */
export const reconSheets = (result, { fileName = '', company = '', comparedAt = new Date() } = {}) => {
    const lineText = lineTextOf(result)
    const filters = result.filters || []
    const summary = result.summary || {}
    const counts = result.problems ? [] : [
        ['Lines that agree', summary.agree],
        ['Lines with a difference', summary.differ],
        ['Lines on your sheet not in Business Central', summary.notInBc],
        ['Business Central lines you left blank', summary.notOnSheet],
        ['Rows outside the report filters, set aside', summary.outsideFilters || 0],
        ['Transactions on your sheet', summary.sheetTransactions],
        ['Transactions matched', summary.matched],
        ['On your sheet only', summary.onlyOnSheet],
        ['In Business Central only', summary.onlyInBc],
        ['Things to settle', summary.findings],
        ['Of which last resort', summary.lastResort],
    ]
    const sheets = [{
        name: 'Summary',
        widths: [44, 100],
        rows: [
            ['Reconciliation', result.title],
            ['Report', result.report || ''],
            ['Period', `${result.params.from} to ${result.params.to}`],
            ['Compared with', fileName],
            ['Compared on', comparedAt.toLocaleString()],
            ...(company ? [['Company', company]] : []),
            ['Result', verdictOf(result)],
            [],
            ['Filters'],
            ...(filters.length ? filters.map((entry) => [entry.label, entry.value]) : [['None', 'Everything in the period']]),
            [],
            ...(counts.length ? [['Counts'], ...counts, []] : []),
            ...(!result.problems && summary.findings ? [['What to do'], ...Object.entries(summary.byAction || {}).map(([key, count]) => [ACTION_LABELS[key] || key, count]), []] : []),
            ...((result.notes || []).length ? [['Notes'], ...result.notes.map((note) => ['', note])] : []),
            [],
            ['How to read this', 'A difference is your figure less Business Central\'s: a plus means your sheet is higher. Review every step before posting anything. Adjustments are offered only for what nothing else explains, and are marked as the last resort.'],
        ],
    }]

    if (result.problems) {
        sheets.push({
            name: 'Problems',
            widths: [20, 8, 90],
            rows: [['Sheet', 'Row', 'Problem'], ...result.problems.map((problem) => [problem.sheet, problem.row, problem.message])],
        })
        return sheets
    }

    const figures = result.figureColumns || []
    sheets.push({
        name: 'Lines',
        rows: [
            [...result.lineColumns.map((column) => column.label), 'Status', ...figures.flatMap((figure) => [`${figure.label}: BC`, `${figure.label}: yours`, `${figure.label}: difference`]), 'Not explained', 'Findings'],
            ...result.lines.map((line) => {
                const byKey = new Map(line.figures.map((entry) => [entry.key, entry]))
                return [
                    ...result.lineColumns.map((column) => line.cells?.[column.key] || ''),
                    line.status,
                    ...figures.flatMap((figure) => {
                        const entry = byKey.get(figure.key)
                        return entry ? [entry.erp, blankIfNull(entry.sheet), blankIfNull(entry.difference)] : ['', '', '']
                    }),
                    blankIfNull(line.unexplained),
                    line.findings.join(', '),
                ]
            }),
        ],
    })

    sheets.push({
        name: 'Findings',
        widths: [6, 24, 34, 70, 12, 16, 14, 24, 26, 60, 50, 8],
        rows: [
            ['ID', 'Line', 'What was found', 'Detail', 'Date', 'Document No.', 'Difference', 'Which side is higher', 'What to do', 'In short', 'Open documents in Business Central', 'Ways'],
            ...result.findings.map((finding) => [
                finding.id,
                lineText(finding.lineKey),
                FINDING_LABELS[finding.type] || finding.type,
                finding.detail || '',
                finding.date || '',
                finding.documentNo || '',
                blankIfNull(finding.effect),
                leaning(finding.effect),
                ACTION_LABELS[finding.resolution?.action] || '',
                finding.resolution?.headline || '',
                (finding.openDocuments || []).map((doc) => `${doc.page?.name || ''} ${doc.documentNo} (${doc.quantity ?? doc.amount})`).join('; '),
                (finding.resolution?.options || []).length,
            ]),
        ],
    })

    const steps = []
    result.findings.forEach((finding) => (finding.resolution?.options || []).forEach((entry, way) => {
        const accounts = (entry.accounts || []).map((account) => `${account.role} ${account.no} ${account.name}`.trim()).join('; ')
        const list = entry.steps.length ? entry.steps : ['']
        list.forEach((step, index) => steps.push([
            finding.id,
            lineText(finding.lineKey),
            way + 1,
            entry.title,
            entry.page?.label || '',
            entry.lastResort ? 'Yes' : '',
            index + 1,
            step,
            index === 0 ? accounts : '',
            index === 0 ? entry.postingDate || '' : '',
            index === 0 ? entry.documentNo || '' : '',
        ]))
    }))
    sheets.push({
        name: 'Steps',
        widths: [6, 24, 5, 50, 30, 10, 5, 90, 40, 12, 14],
        rows: [['Finding', 'Line', 'Way', 'Way to settle it', 'Business Central page', 'Last resort', 'Step', 'What to do', 'Accounts', 'Posting date', 'Document No.'], ...steps],
    })

    sheets.push({
        name: 'Transactions',
        rows: [
            ['Status', 'Matched by', 'Date on your sheet', 'Date in BC', 'Document No.', 'Type', 'Item, partner or account', 'Location', 'Yours', 'Business Central', 'Difference', 'Your row', 'BC entry No.', 'Finding'],
            ...transactionTableRows(result),
        ],
    })

    const entries = []
    result.findings.forEach((finding) => (finding.candidates || []).forEach((row) => entries.push([
        finding.id, lineText(finding.lineKey), row.date, row.documentNo, row.type, row.effect, row.effect >= 0 ? 'In' : 'Out', (row.entryNos || []).join(', '),
    ])))
    sheets.push({
        name: 'BC entries',
        rows: [['Finding', 'Line', 'Date', 'Document No.', 'Type', 'Effect', 'In or out', 'BC entry No.'], ...entries],
    })
    return sheets
}

// The transactions table, as rows of cells.
const transactionTableRows = (result) => (result.transactions || []).map((row) => {
    const side = row.sheet || row.erp || {}
    const amountOf = (entry) => (entry ? entry.quantity ?? entry.amount ?? '' : '')
    const mine = amountOf(row.sheet)
    const theirs = amountOf(row.erp)
    return [
        row.status, row.rule || '', row.sheet?.date || '', row.erp?.date || '',
        row.erp?.documentNo || row.sheet?.documentNo || '', row.erp?.type || row.sheet?.type || '',
        side.itemNo || side.partnerNo || side.accountNo || '',
        [row.sheet?.locationCode, row.erp?.locationCode].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(' / '),
        mine, theirs,
        mine === '' && theirs === '' ? '' : Math.round(((Number(mine) || 0) - (Number(theirs) || 0)) * 10000) / 10000,
        (row.sheet?.sheetRows || []).join(', '), (row.erp?.entryNos || []).join(', '), row.findingId || '',
    ]
})

const fileStem = (result) => `${result.kind}-reconciliation-${result.params.from}-to-${result.params.to}`

export const downloadReconExcel = async (result, meta = {}) => {
    const XLSX = await loadSpreadsheets()
    const workbook = XLSX.utils.book_new()
    reconSheets(result, meta).forEach((sheet) => {
        const made = XLSX.utils.aoa_to_sheet(sheet.rows)
        made['!cols'] = (sheet.widths || (sheet.rows[0] || []).map((label) => Math.min(Math.max(String(label).length + 4, 12), 40))).map((width) => ({ wch: width }))
        XLSX.utils.book_append_sheet(workbook, made, sheet.name)
    })
    XLSX.writeFile(workbook, `${fileStem(result)}.xlsx`)
}

/** The same content as a report to read and print, ready to save. */
export const buildReconPdf = async (result, meta = {}) => {
    const [{ jsPDF }, { default: autoTable }] = await loadPdf()
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
    const margin = 36
    const width = pdf.internal.pageSize.getWidth() - margin * 2
    const pageHeight = pdf.internal.pageSize.getHeight()
    let y = margin
    const room = (needed) => { if (y + needed > pageHeight - margin) { pdf.addPage(); y = margin } }
    const text = (value, { size = 10, bold = false, gap = 4 } = {}) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal')
        pdf.setFontSize(size)
        const lines = pdf.splitTextToSize(String(value), width)
        room(lines.length * size * 1.25)
        pdf.text(lines, margin, y + size)
        y += lines.length * size * 1.25 + gap
    }
    const table = (head, body, columnStyles = {}) => {
        if (!body.length) return
        autoTable(pdf, { startY: y, head: [head], body, margin: { left: margin, right: margin }, styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [40, 90, 70] }, columnStyles })
        y = pdf.lastAutoTable.finalY + 10
    }

    text(`${result.title}${result.report ? `: ${result.report}` : ''}`, { size: 15, bold: true })
    text(`${result.params.from} to ${result.params.to}${meta.company ? `, ${meta.company}` : ''}. Compared with ${meta.fileName || 'your file'} on ${(meta.comparedAt || new Date()).toLocaleString()}.`, { size: 9 })
    text(verdictOf(result), { size: 11, bold: true, gap: 8 })
    table(['Filter', 'Value'], (result.filters || []).length ? result.filters.map((entry) => [entry.label, entry.value]) : [['None', 'Everything in the period']])

    if (result.problems) {
        table(['Sheet', 'Row', 'Problem'], result.problems.map((problem) => [problem.sheet, problem.row, problem.message]))
        return pdf
    }

    const summarySheet = reconSheets(result, meta)[0].rows
    const countsAt = summarySheet.findIndex((row) => row[0] === 'Counts')
    if (countsAt >= 0) table(['Count', ''], summarySheet.slice(countsAt + 1).filter((row) => row.length === 2 && typeof row[1] === 'number').filter((row) => !Object.values(ACTION_LABELS).includes(row[0])))
    ;(result.notes || []).forEach((note) => text(note, { size: 9 }))

    const lineText = lineTextOf(result)
    const figures = result.figureColumns || []
    const differing = result.lines.filter((line) => line.status !== 'Agrees')
    text(differing.length ? 'Lines that do not agree' : 'Every line agrees', { size: 12, bold: true })
    const shown = differing.length ? differing : result.lines
    table(
        ['Line', 'Status', ...figures.map((figure) => `${figure.label} (BC / yours / difference)`)],
        shown.map((line) => {
            const byKey = new Map(line.figures.map((entry) => [entry.key, entry]))
            return [lineText(line.key), line.status, ...figures.map((figure) => {
                const entry = byKey.get(figure.key)
                if (!entry || entry.sheet === null) return entry ? `${formatValue(entry.erp, entry.measure)} / not given` : ''
                return `${formatValue(entry.erp, entry.measure)} / ${formatValue(entry.sheet, entry.measure)} / ${formatValue(entry.difference, entry.measure)}`
            })]
        }),
    )

    if (result.findings.length) {
        pdf.addPage()
        y = margin
        text('What to do, finding by finding', { size: 13, bold: true, gap: 8 })
        result.findings.forEach((finding) => {
            room(80)
            text(`${finding.id}. ${lineText(finding.lineKey)}: ${FINDING_LABELS[finding.type] || finding.type}${finding.effect ? ` (${finding.effect > 0 ? '+' : ''}${formatValue(finding.effect, finding.measure === 'money' ? 'money' : 'qty')}, ${leaning(finding.effect).toLowerCase()})` : ''}`, { size: 10, bold: true, gap: 2 })
            text(finding.detail || '', { size: 9, gap: 2 })
            text(`${ACTION_LABELS[finding.resolution?.action] || ''}: ${finding.resolution?.headline || ''}`, { size: 9, bold: true, gap: 4 })
            const rows = []
            ;(finding.resolution?.options || []).forEach((entry, way) => {
                const accounts = (entry.accounts || []).map((account) => `${account.role} ${account.no} ${account.name}`.trim()).join('; ')
                rows.push([`${way + 1}${entry.lastResort ? ' (last resort)' : ''}`, entry.title, entry.page?.label || '', entry.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'), accounts])
            })
            table(['Way', 'Settle it by', 'Business Central page', 'Steps', 'Accounts'], rows, { 0: { cellWidth: 50 }, 1: { cellWidth: 150 }, 2: { cellWidth: 110 }, 4: { cellWidth: 120 } })
            if (finding.candidates?.length) {
                table(['Date', 'Document No.', 'Type', 'Effect', 'In or out'], finding.candidates.slice(0, 60).map((row) => [row.date, row.documentNo, row.type, formatValue(row.effect, finding.measure === 'money' ? 'money' : 'qty'), row.effect >= 0 ? 'In' : 'Out']))
                if (finding.candidates.length > 60) text(`${finding.candidates.length - 60} more entries are in the Excel download.`, { size: 8 })
            }
        })
    }
    return pdf
}

export const reconFileName = (result, extension) => `${fileStem(result)}.${extension}`

export const downloadReconPdf = async (result, meta = {}) => (await buildReconPdf(result, meta)).save(reconFileName(result, 'pdf'))
