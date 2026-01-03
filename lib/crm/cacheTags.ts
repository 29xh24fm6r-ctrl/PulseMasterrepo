export function crmContactTag(contactId: string) {
    return `crm:contact:${contactId}`;
}

export function crmFollowupsTag(contactId: string) {
    return `crm:followups:${contactId}`;
}

export function crmInteractionsTag(contactId: string) {
    return `crm:interactions:${contactId}`;
}
