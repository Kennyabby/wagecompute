import { generatePDF, generateExcel } from '../../utils/exportUtils'
import { isNumericColumn } from './BCDataTable'

// The letterhead block the app's export helpers print at the top of a file.
export const companyInfoFrom = ({ companyRecord, company, centralCompany, settings }) => {
    const companyData = companyRecord || company || {}
    return {
        name: centralCompany?.name || companyData.name || settings?.companyName || '',
        address: centralCompany?.address || companyData.address || '',
        phone: companyData.phone || '',
        email: centralCompany?.email || companyData.email || '',
        logoUrl: centralCompany?.logoUrl || companyData.logoUrl || null,
    }
}

// The period line for an export, from whichever date parameters a report has.
export const dateRangeFrom = (params = {}) => {
    if (params.from) return { startDate: params.from, endDate: params.to }
    return params.asOf ? `As of ${params.asOf}` : null
}

/**
 * Writes a table to Excel or PDF with the app's shared export helpers, so
 * files from this module look like every other report the app produces.
 * A totals row is added at the bottom when the table has one.
 */
export const exportTable = async ({ kind, title, columns, rows, totals, dateRange, filters, companyInfo }) => {
    const exportColumns = columns.map((column) => ({ name: column.label, reference: column.key, numeric: isNumericColumn(column) }))
    const hasTotals = totals && columns.some((column) => column.total)
    // A statement's layout is carried into the file by stepping names in
    // with spaces, since a spreadsheet cell has no indent of its own here.
    const indented = columns.filter((column) => column.indent)
    const laidOut = indented.length
        ? rows.map((row) => (row._level ? { ...row, ...Object.fromEntries(indented.map((column) => [column.key, `${'   '.repeat(Math.min(row._level, 8))}${row[column.key] ?? ''}`])) } : row))
        : rows
    const data = hasTotals
        ? [...laidOut, Object.fromEntries(columns.map((column, index) => [column.key, column.total ? totals[column.key] : (index === 0 ? 'Total' : '')]))]
        : laidOut
    if (kind === 'pdf') await generatePDF(data, exportColumns, companyInfo, dateRange, title, filters)
    else generateExcel(data, exportColumns, companyInfo, dateRange, title, filters)
}
