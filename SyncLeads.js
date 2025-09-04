let config = {
    orgId: '',
    workflowId: null,
    sourceId: 'Google Sheets Leads',
    source: 'website',
    url: 'https://crm.mindall.co/api/api/lead/create/byExternalForm',
    columnsMapping: {
        name: 1,
        email: 2,
        phone: 3,
        notes: 4,
    },
    sheets: [0],
}

const STATUS_COLUMN_HEADER = 'Mindall CRM Sync Status'

function _formatRowToValidObject(row) {
    const data = {
        fullName: row[config.columnsMapping.name],
        notes: row[config.columnsMapping.notes],
        orgId: config.orgId,
        sourceId: config.sourceId,
        source: config.source,
    }

    if (config.workflowId) {
        data.workflowId = config.workflowId
    }

    if (config.columnsMapping.phone) {
        data.phone = row[config.columnsMapping.phone].toString().replaceAll(/\D/g, '')
    }

    if (config.columnsMapping.email) {
        data.email = row[config.columnsMapping.email]
    }

    if (!data.phone) {
        delete data.phone
    }

    if (!data.email) {
        delete data.email
    }

    return data
}

function _sendToCRM(data) {
    const options = {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        muteHttpExceptions: true,
        payload: JSON.stringify(data),
    }

    return UrlFetchApp.fetch(config.url, options)
}

function _findStatusColumn(sheet) {
    let i = 1

    let header = sheet.getRange(1, i).getValue()
    while (header !== STATUS_COLUMN_HEADER && header !== '') {
        i++
        header = sheet.getRange(1, i).getValue()
    }

    return i
}

function syncSheet(sheet) {
    const statusColumn = _findStatusColumn(sheet)

    sheet.getRange(1, statusColumn).setValue(STATUS_COLUMN_HEADER)
    const data = sheet.getDataRange().getValues()

    data.forEach((row, i) => {
        if (row[statusColumn - 1]) {
            return
        }

        const data = _formatRowToValidObject(row)
        const result = _sendToCRM(data)

        const statusCell = sheet.getRange(i + 1, statusColumn)
        if (result.getResponseCode() >= 200 && result.getResponseCode() < 300) {
            statusCell.setValue('Synced')
        } else {
            statusCell.setValue('Error')
            console.log(`Line ${i + 1}:`, result.getResponseCode(), result.getContentText())
        }
    })
}

function syncLeads(clientConfig = {}) {
    config = {...config, ...clientConfig}

    if (!config.orgId) {
        console.error('Organization ID is missing')
        return
    }

    const sheets = SpreadsheetApp.getActive().getSheets()

    for (let i = 0; i < sheets.length; i++) {
        if (config.sheets.includes(i)) {
            syncSheet(sheets[i])
        }
    }
}
