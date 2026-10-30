export const isAccountApproved = (status) => {
    if (!status)
        return false;
    const s = status.toLowerCase();
    return s === 'verified' || s === 'approved';
};
export const normalizeVerificationStatus = (status) => {
    if (!status)
        return 'pending';
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'verified')
        return 'verified';
    if (s === 'suspended')
        return 'suspended';
    if (s === 'rejected')
        return 'rejected';
    return 'pending';
};
export const MAX_ADMIN_LIMIT = 5;
